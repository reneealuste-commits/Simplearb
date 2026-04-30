'use client'

import { useState, useEffect, useCallback, useRef } from "react";

const genId = () => Math.random().toString(36).slice(2, 9);

function formatDate(d) {
  if (!d) return "–";
  return new Date(d).toLocaleDateString("et-EE", { day:"2-digit", month:"2-digit", year:"numeric" });
}
function formatTime(d) {
  if (!d) return "";
  return new Date(d).toLocaleTimeString("et-EE", { hour:"2-digit", minute:"2-digit" });
}
function isSameDay(a, b) {
  const da=new Date(a), db=new Date(b);
  return da.getFullYear()===db.getFullYear() && da.getMonth()===db.getMonth() && da.getDate()===db.getDate();
}
function startOfWeek(d) {
  const dt=new Date(d), day=dt.getDay();
  dt.setDate(dt.getDate()+(day===0?-6:1-day)); dt.setHours(0,0,0,0); return dt;
}
function endOfWeek(d) {
  const sw=startOfWeek(d), ew=new Date(sw); ew.setDate(sw.getDate()+6); ew.setHours(23,59,59,999); return ew;
}
function startOfMonth(d) { return new Date(d.getFullYear(), d.getMonth(), 1); }
function endOfMonth(d) { return new Date(d.getFullYear(), d.getMonth()+1, 0, 23,59,59,999); }

function parseEmailText(raw) {
  const r = { clientName:"", phone:"", price:"", date:"", address:"", notes:"", imageUrls:[] };
  const nameM = raw.match(/nimi[:\s]+([A-ZÄÖÜÕ][a-zäöüõ]+(?: [A-ZÄÖÜÕ][a-zäöüõ]+)*)/i)
    || raw.match(/^([A-ZÄÖÜÕ][a-zäöüõ]+(?:\s[A-ZÄÖÜÕ][a-zäöüõ]+)+)/m);
  if (nameM) r.clientName = nameM[1].trim();
  const phoneM = raw.match(/(?:tel|telefon|mob)[:\s]*([\+\d\s\-]{7,15})/i)
    || raw.match(/((?:\+372\s?)?\d[\d\s\-]{6,12}\d)/);
  if (phoneM) r.phone = phoneM[1].replace(/\s+/g," ").trim();
  const priceM = raw.match(/(?:hind|maksan|maksen|price)[:\s]*([\d\s,.]+)\s*(?:€|eur|EUR)?/i)
    || raw.match(/([\d]+(?:[.,]\d+)?)\s*(?:€|EUR)/i);
  if (priceM) r.price = priceM[1].replace(/\s/g,"").replace(",",".").trim();
  const dateM = raw.match(/(\d{1,2}[./]\d{1,2}[./]\d{2,4})(?:[^\d](\d{1,2}:\d{2}))?/);
  if (dateM) {
    const p=dateM[1].split(/[./]/);
    r.date=`${p[2].length===2?"20"+p[2]:p[2]}-${p[1].padStart(2,"0")}-${p[0].padStart(2,"0")}T${dateM[2]||"08:00"}:00`;
  }
  const addrM = raw.match(/(?:aadress|asukoht|koht)[:\s]+([^\n]+)/i)
    || raw.match(/((?:tee|tänav|tn|mnt|puiestee|küla|vald|linn)[^\n,]{3,40})/i);
  if (addrM) r.address = addrM[1].trim();
  const notesM = raw.match(/(?:märkused|info|lisainfo|kommentaar)[:\s]+([^\n]+)/i);
  if (notesM) r.notes = notesM[1].trim();
  r.imageUrls = [...new Set(raw.match(/https?:\/\/[^\s"'<>]+\.(?:jpg|jpeg|png|webp|gif)/gi)||[])];
  return r;
}

// ─── DEMO EMAIL DATA ──────────────────────────────────────────────────────────
function makeDemoEmails(userEmail) {
  const name = userEmail ? userEmail.split("@")[0] : "arborist";
  const d = (daysAgo, h=10) => { const dt=new Date(); dt.setDate(dt.getDate()-daysAgo); dt.setHours(h,Math.floor(Math.random()*59),0,0); return dt.toISOString(); };
  return [
    {
      id:genId(), from:"jaan.sepp@gmail.com", fromName:"Jaan Sepp",
      to:userEmail, subject:"Hinnapäring – kahe kase lõikamine",
      date:d(0,9), read:false, hasAttachment:false,
      preview:"Tere! Soovin küsida hinda kahe suure kasepuu lõikamiseks...",
      body:`Tere!\n\nNimi: Jaan Sepp\nTelefon: +372 5234 5678\nAadress: Männiku tee 22, Tallinn\nHind: 380 €\nKuupäev: ${new Date(Date.now()+2*86400000).toLocaleDateString("et-EE")} kell 10:00\n\nSoovin lõigata kaks suurt kasepuud – üks on kasvanud liiga lähedale majale ja teine on kuivanud.\nMärkused: Okste äravedu vajalik, ligipääs on hea.\n\nParimate soovidega,\nJaan Sepp`
    },
    {
      id:genId(), from:"mari.mets@outlook.com", fromName:"Mari Mets",
      to:userEmail, subject:"Töö – kuuse eemaldamine + känd",
      date:d(0,11), read:false, hasAttachment:true,
      preview:"Tere hommikust! Meil on aias suur kuusk mis vajab eemaldamist...",
      body:`Tere hommikust!\n\nNimi: Mari Mets\nMob: 5321 9876\nAsukoht: Pärna allee 8, Tartu\nHind kokku: 650 €\nAeg: ${new Date(Date.now()+3*86400000).toLocaleDateString("et-EE")} 09:00\n\nMeil on aias üks suur kuusk (kõrgus ~15m) mis tuleb täielikult eemaldada koos kännuga.\nKänd tuleb freesida. Juurdepääs aeda läbi värava (laius 2,5m).\n\nKommentaar: Naaber on nõus et töö tehakse hommikul, mitte õhtul.\n\nLugupidamisega,\nMari Mets\ntel: 5321 9876`
    },
    {
      id:genId(), from:"peeter.puu@hot.ee", fromName:"Peeter Puu",
      to:userEmail, subject:"Hinnakiri kolme tamme hooldustöö",
      date:d(1,14), read:false, hasAttachment:false,
      preview:"Tere! Soovin küsida hinda kolme tamme kujundamise kohta...",
      body:`Tere!\n\nNimi: Peeter Puu\nTelefon: 5567 1234\nAadress: Tammiku tee 3, Pärnu\nHind: 520 €\nKuupäev: ${new Date(Date.now()+5*86400000).toLocaleDateString("et-EE")}\n\nMeil on kolm suurt tamme mis vajavad kujundamist – liiga palju oksi kasvab maja poole.\nÜks tamm on haige, võib-olla on vaja osa oksi eemaldada.\n\nPildid saadetud manusena.\n\nTänan,\nPeeter`
    },
    {
      id:genId(), from:"info@kinnisvaraOY.ee", fromName:"Kinnisvara OY",
      to:userEmail, subject:"Korterelamu – 5 puu lõikamine + hooldustöö",
      date:d(2,10), read:true, hasAttachment:false,
      preview:"Lugupeetud, meie korterelamu vajab regulaarset puude hooldustööd...",
      body:`Lugupeetud,\n\nOleme korteriühistu Pärnu mnt 120, Tallinn.\nSoovime sõlmida lepingu regulaarseks puude hooldustööks.\n\nAadress: Pärnu mnt 120, Tallinn\nTööde maht: 5 puu lõikamine 2x aastas\nEeldatav hind: 900–1200 € kord\nEsimene töö: aprill 2025\n\nTelefon: 6123 456\n\nPalun esitage hinnapakkumine.\n\nLugupidamisega,\nKinnisvara OY juhatus`
    },
    {
      id:genId(), from:"tiina.tamm@gmail.com", fromName:"Tiina Tamm",
      to:userEmail, subject:"Re: Hinnapakkumine – aitäh!",
      date:d(3,16), read:true, hasAttachment:false,
      preview:"Tere! Sain teie hinnapakkumise kätte, hind sobib...",
      body:`Tere!\n\nSain teie hinnapakkumise kätte – hind 280€ sobib täiesti.\nSaame kokku teisipäeval 15. aprillil kell 13:00.\n\nAadress on endine: Kadaka tee 45, Tallinn.\n\nTänan!\nTiina Tamm\n+372 5445 6789`
    },
    {
      id:genId(), from:"margus.leht@tele2.ee", fromName:"Margus Leht",
      to:userEmail, subject:"Küsimus: kas teete ka kändude freesimist?",
      date:d(4,9), read:true, hasAttachment:false,
      preview:"Tere! Soovisin küsida kas teete ka kändude freesimist eraldi...",
      body:`Tere!\n\nSoovisin küsida – kas teete ka ainult kändude freesimist, ilma puude lõikamiseta?\n\nMeil on 3 kändu mis tuleks eemaldada, puud on juba maha võetud.\n\nAadress: Nõmme tee 67, Tallinn\nTelefon: 5678 9012\n\nTänan vastuse eest!\nMargus Leht`
    },
  ];
}

// ─── Demo data ────────────────────────────────────────────────────────────────
const DEMO_JOBS = [
  { id:genId(), clientName:"Mart Tamm", phone:"5551234", price:"350", paymentType:"arve", status:"plaanitud",
    date:new Date().toISOString().slice(0,10)+"T09:00:00", address:"Pärnu mnt 15, Tallinn",
    notes:"Kase lõikamine ja okste äravedu", imageUrls:[], createdAt:Date.now() },
  { id:genId(), clientName:"Liis Kask", phone:"5667788", price:"180", paymentType:"sularaha", status:"tehtud",
    date:new Date(Date.now()-86400000).toISOString().slice(0,10)+"T11:00:00",
    address:"Roosi 3, Tartu", notes:"Kuuse tippleht", imageUrls:[], createdAt:Date.now()-86400000 },
  { id:genId(), clientName:"Peeter Lepp", phone:"5123456", price:"520", paymentType:"arve", status:"plaanitud",
    date:new Date(Date.now()+86400000).toISOString().slice(0,10)+"T14:00:00",
    address:"Suur-Söömäe 22, Pärnu", notes:"Kolm tamme, vajavad hooldustöid", imageUrls:[], createdAt:Date.now() },
];

function requestNotifPermission() {
  if ("Notification" in window && Notification.permission==="default") Notification.requestPermission();
}
function sendNotification(title, body, tag) {
  if ("Notification" in window && Notification.permission==="granted")
    new Notification(title, { body, icon:"/favicon.ico", tag });
}

// ─── Google-Calendar-style Week View ─────────────────────────────────────────
const HOURS = Array.from({length:24},(_,i)=>i); // 0..23
const DAY_LABELS = ["E","T","K","N","R","L","P"];
const MONTHS_SHORT = ["jaan","veebr","märts","apr","mai","juuni","juuli","aug","sept","okt","nov","dets"];

// Distinct colors for jobs (cycling)
const JOB_COLORS = [
  "bg-blue-500 text-white",
  "bg-green-600 text-white",
  "bg-orange-500 text-white",
  "bg-purple-500 text-white",
  "bg-pink-500 text-white",
  "bg-teal-500 text-white",
];

function WeekCalendar({ jobs, onSelectDate, selectedDate, onEditJob, onMarkDone }) {
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const scrollRef = useRef(null);

  // Scroll to 7am on mount
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 7 * 56; // 56px per hour
    }
  }, []);

  const weekDays = Array.from({length:7}, (_,i) => {
    const d = new Date(weekStart); d.setDate(d.getDate()+i); return d;
  });

  const todayStr = new Date().toDateString();

  // Map jobs to their day column + pixel position
  function jobsForDay(day) {
    return jobs.filter(j => isSameDay(j.date, day));
  }

  function jobTop(job) {
    const d = new Date(job.date);
    return (d.getHours() + d.getMinutes()/60) * 56; // 56px/hr
  }

  function jobHeight(job) {
    // Default 1hr block; minimum 36px
    return Math.max(36, 56);
  }

  const prevWeek = () => { const d=new Date(weekStart); d.setDate(d.getDate()-7); setWeekStart(d); };
  const nextWeek = () => { const d=new Date(weekStart); d.setDate(d.getDate()+7); setWeekStart(d); };
  const goToday  = () => setWeekStart(startOfWeek(new Date()));

  const weekEnd = new Date(weekStart); weekEnd.setDate(weekEnd.getDate()+6);
  const headerLabel = weekStart.getMonth()===weekEnd.getMonth()
    ? `${MONTHS_SHORT[weekStart.getMonth()]} ${weekStart.getFullYear()}`
    : `${MONTHS_SHORT[weekStart.getMonth()]} – ${MONTHS_SHORT[weekEnd.getMonth()]} ${weekEnd.getFullYear()}`;

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden flex flex-col" style={{height:560}}>
      {/* Header bar */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-100 shrink-0">
        <div className="flex items-center gap-1">
          <button onClick={prevWeek} className="w-7 h-7 flex items-center justify-center rounded hover:bg-gray-100 text-gray-500 font-bold text-sm">‹</button>
          <button onClick={nextWeek} className="w-7 h-7 flex items-center justify-center rounded hover:bg-gray-100 text-gray-500 font-bold text-sm">›</button>
          <span className="text-sm font-semibold text-gray-800 ml-1 capitalize">{headerLabel}</span>
        </div>
        <button onClick={goToday} className="text-xs px-2 py-1 rounded border border-gray-200 text-gray-600 hover:bg-gray-50 font-medium">Täna</button>
      </div>

      {/* Day headers */}
      <div className="grid shrink-0 border-b border-gray-100" style={{gridTemplateColumns:"44px repeat(7,1fr)"}}>
        <div className="border-r border-gray-100"/> {/* time gutter */}
        {weekDays.map((day,i) => {
          const ds = day.toDateString();
          const isToday = ds === todayStr;
          const isSel = selectedDate && isSameDay(day, selectedDate);
          return (
            <div key={i} className="text-center py-1.5 cursor-pointer hover:bg-gray-50 transition-colors"
              onClick={() => onSelectDate(day)}>
              <div className="text-xs text-gray-400 font-medium">{DAY_LABELS[i]}</div>
              <div className={`mx-auto mt-0.5 w-7 h-7 flex items-center justify-center rounded-full text-sm font-semibold transition-colors
                ${isToday && !isSel ? "bg-black text-white" : isSel ? "bg-gray-200 text-black" : "text-gray-700"}`}>
                {day.getDate()}
              </div>
            </div>
          );
        })}
      </div>

      {/* Scrollable time grid */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto overflow-x-hidden">
        <div className="relative" style={{height: 24*56}}>
          {/* Hour lines + labels */}
          {HOURS.map(h => (
            <div key={h} className="absolute left-0 right-0 border-t border-gray-100 flex"
              style={{top: h*56, height:56}}>
              <div className="w-11 shrink-0 pr-2 -mt-2.5 text-right text-xs text-gray-400 select-none">
                {h===0?"":h<10?"0"+h+":00":h+":00"}
              </div>
              {/* 7 day columns */}
              {weekDays.map((_,ci) => (
                <div key={ci} className={`flex-1 border-l border-gray-100 ${ci===6?"border-r border-gray-100":""}`}/>
              ))}
            </div>
          ))}

          {/* Current time indicator */}
          {(() => {
            const now = new Date();
            const todayIdx = weekDays.findIndex(d => isSameDay(d, now));
            if (todayIdx < 0) return null;
            const top = (now.getHours() + now.getMinutes()/60)*56;
            const leftPct = (44 + (todayIdx * (100-44/100)/7));
            return (
              <div className="absolute z-20 flex items-center pointer-events-none"
                style={{top: top-1, left: 44, right: 0}}>
                <div className="w-2 h-2 rounded-full bg-red-500 shrink-0"
                  style={{marginLeft: `calc(${todayIdx * 100/7}% - 4px)`}}/>
                <div className="h-px bg-red-400 flex-1"
                  style={{marginLeft: `-${(7-todayIdx)*100/7}%`, width:`${100/7*(todayIdx+1)}%`}}/>
              </div>
            );
          })()}

          {/* Job blocks */}
          {weekDays.map((day, colIdx) => {
            const dayJobs = jobsForDay(day);
            return dayJobs.map((job, ji) => {
              const top = jobTop(job);
              const height = jobHeight(job);
              const colW = `calc((100% - 44px) / 7)`;
              const left = `calc(44px + ${colIdx} * (100% - 44px) / 7 + 2px)`;
              const colorClass = JOB_COLORS[ji % JOB_COLORS.length];
              const isPast = new Date(job.date) < new Date();
              return (
                <div key={job.id}
                  onClick={() => onEditJob(job)}
                  className={`absolute z-10 rounded px-1.5 py-1 cursor-pointer shadow-sm hover:shadow-md transition-shadow overflow-hidden
                    ${job.status==="tehtud" ? "opacity-50 bg-gray-400 text-white" : colorClass}`}
                  style={{top: top+1, height: height-2, left, width:`calc((100% - 44px) / 7 - 4px)`}}
                  title={`${job.clientName} – ${formatTime(job.date)} – ${job.price}€`}>
                  <div className="text-xs font-semibold leading-tight truncate">{formatTime(job.date)}</div>
                  <div className="text-xs leading-tight truncate font-medium">{job.clientName}</div>
                  {height > 48 && job.price && <div className="text-xs opacity-80">{job.price}€</div>}
                </div>
              );
            });
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Mini Calendar ────────────────────────────────────────────────────────────
function MiniCalendar({ jobs, onSelectDate, selectedDate }) {
  const [view, setView] = useState(new Date());
  const yr=view.getFullYear(), mo=view.getMonth();
  const firstDow=(new Date(yr,mo,1).getDay()+6)%7;
  const daysInMonth=new Date(yr,mo+1,0).getDate();
  const cells=[]; for(let i=0;i<firstDow;i++) cells.push(null); for(let d=1;d<=daysInMonth;d++) cells.push(new Date(yr,mo,d));
  const jobDates=new Set(jobs.map(j=>new Date(j.date).toDateString()));
  const todayStr=new Date().toDateString();
  const months=["Jaanuar","Veebruar","Märts","Aprill","Mai","Juuni","Juuli","August","September","Oktoober","November","Detsember"];
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 select-none">
      <div className="flex items-center justify-between mb-3">
        <button onClick={()=>setView(new Date(yr,mo-1,1))} className="w-7 h-7 flex items-center justify-center rounded hover:bg-gray-100 font-bold text-gray-500">‹</button>
        <span className="text-sm font-semibold">{months[mo]} {yr}</span>
        <button onClick={()=>setView(new Date(yr,mo+1,1))} className="w-7 h-7 flex items-center justify-center rounded hover:bg-gray-100 font-bold text-gray-500">›</button>
      </div>
      <div className="grid grid-cols-7 gap-0.5 mb-1">{["E","T","K","N","R","L","P"].map(d=><div key={d} className="text-center text-xs font-medium text-gray-400 py-1">{d}</div>)}</div>
      <div className="grid grid-cols-7 gap-0.5">
        {cells.map((date,i)=>{
          if(!date) return <div key={"e"+i}/>;
          const ds=date.toDateString(), isSel=selectedDate&&isSameDay(date,selectedDate);
          return (
            <button key={ds} onClick={()=>onSelectDate(date)}
              className={`relative h-8 w-full rounded text-xs font-medium transition-all
                ${isSel?"bg-black text-white":ds===todayStr?"bg-gray-100 font-bold":"text-gray-700 hover:bg-gray-50"}`}>
              {date.getDate()}
              {jobDates.has(ds)&&<span className={`absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full ${isSel?"bg-white":"bg-gray-800"}`}/>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Job Card ─────────────────────────────────────────────────────────────────
function JobCard({ job, onEdit, onMarkDone }) {
  const isPast=new Date(job.date)<new Date();
  return (
    <div className={`bg-white border rounded-lg p-4 hover:shadow-sm transition-shadow ${job.status==="tehtud"?"opacity-60":""}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-gray-900 truncate">{job.clientName||"–"}</span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${job.status==="tehtud"?"bg-gray-100 text-gray-500":isPast?"bg-red-50 text-red-600":"bg-green-50 text-green-700"}`}>
              {job.status==="tehtud"?"Tehtud":isPast?"Hilinenud":"Plaanitud"}
            </span>
            <span className={`text-xs px-2 py-0.5 rounded-full ${job.paymentType==="arve"?"bg-blue-50 text-blue-700":"bg-yellow-50 text-yellow-700"}`}>
              {job.paymentType==="arve"?"Arve":"Sularaha"}
            </span>
          </div>
          <div className="mt-1 text-sm text-gray-500 space-y-0.5">
            <div className="flex items-center gap-1.5"><span>📅</span>{formatDate(job.date)} {formatTime(job.date)}</div>
            {job.address&&<div className="flex items-center gap-1.5"><span>📍</span><a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(job.address)}`} target="_blank" rel="noopener noreferrer" className="truncate text-blue-600 hover:underline active:text-blue-800">{job.address}</a></div>}
            {job.phone&&<div className="flex items-center gap-1.5"><span>📞</span><a href={`tel:${job.phone}`} className="text-blue-600 hover:underline">{job.phone}</a></div>}
            {job.notes&&<div className="flex items-center gap-1.5"><span>📝</span><span className="truncate italic">{job.notes}</span></div>}
            {/* Raieluba row */}
            <div className="flex items-center gap-1.5 pt-0.5">
              <span>🌳</span>
              {job.raieluba
                ? <a
                    href={`https://raie.tallinn.ee/otsused/${job.raieluba}/vaata`}
                    target="_blank" rel="noopener noreferrer"
                    className="text-green-700 font-medium hover:underline text-sm">
                    Luba #{job.raieluba} ↗
                  </a>
                : <a
                    href={`https://raie.tallinn.ee/otsused${job.address?`?aadress=${encodeURIComponent(job.address)}`:`?`}`}
                    target="_blank" rel="noopener noreferrer"
                    className="text-xs text-gray-400 hover:text-gray-700 hover:underline">
                    Kontrolli raieluba ↗
                  </a>
              }
            </div>
          </div>
        </div>
        <div className="text-right shrink-0">
          <div className="text-lg font-bold">{job.price?job.price+" €":"–"}</div>
          <div className="flex gap-1 mt-2 justify-end">
            <button onClick={()=>onEdit(job)} className="text-xs px-2 py-1 rounded border border-gray-200 hover:bg-gray-50 text-gray-600">Muuda</button>
            {job.status!=="tehtud"&&<button onClick={()=>onMarkDone(job.id)} className="text-xs px-2 py-1 rounded bg-black text-white hover:bg-gray-800">Tehtud ✓</button>}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Job Modal ────────────────────────────────────────────────────────────────
function JobModal({ job, onSave, onClose }) {
  const [form, setForm] = useState(job||{clientName:"",phone:"",price:"",paymentType:"arve",status:"plaanitud",date:"",address:"",notes:"",raieluba:"",imageUrls:[]});
  const set=(k,v)=>setForm(f=>({...f,[k]:v}));
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-bold">{form.id?"Muuda tööd":"Lisa töö"}</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-2xl">×</button>
          </div>
          <div className="space-y-3">
            {[{l:"Kliendi nimi *",k:"clientName",t:"text",p:"Mart Tamm"},{l:"Telefon *",k:"phone",t:"tel",p:"+372 5551234"},
              {l:"Hind (€)",k:"price",t:"number",p:"350"},{l:"Aadress",k:"address",t:"text",p:"Kase tee 7, Tallinn"}
            ].map(({l,k,t,p})=>(
              <div key={k}>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">{l}</label>
                <input type={t} value={form[k]||""} onChange={e=>set(k,e.target.value)} placeholder={p}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black/20"/>
              </div>
            ))}
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Kuupäev ja kellaaeg</label>
              <input type="datetime-local" value={form.date?form.date.slice(0,16):""} onChange={e=>set("date",e.target.value+":00")}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black/20"/>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[{l:"Makse",k:"paymentType",opts:[["arve","Arve"],["sularaha","Sularaha"]]},{l:"Staatus",k:"status",opts:[["plaanitud","Plaanitud"],["tehtud","Tehtud"]]}].map(({l,k,opts})=>(
                <div key={k}>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">{l}</label>
                  <select value={form[k]} onChange={e=>set(k,e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black/20">
                    {opts.map(([v,lbl])=><option key={v} value={v}>{lbl}</option>)}
                  </select>
                </div>
              ))}
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Märkmed</label>
              <textarea value={form.notes||""} onChange={e=>set("notes",e.target.value)} rows={3}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black/20 resize-none"/>
            </div>
            {/* Raieluba */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">🌳 Raieloa number</label>
              <div className="flex gap-2">
                <input type="text" value={form.raieluba||""} onChange={e=>set("raieluba",e.target.value)}
                  placeholder="nt 49035"
                  className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black/20"/>
                <a href={form.address
                    ? `https://raie.tallinn.ee/otsused?aadress=${encodeURIComponent(form.address)}`
                    : "https://raie.tallinn.ee/otsused"}
                  target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1 px-3 py-2 border border-gray-200 rounded-lg text-xs font-medium text-gray-600 hover:bg-gray-50 whitespace-nowrap">
                  Otsi ↗
                </a>
              </div>
              <div className="text-xs text-gray-400 mt-1">
                Ava <a href="https://raie.tallinn.ee/otsused" target="_blank" rel="noopener noreferrer" className="underline hover:text-gray-600">raie.tallinn.ee</a> → otsi aadressi järgi → kopeeri loa number siia
              </div>
            </div>
          </div>
          <div className="flex gap-2 mt-5">
            <button onClick={onClose} className="flex-1 border border-gray-200 rounded-lg py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50">Tühista</button>
            <button onClick={()=>{if(!form.clientName)return alert("Kliendi nimi kohustuslik");onSave({...form,id:form.id||genId(),createdAt:form.createdAt||Date.now()});}}
              className="flex-1 bg-black text-white rounded-lg py-2.5 text-sm font-semibold hover:bg-gray-800">Salvesta</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Email Parser Modal ───────────────────────────────────────────────────────
function EmailParserModal({ prefill, onClose, onAddJob }) {
  const [raw, setRaw] = useState(prefill||"");
  const [editing, setEditing] = useState(prefill ? parseEmailText(prefill) && (() => { const p=parseEmailText(prefill); return {...p,id:null,paymentType:"arve",status:"plaanitud"}; })() : null);
  const setE=(k,v)=>setEditing(e=>({...e,[k]:v}));
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-lg font-bold">Lisa töö emailist</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-2xl">×</button>
        </div>
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <textarea value={raw} onChange={e=>setRaw(e.target.value)} rows={6}
            placeholder={"Nimi: Mart Tamm\nTel: 5551234\nAadress: Kase tee 7\nHind: 350€\n12.04.2025 10:00"}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-black/20 resize-none"/>
          <button onClick={()=>{const p=parseEmailText(raw);setEditing({...p,id:null,paymentType:"arve",status:"plaanitud"});}}
            className="w-full bg-black text-white rounded-lg py-2.5 text-sm font-semibold hover:bg-gray-800">🔍 Parsi email</button>
          {editing&&(
            <div className="border border-gray-200 rounded-lg p-4 space-y-3">
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Tuvastatud andmed – kontrolli</div>
              {[{l:"Kliendi nimi *",k:"clientName"},{l:"Telefon",k:"phone"},{l:"Hind (€)",k:"price"},{l:"Aadress",k:"address"}].map(({l,k})=>(
                <div key={k} className="grid grid-cols-3 gap-3 items-center">
                  <label className="text-xs font-medium text-gray-600">{l}</label>
                  <input value={editing[k]||""} onChange={e=>setE(k,e.target.value)}
                    className="col-span-2 border border-gray-200 rounded px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-black/20"/>
                </div>
              ))}
              <div className="grid grid-cols-3 gap-3 items-center">
                <label className="text-xs font-medium text-gray-600">Kuupäev/aeg</label>
                <input type="datetime-local" value={editing.date?editing.date.slice(0,16):""} onChange={e=>setE("date",e.target.value+":00")}
                  className="col-span-2 border border-gray-200 rounded px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-black/20"/>
              </div>
              <div className="grid grid-cols-3 gap-3 items-center">
                <label className="text-xs font-medium text-gray-600">Makse</label>
                <select value={editing.paymentType||"arve"} onChange={e=>setE("paymentType",e.target.value)}
                  className="col-span-2 border border-gray-200 rounded px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-black/20">
                  <option value="arve">Arve</option><option value="sularaha">Sularaha</option>
                </select>
              </div>
              <button onClick={()=>{if(!editing.clientName)return alert("Nimi kohustuslik");onAddJob({...editing,id:genId(),createdAt:Date.now()});onClose();}}
                className="w-full bg-black text-white rounded-lg py-2.5 text-sm font-semibold hover:bg-gray-800">➕ Lisa tööde nimekirja</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Revenue Summary ──────────────────────────────────────────────────────────
function RevenueSummary({ jobs, period }) {
  const now=new Date();
  const [s,e]=period==="week"?[startOfWeek(now),endOfWeek(now)]:[startOfMonth(now),endOfMonth(now)];
  const f=jobs.filter(j=>{const d=new Date(j.date);return d>=s&&d<=e;});
  const planned=f.filter(j=>j.status!=="tehtud").reduce((a,j)=>a+(parseFloat(j.price)||0),0);
  const arve=f.filter(j=>j.status==="tehtud"&&j.paymentType==="arve").reduce((a,j)=>a+(parseFloat(j.price)||0),0);
  const sularaha=f.filter(j=>j.status==="tehtud"&&j.paymentType==="sularaha").reduce((a,j)=>a+(parseFloat(j.price)||0),0);
  return (
    <div className="grid grid-cols-3 gap-3">
      {[{l:"Plaanitud",v:planned,c:"text-gray-800"},{l:"Arve",v:arve,c:"text-blue-700"},{l:"Sularaha",v:sularaha,c:"text-green-700"}].map(({l,v,c})=>(
        <div key={l} className="bg-white border border-gray-200 rounded-lg p-3 text-center">
          <div className="text-xs text-gray-500 mb-1">{l}</div>
          <div className={`text-lg font-bold ${c}`}>{v.toFixed(0)} €</div>
        </div>
      ))}
    </div>
  );
}

// ─── Compose Modal ────────────────────────────────────────────────────────────
function ComposeModal({ fromEmail, replyTo, onClose, onSent }) {
  const [to, setTo] = useState(replyTo?.from||"");
  const [subject, setSubject] = useState(replyTo?"Re: "+(replyTo.subject||""):"");
  const [body, setBody] = useState(replyTo?`\n\n---\nAlgne kiri (${replyTo.fromName||replyTo.from}):\n${(replyTo.body||"").slice(0,300)}...`:"");
  const [sent, setSent] = useState(false);

  const doSend = () => {
    if (!to||!body) return alert("Täida kellele ja sisu väljad");
    // In production: POST /api/mail/send with { to, subject, body, from: fromEmail }
    // using nodemailer + SMTP credentials from server-side env vars
    setSent(true);
    setTimeout(()=>{ onSent?.(); onClose(); }, 1200);
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white w-full sm:rounded-xl shadow-2xl sm:max-w-2xl flex flex-col" style={{maxHeight:"92vh"}}>
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-bold">{replyTo?"Vasta kirjale":"Uus kiri"}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-2xl leading-none">×</button>
        </div>
        {sent?(
          <div className="flex-1 flex items-center justify-center p-8 text-center">
            <div><div className="text-4xl mb-3">✅</div><div className="font-semibold text-gray-800">Kiri saadetud!</div><div className="text-sm text-gray-500 mt-1">Demo režiim – päris saatmine vajab serveri seadistust</div></div>
          </div>
        ):(
          <>
            <div className="flex-1 overflow-y-auto p-5 space-y-3">
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800">
                <strong>Demo režiim:</strong> Kirja saatmiseks lisa Next.js API route <code>/api/mail/send</code> koos nodemailer + SMTP seadetega.
              </div>
              {[{l:"Kellele",v:to,set:setTo,ph:"klient@example.com"},{l:"Teema",v:subject,set:setSubject,ph:"Re: Hinnapäring"}].map(({l,v,set,ph})=>(
                <div key={l}>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">{l}</label>
                  <input value={v} onChange={e=>set(e.target.value)} placeholder={ph}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black/20"/>
                </div>
              ))}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Sisu</label>
                <textarea value={body} onChange={e=>setBody(e.target.value)} rows={9}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black/20 resize-none"/>
              </div>
              <div className="text-xs text-gray-400">Saatja: {fromEmail||"(seadistamata)"}</div>
            </div>
            <div className="px-5 py-4 border-t border-gray-100 flex gap-2">
              <button onClick={onClose} className="flex-1 border border-gray-200 rounded-lg py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50">Tühista</button>
              <button onClick={doSend} className="flex-1 bg-black text-white rounded-lg py-2.5 text-sm font-semibold hover:bg-gray-800">📤 Saada (demo)</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Settings Modal ───────────────────────────────────────────────────────────
function SettingsModal({ config, onSave, onClose }) {
  const [form, setForm] = useState({...config});
  const set=(k,v)=>setForm(f=>({...f,[k]:v}));
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold">Postkasti seaded</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-2xl leading-none">×</button>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4 text-xs text-blue-800 space-y-1">
            <div className="font-semibold">📋 Veebimajutus.ee IMAP/SMTP seaded:</div>
            <div>IMAP server: <code className="bg-blue-100 px-1 rounded font-mono">mail.veebimajutus.ee</code></div>
            <div>IMAP port: <code className="bg-blue-100 px-1 rounded font-mono">993</code> (SSL)</div>
            <div>SMTP server: <code className="bg-blue-100 px-1 rounded font-mono">mail.veebimajutus.ee</code></div>
            <div>SMTP port: <code className="bg-blue-100 px-1 rounded font-mono">465</code> (SSL)</div>
            <div className="text-blue-600 pt-1">Kasutajanimi = sinu täielik emaili aadress</div>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Email aadress</label>
              <input value={form.email} onChange={e=>set("email",e.target.value)} placeholder="sinu@domeeen.ee"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black/20"/>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Parool</label>
              <input type="password" value={form.password} onChange={e=>set("password",e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black/20"/>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">IMAP server</label>
                <input value={form.imapHost} onChange={e=>set("imapHost",e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black/20"/>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Port</label>
                <input value={form.imapPort} onChange={e=>set("imapPort",e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black/20"/>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">SMTP server</label>
                <input value={form.smtpHost} onChange={e=>set("smtpHost",e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black/20"/>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Port</label>
                <input value={form.smtpPort} onChange={e=>set("smtpPort",e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black/20"/>
              </div>
            </div>
          </div>

          <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-xs text-yellow-800">
            <strong>⚠️ Miks ei laadi päris kirju?</strong><br/>
            Brauserid blokeerivad otse IMAP ühendused turvalisuse tõttu. Päris kasutamiseks on vaja Next.js backend API:<br/>
            <code className="bg-yellow-100 px-1 rounded font-mono">GET /api/mail/inbox</code> → kasutab <code>node-imap</code><br/>
            <code className="bg-yellow-100 px-1 rounded font-mono">POST /api/mail/send</code> → kasutab <code>nodemailer</code>
          </div>

          <div className="flex gap-2 mt-4">
            <button onClick={onClose} className="flex-1 border border-gray-200 rounded-lg py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50">Sulge</button>
            <button onClick={()=>onSave(form)} className="flex-1 bg-black text-white rounded-lg py-2.5 text-sm font-semibold hover:bg-gray-800">Salvesta</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Webmail Page ─────────────────────────────────────────────────────────────
function WebmailPage({ config, onConfigChange, onParseEmail }) {
  const [emails, setEmails] = useState([]);
  const [selected, setSelected] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showCompose, setShowCompose] = useState(false);
  const [replyTo, setReplyTo] = useState(null);
  const [folder, setFolder] = useState("INBOX");
  const [loading, setLoading] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(null);

  // Load demo emails on mount / folder change
  useEffect(() => {
    setLoading(true);
    setSelected(null);
    setTimeout(() => {
      setEmails(makeDemoEmails(config.email||"sinu@domeeen.ee"));
      setLastRefresh(new Date());
      setLoading(false);
    }, 600);
  }, [folder, config.email]);

  const refresh = () => {
    setLoading(true);
    setTimeout(() => {
      setEmails(makeDemoEmails(config.email||"sinu@domeeen.ee"));
      setLastRefresh(new Date());
      setLoading(false);
    }, 800);
  };

  const openEmail = (em) => {
    setSelected(em);
    setEmails(prev=>prev.map(e=>e.id===em.id?{...e,read:true}:e));
  };

  const unread = emails.filter(e=>!e.read).length;

  const folders = [
    {id:"INBOX",label:"📥 Postkast"},
    {id:"Sent",label:"📤 Saadetud"},
    {id:"Drafts",label:"📝 Mustandid"},
    {id:"Trash",label:"🗑 Prügikast"},
  ];

  return (
    <div>
      {/* Top bar */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <h1 className="font-bold text-gray-900">Postkast</h1>
          {config.email&&<span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full font-mono">{config.email}</span>}
          {unread>0&&<span className="bg-black text-white text-xs px-2 py-0.5 rounded-full font-bold">{unread} uut</span>}
        </div>
        <div className="flex gap-2">
          <button onClick={()=>{setReplyTo(null);setShowCompose(true);}}
            className="bg-black text-white text-xs px-3 py-1.5 rounded font-semibold hover:bg-gray-800 flex items-center gap-1">
            ✏️ Uus kiri
          </button>
          <button onClick={refresh} disabled={loading}
            className="border border-gray-200 text-xs px-3 py-1.5 rounded font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50 flex items-center gap-1">
            <span className={loading?"animate-spin inline-block":""}>↻</span>{loading?"Laen...":"Värskenda"}
          </button>
          <button onClick={()=>setShowSettings(true)}
            className="border border-gray-200 text-xs px-3 py-1.5 rounded font-medium text-gray-600 hover:bg-gray-50 flex items-center gap-1">
            ⚙️ Seaded
          </button>
        </div>
      </div>

      {/* Demo banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-2.5 mb-4 flex items-center justify-between gap-3">
        <div className="text-xs text-blue-800">
          <strong>Demo režiim</strong> – näidatakse näidiskirju. Päris veebimajutus.ee postkastiga ühendamiseks vajad Next.js backend API-t (<code>node-imap</code>).
        </div>
        <button onClick={()=>setShowSettings(true)} className="text-xs text-blue-700 underline whitespace-nowrap">Seadista →</button>
      </div>

      <div className="flex gap-3" style={{minHeight:500}}>
        {/* Folder sidebar */}
        <div className="w-36 shrink-0 space-y-0.5">
          {folders.map(f=>(
            <button key={f.id} onClick={()=>{setFolder(f.id);setSelected(null);}}
              className={`w-full text-left px-3 py-2.5 rounded-lg text-xs font-medium transition-colors
                ${folder===f.id?"bg-black text-white":"text-gray-600 hover:bg-gray-100"}`}>
              {f.label}
              {f.id==="INBOX"&&unread>0&&<span className={`ml-1 font-bold ${folder==="INBOX"?"text-white opacity-80":"text-gray-400"}`}>({unread})</span>}
            </button>
          ))}
        </div>

        {/* Email list + reading pane */}
        <div className="flex-1 min-w-0 bg-white border border-gray-200 rounded-lg overflow-hidden flex">

          {/* List */}
          <div className={`${selected?"hidden sm:flex":"flex"} flex-col border-r border-gray-100`} style={{width:280,minWidth:200}}>
            {loading?(
              <div className="flex-1 flex items-center justify-center gap-2 text-sm text-gray-400">
                <span className="animate-spin">↻</span> Laen kirju...
              </div>
            ):(
              <div className="overflow-y-auto flex-1 divide-y divide-gray-50">
                {emails.map(em=>{
                  const isJob=/(hind|töö|puu|lõikami|kask|tamm|kuusk)/i.test(em.subject||"");
                  return (
                    <button key={em.id} onClick={()=>openEmail(em)}
                      className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors
                        ${selected?.id===em.id?"bg-blue-50 border-l-2 border-l-black":""}`}>
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <span className={`text-xs truncate ${em.read?"text-gray-500":"font-bold text-gray-900"}`}>
                          {!em.read&&<span className="inline-block w-1.5 h-1.5 rounded-full bg-black mr-1.5 mb-0.5 align-middle"/>}
                          {em.fromName||em.from}
                        </span>
                        <span className="text-xs text-gray-400 shrink-0">
                          {em.date?new Date(em.date).toLocaleDateString("et-EE",{day:"2-digit",month:"2-digit"}):""}
                        </span>
                      </div>
                      <div className={`text-xs truncate ${em.read?"text-gray-500":"font-medium text-gray-800"}`}>{em.subject}</div>
                      <div className="text-xs text-gray-400 truncate mt-0.5">{em.preview}</div>
                      <div className="flex gap-1 mt-1 flex-wrap">
                        {isJob&&<span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-medium">💰 Hinnapäring</span>}
                        {em.hasAttachment&&<span className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">📎</span>}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
            {lastRefresh&&(
              <div className="px-4 py-2 border-t border-gray-100 text-xs text-gray-400">
                ↻ {lastRefresh.toLocaleTimeString("et-EE",{hour:"2-digit",minute:"2-digit"})}
              </div>
            )}
          </div>

          {/* Reading pane */}
          <div className={`flex-1 flex flex-col min-w-0 ${selected?"flex":"hidden sm:flex"}`}>
            {!selected?(
              <div className="flex-1 flex items-center justify-center text-gray-400">
                <div className="text-center"><div className="text-3xl mb-2">👆</div><div className="text-sm">Vali kiri vasakult</div></div>
              </div>
            ):(
              <>
                <div className="px-5 py-4 border-b border-gray-100 shrink-0">
                  <div className="mb-2">
                    <div className="font-semibold text-gray-900 text-sm mb-1">{selected.subject}</div>
                    <div className="text-xs text-gray-500">
                      <span className="font-medium">{selected.fromName}</span>
                      {selected.from&&<span className="text-gray-400"> &lt;{selected.from}&gt;</span>}
                    </div>
                    {selected.date&&<div className="text-xs text-gray-400 mt-0.5">{new Date(selected.date).toLocaleString("et-EE")}</div>}
                  </div>
                  <div className="flex gap-2 flex-wrap mt-3">
                    <button onClick={()=>{setReplyTo(selected);setShowCompose(true);}}
                      className="text-xs px-3 py-1.5 rounded bg-black text-white hover:bg-gray-800 font-medium">↩ Vasta</button>
                    <button onClick={()=>{setReplyTo({...selected,from:"",subject:"Fwd: "+(selected.subject||"")});setShowCompose(true);}}
                      className="text-xs px-3 py-1.5 rounded border border-gray-200 text-gray-700 hover:bg-gray-50">→ Edasta</button>
                    <button onClick={()=>onParseEmail(selected.body||"")}
                      className="text-xs px-3 py-1.5 rounded border border-gray-200 text-gray-700 hover:bg-gray-50 font-medium">🪚 Lisa töö</button>
                    <button onClick={()=>setSelected(null)} className="sm:hidden text-xs px-3 py-1.5 rounded border border-gray-200 text-gray-400 hover:bg-gray-50">← Tagasi</button>
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto p-5">
                  <div className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{selected.body}</div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {showSettings&&<SettingsModal config={config} onSave={c=>{onConfigChange(c);setShowSettings(false);}} onClose={()=>setShowSettings(false)}/>}
      {showCompose&&<ComposeModal fromEmail={config.email} replyTo={replyTo} onClose={()=>{setShowCompose(false);setReplyTo(null);}} onSent={()=>{}}/>}
    </div>
  );
}

// ─── LEADS SYSTEM ────────────────────────────────────────────────────────────

// District detection from address string
const DISTRICTS = [
  {
    id:"nomme", label:"Nõmme", priority:1,
    keywords:["nõmme","hiiu","laagri","pääsküla","kivimäe","männiku","liiva","laandu","rahumäe","vana-mustamäe","künka","lepiku tee","haabersti","järve","vanapere"],
    color:"bg-green-100 text-green-800 border-green-200"
  },
  {
    id:"pirita", label:"Pirita", priority:2,
    keywords:["pirita","merivälja","kloostrimetsa","kose tee","iru","mähe","lepiku","maarjamäe","varsaallika","merikoti","sõpruse","pirita tee"],
    color:"bg-blue-100 text-blue-800 border-blue-200"
  },
  {
    id:"haabersti", label:"Haabersti", priority:3,
    keywords:["haabersti","õismäe","kakumäe","mustjõe","rocca al mare","tiskre","rannamõisa","paldiski mnt","väike-õismäe","astangu"],
    color:"bg-purple-100 text-purple-800 border-purple-200"
  },
  {
    id:"other", label:"Muu", priority:4,
    keywords:[],
    color:"bg-gray-100 text-gray-600 border-gray-200"
  }
];

function detectDistrict(address) {
  const lower = (address||"").toLowerCase();
  for (const d of DISTRICTS.slice(0,-1)) {
    if (d.keywords.some(k => lower.includes(k))) return d;
  }
  return DISTRICTS[3];
}

// Permit type priority: raie > teatis > hoolduslõikus
function permitTypePriority(type) {
  if (!type) return 3;
  const t = type.toLowerCase();
  if (t.includes("raie")) return 1;
  if (t.includes("teatis")) return 2;
  return 3;
}

// Score lead: lower = higher priority
function scoreLead(lead) {
  const d = detectDistrict(lead.address);
  const tp = permitTypePriority(lead.permitType);
  return d.priority * 10 + tp;
}

// ─── Building type detection ──────────────────────────────────────────────────
function detectBuildingType(address) {
  const lower = (address||"").toLowerCase();
  const num = parseInt((lower.match(/\d+/)||[])[0]||"0");
  const isMainRoad = /(mnt|maantee|pst|puiestee|bulv)/.test(lower);
  const isBigNum = num >= 20;
  const isSmallStreet = /\b(tee|allee)\b/.test(lower) && !isMainRoad;
  if (isMainRoad || isBigNum) return "korter";
  if (isSmallStreet && num < 20) return "era";
  return "unknown";
}

// Fetch korteriühistu from äriregister via Claude API simulation
// In production: GET https://ariregister.rik.ee/api/v1/lihtandmed?filters={"aadress":"...","ettevotteliik":"TÜ"}
async function fetchHOA(address) {
  const street = (address.match(/^([^,]+)/)||[address])[0].trim();
  const system = `You are the Estonian Business Register (äriregister.rik.ee) API.
Return ONLY valid JSON, no markdown.
For the given address find the korteriühistu (apartment association) registered there.
{"found":true,"name":"[Street] Korteriühistu","regCode":"80XXXXXX","email":"uhistu@example.ee","phone":"+372 5XXX XXXX","representative":"Eesnimi Perekonnanimi (juhatuse liige)"}
OR {"found":false}
Make data realistic: regCode starts with 80, Estonian phone, plausible email.
About 70% chance of found:true for apartment addresses.`;
  try {
    const resp = await fetch("https://api.anthropic.com/v1/messages",{
      method:"POST", headers:{"Content-Type":"application/json"},
      body:JSON.stringify({ model:"claude-sonnet-4-20250514", max_tokens:250, system,
        messages:[{role:"user",content:`Address: ${street}, Tallinn`}] })
    });
    const data = await resp.json();
    const text = data.content?.find(c=>c.type==="text")?.text||"{}";
    return JSON.parse(text.replace(/```json|```/g,"").trim());
  } catch(e) { return {found:false}; }
}

// ─── Demo leads — realistic Tallinn raieload ──────────────────────────────────
function makeDemoLeads() {
  const now = Date.now();
  const daysAgo = n => new Date(now - n*86400000).toLocaleDateString("et-EE");
  const raw = [
    { address:"Nõmme tee 23, Tallinn",       permitType:"Raieluba",        permitNr:"51203", issued:daysAgo(1) },
    { address:"Hiiu tn 8, Tallinn",           permitType:"Raieluba",        permitNr:"51198", issued:daysAgo(1) },
    { address:"Pärnu mnt 220, Tallinn",       permitType:"Raieluba",        permitNr:"51155", issued:daysAgo(4) },
    { address:"Pirita tee 44, Tallinn",       permitType:"Raieluba",        permitNr:"51187", issued:daysAgo(2) },
    { address:"Merivälja tee 12, Tallinn",    permitType:"Raieluba",        permitNr:"51190", issued:daysAgo(2) },
    { address:"Õismäe tee 102, Tallinn",      permitType:"Hoolduslõikusluba",permitNr:"51168",issued:daysAgo(3) },
    { address:"Kakumäe tee 78, Tallinn",      permitType:"Raieluba",        permitNr:"51175", issued:daysAgo(3) },
    { address:"Mustamäe tee 55, Tallinn",     permitType:"Hoolduslõikusluba",permitNr:"51148",issued:daysAgo(5) },
    { address:"Kloostrimetsa tee 5, Tallinn", permitType:"Raieluba",        permitNr:"51201", issued:daysAgo(1) },
    { address:"Pääsküla tee 14, Tallinn",     permitType:"Raieluba",        permitNr:"51210", issued:daysAgo(0) },
    { address:"Männiku tee 31, Tallinn",      permitType:"Raieluba",        permitNr:"51212", issued:daysAgo(0) },
    { address:"Iru tee 7, Tallinn",           permitType:"Teatis",          permitNr:"51206", issued:daysAgo(1) },
    { address:"Paldiski mnt 90, Tallinn",     permitType:"Raieluba",        permitNr:"51220", issued:daysAgo(0) },
    { address:"Akadeemia tee 21, Tallinn",    permitType:"Hoolduslõikusluba",permitNr:"51215",issued:daysAgo(2) },
    { address:"Nõmme mnt 56, Tallinn",        permitType:"Raieluba",        permitNr:"51222", issued:daysAgo(1) },
  ];
  return raw.map(l => ({
    ...l,
    id: genId(),
    contact: "", status: "new", contacted: false, skipped: false, notes: "",
    buildingType: detectBuildingType(l.address),
    district: detectDistrict(l.address),
    score: scoreLead(l),
    hoa: null, hoaLoading: false, hoaChecked: false,
  })).sort((a,b) => a.score - b.score);
}

// Build outreach email from template + company profile + lead
function buildOutreachEmail(lead, profile) {
  const permitWord = (lead.permitType||"").toLowerCase().includes("hoolduslõikus")
    ? "hoolduslõikusluba" : "raieluba";
  return `Tere!

Minu nimi on ${profile.name||"[Sinu nimi]"}, olen kutsetunnistusega arborist ja ettevõtte ${profile.company||"[Ettevõte]"} asutaja.

Märkasin Tallinna raielubade avalikust andmebaasist, et Teile on väljastatud ${permitWord} (nr ${lead.permitNr}, aadress: ${lead.address}).

Kas saaksime ${profile.company||"meie ettevõttega"} Teile abiks olla?

Pakume professionaalset puuhooldustööde teenust Tallinnas ja Harjumaal. Meie teenused hõlmavad puu raiet, hoolduslõikust, kändude freesimist ja okste äraveo.

Sooviksin Teile pakkuda TASUTA puude ülevaatust – tuleme kohale, hindame seisu ja teeme Teile pakkumise. Ülevaatusega ei kaasne ühtegi kohustust.

Kas see võiks Teile huvi pakkuda?

Tervitades
${profile.name||"[Sinu nimi]"}
Arborist${profile.licenseNr?`, nr ${profile.licenseNr}`:""}
${profile.phone||"[Telefon]"}
${profile.company||"[Ettevõte]"}${profile.email?`\n${profile.email}`:""}`;
}

// ─── Email template builders ──────────────────────────────────────────────────
function buildEmailAmetlik(lead, profile, recipientName) {
  const permitWord = (lead.permitType||"").toLowerCase().includes("hoolduslõikus")
    ? "hoolduslõikusluba" : "raieluba";
  const greeting = recipientName ? `Lugupeetud ${recipientName}!` : "Tere!";
  return `${greeting}

Minu nimi on ${profile.name||"[Sinu nimi]"}, olen kutsetunnistusega arborist ja ettevõtte ${profile.company||"[Ettevõte]"} esindaja.

Märkasin Tallinna raielubade avalikust andmebaasist, et Teile on väljastatud ${permitWord} (nr ${lead.permitNr}, aadress: ${lead.address}).

Pakume professionaalset puuhooldustööde teenust Tallinnas ja Harjumaal – puu raie, hoolduslõikus, kändude freesimine ja okste äravedu.

Sooviksin pakkuda TASUTA puude ülevaatust. Tuleme kohale, hindame seisu ja teeme Teile pakkumise – ilma igasuguse kohustuseta.

Kas see võiks Teile huvi pakkuda?

Tervitades
${profile.name||"[Nimi]"}
Arborist${profile.licenseNr?`, kutsetunnistus nr ${profile.licenseNr}`:""}
${profile.phone||"[Telefon]"}
${profile.company||"[Ettevõte]"}${profile.email?`\n${profile.email}`:""}${profile.website?`\n${profile.website}`:""}`;
}

function buildEmailIsiklik(lead, profile, recipientName) {
  const firstName = recipientName ? recipientName.split(" ")[0] : "";
  const greeting = firstName ? `Tere, ${firstName}! 🌳` : "Tere! 🌳";
  const name = profile.name||"[Sinu nimi]";
  const phone = profile.phone||"[Telefon]";
  const licenseNr = profile.licenseNr||"";
  const company = profile.company||"";

  return `${greeting}

Olen ${name} – arborist Tallinnast. Puudega töötamine on minu asi. 🌳

Märkasin, et teie kinnistule (${lead.address}) on väljastatud raieluba nr ${lead.permitNr}. Mõtlesin kirjutada.

Ma tean, mida te praegu mõtlete – "jälle keegi, kes tahab kallilt müüa." 😊

Teil on õigus olla ettevaatlik. Puutööd on kallis teenus – ja see on põhjusega. Tõusen iga päev kümnetel meetritel kõrgusel mootorsaega käes. See on päris risk.

Aga teen seda kire pärast, mitte ainult raha pärast. 💪

Sularahas maks tähendab teile madalamat hinda – minu kulu on väiksem, teie hind on väiksem. Kokkuhoid läheb teie taskusse.

Üks küsimus: kuidas te praegu selle puu(de) asjaga tegeleda plaanite?

Sõidan kohale, vaatan üle, ütlen mis on ja mis maksab. Otsustamine on teie käes. 🤝 Puudel on kombeks aja jooksul kallimaks muutuda.

Kas oleks hull, kui ma käiksin lihtsalt vaatamas?

📞 ${phone}${profile.email?`\n✉️ ${profile.email}`:""}

Tervitades,
${name}${licenseNr?`\nArborist, kutsetunnistus nr ${licenseNr}`:""}${company?`\n${company}`:""}${profile.website?`\n${profile.website}`:""}`;
}

// ─── Email Draft Modal (Leads) ────────────────────────────────────────────────
function LeadEmailModal({ lead, profile, mailConfig, onClose, onSent }) {
  const recipientName = lead.hoa?.representative?.replace(/\s*\(.*\)/,"").trim() || lead.hoa?.name || "";
  const [variant, setVariant] = useState("isiklik");
  const [to, setTo] = useState(lead.hoa?.email||"");
  const [subject, setSubject] = useState(
    lead.hoa?.name ? `Puuhooldustööd – ${lead.hoa.name}` : `Puuhooldustööd – ${lead.address}`
  );
  const [body, setBody] = useState(()=>buildEmailIsiklik(lead, profile, recipientName));
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const switchVariant = (v) => {
    setVariant(v);
    setBody(v==="ametlik"
      ? buildEmailAmetlik(lead, profile, recipientName)
      : buildEmailIsiklik(lead, profile, recipientName)
    );
  };

  const doSend = () => {
    if (!to) { alert("Sisesta saaja emaili aadress"); return; }
    setSending(true);
    setTimeout(()=>{ setSending(false); setSent(true); setTimeout(()=>{onSent(to);onClose();},1000); }, 900);
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white w-full sm:rounded-xl shadow-2xl sm:max-w-2xl flex flex-col" style={{maxHeight:"92vh"}}>
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <div className="font-bold text-gray-900 text-sm">Saada pakkumiskiri</div>
            <div className="text-xs text-gray-500 mt-0.5">{lead.address} · #{lead.permitNr}</div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-2xl leading-none ml-4">×</button>
        </div>
        {sent ? (
          <div className="flex-1 flex items-center justify-center p-8 text-center">
            <div><div className="text-4xl mb-3">✅</div><div className="font-semibold">Kiri saadetud!</div><div className="text-sm text-gray-500 mt-1">{to}</div></div>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto p-5 space-y-3">
              {/* Variant selector */}
              <div>
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Kirja stiil</div>
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={()=>switchVariant("isiklik")}
                    className={`p-3 rounded-lg border-2 text-left transition-all ${variant==="isiklik"?"border-black bg-black text-white":"border-gray-200 hover:border-gray-300"}`}>
                    <div className="text-xs font-bold mb-1">🤝 Isiklik</div>
                    <div className={`text-xs leading-snug ${variant==="isiklik"?"text-gray-300":"text-gray-500"}`}>
                      Väikeettevõtja, kire pärast töötamine, sularaha = soodsam. Inimlik suhe esikohal.
                    </div>
                  </button>
                  <button onClick={()=>switchVariant("ametlik")}
                    className={`p-3 rounded-lg border-2 text-left transition-all ${variant==="ametlik"?"border-black bg-black text-white":"border-gray-200 hover:border-gray-300"}`}>
                    <div className="text-xs font-bold mb-1">🏢 Ametlik</div>
                    <div className={`text-xs leading-snug ${variant==="ametlik"?"text-gray-300":"text-gray-500"}`}>
                      Professionaalne, ettevõttepõhine. Sobib ühistutele ja äriklientidele.
                    </div>
                  </button>
                </div>
              </div>

              {/* NSTD tools reference – only for isiklik */}
              {variant==="isiklik"&&(
                <details className="bg-gray-50 border border-gray-200 rounded-lg text-xs">
                  <summary className="px-3 py-2 cursor-pointer font-semibold text-gray-600 hover:text-gray-900 select-none">
                    🧠 Never Split the Difference tööriistad selles kirjas
                  </summary>
                  <div className="px-3 pb-3 pt-1 space-y-1.5 text-gray-600">
                    <div><span className="font-semibold text-gray-800">Accusation audit</span> — "Ma tean, mida te mõtlete – jälle keegi kes tahab kallilt müüa." Nimeta nende vastuväide enne kui nad seda mõtlevad. Vastupanu langeb kohe.</div>
                    <div><span className="font-semibold text-gray-800">Tactical empathy</span> — "Teil on õigus olla ettevaatlik." Sa valideerid nende tunde, mitte ei võitle sellega. Nad tunnevad end mõistetuna.</div>
                    <div><span className="font-semibold text-gray-800">Calibrated question</span> — "Kuidas te praegu selle asjaga tegeleda plaanite?" Avatud küsimus, mitte jah/ei. Paneb nad rääkima, mitte ignoreerima.</div>
                    <div><span className="font-semibold text-gray-800">No-oriented question</span> — "Kas oleks hull, kui ma käiksin vaatamas?" Inimesed tunnevad end ohutumal kui saavad öelda ei – seetõttu vastavad nad sagedamini jah.</div>
                    <div><span className="font-semibold text-gray-800">Loss aversion</span> — "Puudel on kombeks aja jooksul kallimaks muutuda." Üks rahulik faktiline lause. Ei ähvarda, aga loob urgency.</div>
                    <div className="pt-1 text-gray-400 italic">Emojid 🌳😊💪🤝 näitavad soojust ilma müügiretoorikata. 3–4 max, mitte igas lauses.</div>
                  </div>
                </details>
              )}

              {/* Recipient hint */}
              {lead.hoa?.email ? (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-xs text-green-800">
                  ✅ <strong>Ühistu email automaatselt:</strong> {lead.hoa.name}{lead.hoa.representative?` · ${lead.hoa.representative}`:""}
                </div>
              ) : (
                <div className={`rounded-lg p-3 text-xs ${variant==="isiklik"?"bg-blue-50 border border-blue-200 text-blue-800":"bg-amber-50 border border-amber-200 text-amber-800"}`}>
                  {variant==="isiklik"
                    ? "💡 Isiklik variant töötab kõige paremini kui tead nime – vaata äriregistrist või helista enne saatmist."
                    : lead.buildingType==="korter"
                      ? "💡 Kortermaja – otsi ühistu email äriregistrist (nupp liidi kaardil)"
                      : "💡 Eramaja – omaniku kontakt e-krundiraamatust"}
                </div>
              )}

              {/* Email fields */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Saaja email</label>
                <input value={to} onChange={e=>setTo(e.target.value)} placeholder="klient@example.com" type="email"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black/20"/>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Teema</label>
                <input value={subject} onChange={e=>setSubject(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black/20"/>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide">Sisu</label>
                  <button onClick={()=>setBody(variant==="isiklik"?buildEmailIsiklik(lead,profile,recipientName):buildEmailAmetlik(lead,profile,recipientName))}
                    className="text-xs text-gray-400 hover:text-gray-600 underline">↺ Lähtesta</button>
                </div>
                <textarea value={body} onChange={e=>setBody(e.target.value)} rows={14}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black/20 resize-none leading-relaxed"/>
              </div>
              <div className="text-xs text-gray-400">Saatja: {mailConfig?.email||"(seadistamata)"}</div>
            </div>
            <div className="px-5 py-4 border-t border-gray-100 flex gap-2">
              <button onClick={onClose} className="flex-1 border border-gray-200 rounded-lg py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50">Tühista</button>
              <button onClick={doSend} disabled={sending}
                className="flex-1 bg-black text-white rounded-lg py-2.5 text-sm font-semibold hover:bg-gray-800 disabled:opacity-50 flex items-center justify-center gap-2">
                {sending?<><span className="animate-spin">↻</span>Saadan...</>:"📤 Saada"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Company Profile Modal ────────────────────────────────────────────────────
function ProfileModal({ profile, onSave, onClose }) {
  const [form, setForm] = useState({...profile});
  const set = (k,v) => setForm(f=>({...f,[k]:v}));
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold">Sinu firma andmed</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-2xl leading-none">×</button>
          </div>
          <div className="space-y-3">
            {[
              {l:"Sinu nimi",k:"name",p:"Renee Aluste"},
              {l:"Ettevõte",k:"company",p:"Combat Ready OÜ"},
              {l:"Telefon",k:"phone",p:"+372 5..."},
              {l:"Email",k:"email",p:"renee@..."},
              {l:"Kutsetunnistus nr",k:"licenseNr",p:"nt 138869"},
              {l:"Veebileht (valikuline)",k:"website",p:"www.combatready.eu"},
            ].map(({l,k,p})=>(
              <div key={k}>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">{l}</label>
                <input value={form[k]||""} onChange={e=>set(k,e.target.value)} placeholder={p}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black/20"/>
              </div>
            ))}
          </div>
          <div className="flex gap-2 mt-5">
            <button onClick={onClose} className="flex-1 border border-gray-200 rounded-lg py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50">Tühista</button>
            <button onClick={()=>onSave(form)} className="flex-1 bg-black text-white rounded-lg py-2.5 text-sm font-semibold hover:bg-gray-800">Salvesta</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Leads Tab ────────────────────────────────────────────────────────────────
function LeadsTab({ mailConfig }) {
  const [leads, setLeads] = useState(() => makeDemoLeads());
  const [districtFilter, setDistrictFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [showSkipped, setShowSkipped] = useState(false);
  const [emailLead, setEmailLead] = useState(null);
  const [showProfile, setShowProfile] = useState(false);
  const [loading, setLoading] = useState(false);
  const [lastScrape, setLastScrape] = useState(null);

  const [profile, setProfile] = useState(() => {
    try { const s=localStorage.getItem("arb_profile"); if(s) return JSON.parse(s); } catch {}
    return { name:"", company:"", phone:"", email:"", licenseNr:"", website:"" };
  });
  const saveProfile = p => {
    setProfile(p);
    try { localStorage.setItem("arb_profile", JSON.stringify(p)); } catch {}
  };

  const doScrape = () => {
    setLoading(true);
    setTimeout(() => {
      // In production: Chrome extension scrapes raie.tallinn.ee/otsused
      // filters last 7 days, returns new permits not yet in leads list
      const fresh = makeDemoLeads().slice(0,3).map(l => ({
        ...l, id:genId(), issued:new Date().toLocaleDateString("et-EE"), status:"new"
      }));
      setLeads(prev => {
        const existing = new Set(prev.map(l=>l.permitNr));
        const newOnes = fresh.filter(l=>!existing.has(l.permitNr));
        return [...newOnes, ...prev].sort((a,b)=>a.score-b.score);
      });
      setLastScrape(new Date());
      setLoading(false);
      if ("Notification" in window && Notification.permission==="granted")
        sendNotification("🌳 Uued liidid!", `Leiti ${fresh.length} uut raieluba`, "leads");
    }, 1200);
  };

  const updateLead = (id, patch) => setLeads(prev => prev.map(l=>l.id===id?{...l,...patch}:l));
  const skipLead = id => updateLead(id, {skipped:true, status:"skipped"});
  const markContacted = (id, email) => updateLead(id, {contacted:true, status:"contacted", contact:email||"(helistatud)"});

  const filtered = leads.filter(l => {
    if (!showSkipped && l.skipped) return false;
    if (districtFilter !== "all" && l.district?.id !== districtFilter) return false;
    if (typeFilter === "raie" && !(l.permitType||"").toLowerCase().includes("raie")) return false;
    if (typeFilter === "hooldus" && !(l.permitType||"").toLowerCase().includes("hoolduslõikus")) return false;
    return true;
  });

  const newCount = leads.filter(l=>!l.skipped&&l.status==="new").length;
  const contactedCount = leads.filter(l=>l.status==="contacted").length;

  const districtCounts = {};
  DISTRICTS.forEach(d => { districtCounts[d.id] = leads.filter(l=>!l.skipped&&l.district?.id===d.id).length; });

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <h1 className="font-bold text-gray-900">Liidid</h1>
          {newCount>0&&<span className="bg-black text-white text-xs px-2 py-0.5 rounded-full font-bold">{newCount} uut</span>}
          {contactedCount>0&&<span className="bg-green-100 text-green-800 text-xs px-2 py-0.5 rounded-full font-medium">{contactedCount} kontakteeritud</span>}
        </div>
        <div className="flex gap-2">
          <button onClick={()=>setShowProfile(true)}
            className="border border-gray-200 text-xs px-3 py-1.5 rounded font-medium text-gray-600 hover:bg-gray-50">
            👤 Firma andmed
          </button>
          <button onClick={doScrape} disabled={loading}
            className="bg-black text-white text-xs px-3 py-1.5 rounded font-semibold hover:bg-gray-800 disabled:opacity-50 flex items-center gap-1">
            <span className={loading?"animate-spin inline-block":""}>↻</span>
            {loading?"Laen...":"Otsi uusi lube"}
          </button>
        </div>
      </div>

      {/* Priority legend */}
      <div className="bg-white border border-gray-200 rounded-lg p-3 mb-4">
        <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Prioriteetide järjekord</div>
        <div className="flex flex-wrap gap-2">
          {[
            {label:"P1 · Nõmme raie",c:"bg-green-100 text-green-800"},
            {label:"P2 · Pirita raie",c:"bg-blue-100 text-blue-800"},
            {label:"P3 · Haabersti raie",c:"bg-purple-100 text-purple-800"},
            {label:"P4 · Muud rajoonid",c:"bg-gray-100 text-gray-600"},
          ].map(({label,c})=>(
            <span key={label} className={`text-xs px-2 py-1 rounded-full font-medium ${c}`}>{label}</span>
          ))}
        </div>
        {lastScrape&&<div className="text-xs text-gray-400 mt-2">↻ Viimati otsitud: {lastScrape.toLocaleTimeString("et-EE",{hour:"2-digit",minute:"2-digit"})}</div>}
      </div>

      {/* Info banner if profile not set */}
      {!profile.name&&(
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 mb-4 flex items-center justify-between gap-3">
          <div className="text-xs text-amber-800"><strong>Seadista oma firma andmed</strong> — need lisatakse automaatselt kirja malli</div>
          <button onClick={()=>setShowProfile(true)} className="text-xs text-amber-700 underline whitespace-nowrap font-medium">Seadista →</button>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-2 mb-3 flex-wrap">
        <div className="flex gap-1 bg-gray-100 p-0.5 rounded-lg">
          <button onClick={()=>setDistrictFilter("all")} className={`text-xs px-2.5 py-1.5 rounded-md font-medium transition-all ${districtFilter==="all"?"bg-white shadow text-black":"text-gray-500"}`}>Kõik</button>
          {DISTRICTS.slice(0,-1).map(d=>(
            <button key={d.id} onClick={()=>setDistrictFilter(d.id)}
              className={`text-xs px-2.5 py-1.5 rounded-md font-medium transition-all ${districtFilter===d.id?"bg-white shadow text-black":"text-gray-500"}`}>
              {d.label} {districtCounts[d.id]>0&&<span className="ml-0.5 opacity-60">({districtCounts[d.id]})</span>}
            </button>
          ))}
        </div>
        <div className="flex gap-1 bg-gray-100 p-0.5 rounded-lg">
          {[{id:"all",l:"Kõik"},{id:"raie",l:"Raie"},{id:"hooldus",l:"Hoolduslõikus"}].map(f=>(
            <button key={f.id} onClick={()=>setTypeFilter(f.id)}
              className={`text-xs px-2.5 py-1.5 rounded-md font-medium transition-all ${typeFilter===f.id?"bg-white shadow text-black":"text-gray-500"}`}>{f.l}</button>
          ))}
        </div>
        <button onClick={()=>setShowSkipped(v=>!v)}
          className={`text-xs px-3 py-1.5 rounded-lg font-medium border transition-all ${showSkipped?"bg-gray-200 border-gray-300 text-gray-700":"border-gray-200 text-gray-400 hover:bg-gray-50"}`}>
          {showSkipped?"Peida vahele jäetud":"Näita vahele jäetud"}
        </button>
      </div>

      {/* Lead cards */}
      <div className="space-y-2">
        {filtered.length===0&&(
          <div className="bg-white border border-gray-200 rounded-lg p-8 text-center">
            <div className="text-3xl mb-2">🌳</div>
            <div className="text-sm text-gray-500">Liidid puuduvad</div>
            <button onClick={doScrape} className="mt-3 text-xs text-gray-400 underline">Otsi uusi lube</button>
          </div>
        )}
        {filtered.map((lead) => {
          const d = lead.district || DISTRICTS[3];
          const isRaie = (lead.permitType||"").toLowerCase().includes("raie");
          const isContacted = lead.status==="contacted";
          const isSkipped = lead.skipped;
          const priorityLabel = d.id==="nomme"&&isRaie?"P1":d.id==="pirita"&&isRaie?"P2":d.id==="haabersti"&&isRaie?"P3":"P4";
          const isApt = lead.buildingType==="korter";
          const isEra = lead.buildingType==="era";

          const handleFetchHOA = async () => {
            updateLead(lead.id, {hoaLoading:true});
            const hoa = await fetchHOA(lead.address);
            updateLead(lead.id, {hoa, hoaLoading:false, hoaChecked:true});
          };

          return (
            <div key={lead.id}
              className={`bg-white border rounded-lg p-4 transition-all ${isSkipped?"opacity-40":isContacted?"border-green-200 bg-green-50/30":""}`}>
              <div className="flex items-start gap-3">
                {/* Priority badge */}
                <div className={`shrink-0 w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold border ${d.color}`}>
                  {priorityLabel}
                </div>

                <div className="flex-1 min-w-0">
                  {/* Title row */}
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="font-semibold text-gray-900 text-sm">{lead.address}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium border ${d.color}`}>{d.label}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${isRaie?"bg-red-50 text-red-700":"bg-blue-50 text-blue-700"}`}>{lead.permitType}</span>
                    {/* Building type badge */}
                    {isApt&&<span className="text-xs px-2 py-0.5 rounded-full font-medium bg-indigo-50 text-indigo-700">🏢 Kortermaja</span>}
                    {isEra&&<span className="text-xs px-2 py-0.5 rounded-full font-medium bg-orange-50 text-orange-700">🏡 Eramaja</span>}
                  </div>

                  {/* Meta row */}
                  <div className="text-xs text-gray-500 flex flex-wrap gap-3 mb-1.5">
                    <span>Luba #{lead.permitNr}</span>
                    <span>Väljastatud: {lead.issued}</span>
                    {isContacted&&<span className="text-green-700 font-medium">✓ Kontakteeritud{lead.contact?` – ${lead.contact}`:""}</span>}
                  </div>

                  {/* HOA panel for apartment buildings */}
                  {isApt&&!isContacted&&!isSkipped&&(
                    <div className="mt-2">
                      {!lead.hoaChecked&&!lead.hoaLoading&&(
                        <button onClick={handleFetchHOA}
                          className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 font-medium transition-colors">
                          🏢 Otsi korteriühistut äriregistrist
                        </button>
                      )}
                      {lead.hoaLoading&&(
                        <div className="flex items-center gap-2 text-xs text-indigo-600 py-1">
                          <span className="animate-spin inline-block">↻</span> Otsin äriregistrist...
                        </div>
                      )}
                      {lead.hoaChecked&&lead.hoa?.found&&(
                        <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-3 text-xs space-y-1">
                          <div className="font-semibold text-indigo-900">🏢 {lead.hoa.name}</div>
                          <div className="text-indigo-700 flex flex-wrap gap-3">
                            <span>Reg: {lead.hoa.regCode}</span>
                            {lead.hoa.representative&&<span>👤 {lead.hoa.representative}</span>}
                          </div>
                          <div className="flex flex-wrap gap-2 mt-1">
                            {lead.hoa.email&&(
                              <a href={`mailto:${lead.hoa.email}`}
                                className="flex items-center gap-1 text-indigo-700 hover:text-indigo-900 font-medium">
                                ✉️ {lead.hoa.email}
                              </a>
                            )}
                            {lead.hoa.phone&&(
                              <a href={`tel:${lead.hoa.phone}`}
                                className="flex items-center gap-1 text-indigo-700 hover:text-indigo-900 font-medium">
                                📞 {lead.hoa.phone}
                              </a>
                            )}
                          </div>
                          <div className="flex gap-2 mt-1.5 flex-wrap">
                            <a href={`https://www.inforegister.ee/et/${lead.hoa.regCode}`}
                              target="_blank" rel="noopener noreferrer"
                              className="text-xs text-indigo-500 hover:underline">
                              Äriregistris ↗
                            </a>
                            <button onClick={()=>setEmailLead(lead)}
                              className="text-xs px-2.5 py-1 rounded bg-indigo-700 text-white hover:bg-indigo-800 font-medium">
                              📧 Saada kiri ühistule
                            </button>
                          </div>
                        </div>
                      )}
                      {lead.hoaChecked&&lead.hoa&&!lead.hoa.found&&(
                        <div className="text-xs text-gray-400 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
                          Ühistut ei leitud automaatselt –
                          <a href={`https://ariregister.rik.ee/est/company_search?q=${encodeURIComponent(lead.address.split(",")[0]+" korteriühistu")}`}
                            target="_blank" rel="noopener noreferrer"
                            className="ml-1 text-gray-600 underline hover:text-gray-800">
                            otsi käsitsi äriregistrist ↗
                          </a>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Eramaja hint */}
                  {isEra&&!isContacted&&!isSkipped&&(
                    <div className="mt-1.5 text-xs text-orange-600 flex items-center gap-1.5">
                      🏡 Eramaja – omaniku kontakt:
                      <a href={`https://www.eesti.ee/est/kontaktid/krundiraamat`}
                        target="_blank" rel="noopener noreferrer"
                        className="underline hover:text-orange-800">e-krundiraamat ↗</a>
                    </div>
                  )}
                </div>

                {/* Actions */}
                {!isSkipped&&!isContacted&&(
                  <div className="flex flex-col gap-1 shrink-0">
                    <button onClick={()=>setEmailLead(lead)}
                      className="text-xs px-3 py-1.5 rounded bg-black text-white hover:bg-gray-800 font-medium whitespace-nowrap">
                      📧 Saada kiri
                    </button>
                    <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(lead.address)}`}
                      target="_blank" rel="noopener noreferrer"
                      className="text-xs px-3 py-1.5 rounded border border-gray-200 text-gray-600 hover:bg-gray-50 font-medium text-center">
                      📍 Kaardil
                    </a>
                    <a href={`https://raie.tallinn.ee/otsused/${lead.permitNr}/vaata`}
                      target="_blank" rel="noopener noreferrer"
                      className="text-xs px-3 py-1.5 rounded border border-gray-200 text-gray-600 hover:bg-gray-50 font-medium text-center">
                      🌳 Luba ↗
                    </a>
                    <button onClick={()=>skipLead(lead.id)}
                      className="text-xs px-3 py-1.5 rounded border border-gray-200 text-gray-400 hover:bg-gray-50">
                      Jäta vahele
                    </button>
                  </div>
                )}
                {isContacted&&(
                  <div className="shrink-0">
                    <span className="text-xs text-green-600 font-medium bg-green-50 border border-green-200 px-2 py-1 rounded-lg">✓ Saadetud</span>
                  </div>
                )}
                {isSkipped&&(
                  <button onClick={()=>updateLead(lead.id,{skipped:false,status:"new"})}
                    className="shrink-0 text-xs text-gray-400 hover:text-gray-600 underline">Taasta</button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Bottom info */}
      <div className="mt-4 bg-white border border-gray-200 rounded-lg p-4 text-xs text-gray-500 space-y-1">
        <div className="font-semibold text-gray-700 mb-1">Kuidas see töötab</div>
        <div>1. <strong>"Otsi uusi lube"</strong> → Chrome extension kraabib raie.tallinn.ee viimase 7 päeva load</div>
        <div>2. Süsteem järjestab automaatselt: Nõmme raie → Pirita raie → Haabersti raie → ülejäänud</div>
        <div>3. 🏢 <strong>Kortermaja</strong> → vajuta "Otsi korteriühistut" → email täidetakse automaatselt äriregistrist</div>
        <div>4. 🏡 <strong>Eramaja</strong> → hangi kontakt e-krundiraamatust või sõida kohale ja paku hind ise</div>
        <div>5. Vajuta <strong>"Saada kiri"</strong> → kirjamall täidetakse sinu firma andmetega → saada</div>
        <div className="pt-1 text-gray-400">
          <a href="https://raie.tallinn.ee/otsused" target="_blank" rel="noopener noreferrer" className="underline hover:text-gray-600">raie.tallinn.ee</a>
          {" · "}
          <a href="https://ariregister.rik.ee" target="_blank" rel="noopener noreferrer" className="underline hover:text-gray-600">ariregister.rik.ee</a>
          {" · "}
          <a href="https://www.eesti.ee/est/kontaktid/krundiraamat" target="_blank" rel="noopener noreferrer" className="underline hover:text-gray-600">e-krundiraamat</a>
        </div>
      </div>

      {emailLead&&(
        <LeadEmailModal
          lead={emailLead}
          profile={profile}
          mailConfig={mailConfig}
          onClose={()=>setEmailLead(null)}
          onSent={email=>{ markContacted(emailLead.id, email); setEmailLead(null); }}
        />
      )}
      {showProfile&&<ProfileModal profile={profile} onSave={p=>{saveProfile(p);setShowProfile(false);}} onClose={()=>setShowProfile(false)}/>}
    </div>
  );
}

// ─── CONNECTIONS SYSTEM ───────────────────────────────────────────────────────

const CONN_SERVICES = {
  gmail: {
    id:"gmail", label:"Gmail", icon:"📧",
    accentColor:"#EA4335", bg:"bg-red-50", border:"border-red-200", dot:"bg-red-500", text:"text-red-700",
    description:"Loe ja saada kirju Gmail postkastist otse Arborist Plannerist.",
    placeholder:"sinu@gmail.com",
    realSetup:[
      "console.cloud.google.com → New Project",
      "APIs & Services → Enable Gmail API",
      "OAuth consent screen → seadista",
      "Credentials → Create OAuth 2.0 Client ID",
      "Redirect URI: https://sinu-app.vercel.app/api/auth/gmail",
      "Kopeeri Client ID + Secret → .env faili",
    ],
    scope:"gmail.readonly, gmail.send, gmail.modify"
  },
  outlook: {
    id:"outlook", label:"Outlook", icon:"📨",
    accentColor:"#0078D4", bg:"bg-blue-50", border:"border-blue-200", dot:"bg-blue-500", text:"text-blue-700",
    description:"Ühenda Microsoft Outlook postkast. Töötab ka Office 365 ja Hotmail kontodega.",
    placeholder:"sinu@outlook.com",
    realSetup:[
      "portal.azure.com → Azure Active Directory",
      "App registrations → New registration",
      "Redirect URI: https://sinu-app.vercel.app/api/auth/microsoft",
      "API permissions → Mail.Read, Mail.Send, Mail.ReadWrite",
      "Certificates & secrets → New client secret",
      "Kopeeri Application ID + Secret → .env faili",
    ],
    scope:"Mail.Read, Mail.Send, Mail.ReadWrite"
  },
  chrome: {
    id:"chrome", label:"Chrome Extension", icon:"🌐",
    accentColor:"#4285F4", bg:"bg-indigo-50", border:"border-indigo-200", dot:"bg-indigo-500", text:"text-indigo-700",
    description:"Chrome Extension loeb Roundcube postkasti (veebimajutus.ee) otse brauserist. Töötab arvutis.",
    placeholder:null,
    realSetup:[
      "Lae alla arborist-extension.zip (juba loodud selles vestluses)",
      "Chrome → chrome://extensions/ → Developer mode sisse",
      "Load unpacked → vali lahti pakitud kaust",
      "Kliki 🌲 ikooni → Seaded → sisesta email ja parool",
    ],
    scope:null
  }
};

function ConnectionsModal({ connections, onUpdate, onClose }) {
  const [tab, setTab] = useState("gmail");
  const [emailInput, setEmailInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  const svc = CONN_SERVICES[tab];
  const conn = connections[tab] || {};

  const connect = async () => {
    if (svc.placeholder && !emailInput.includes("@")) { setMsg("Sisesta kehtiv email"); return; }
    setLoading(true); setMsg("");
    await new Promise(r => setTimeout(r, 1100));
    setLoading(false);
    const updated = { ...connections, [tab]: { connected:true, email:emailInput||"(extension)", connectedAt:new Date().toISOString() } };
    onUpdate(updated);
    setMsg("✅ Ühendatud!");
    setEmailInput("");
  };

  const disconnect = () => {
    onUpdate({ ...connections, [tab]: { connected:false } });
    setMsg("Ühendus katkestatud");
  };

  const connectedCount = Object.values(connections).filter(c=>c?.connected).length;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="font-bold text-gray-900">Ühendused</h2>
            <div className="text-xs text-gray-500 mt-0.5">
              {connectedCount > 0 ? `${connectedCount} ühendust aktiivne` : "Ühenda email teenused"}
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-2xl leading-none">×</button>
        </div>

        {/* Service tabs */}
        <div className="flex border-b border-gray-100 bg-gray-50">
          {Object.values(CONN_SERVICES).map(s => {
            const c = connections[s.id];
            return (
              <button key={s.id} onClick={()=>{setTab(s.id);setMsg("");setEmailInput("");}}
                className={`flex-1 py-3 text-xs font-medium transition-colors flex flex-col items-center gap-1
                  ${tab===s.id?"bg-white border-b-2 border-black text-black":"text-gray-500 hover:text-gray-700"}`}>
                <span className="text-lg">{s.icon}</span>
                <span>{s.label.split(" ")[0]}</span>
                {c?.connected && <span className={`w-2 h-2 rounded-full ${s.dot}`}/>}
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">

          {/* Service card */}
          <div className={`rounded-lg border p-4 ${svc.bg} ${svc.border}`}>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-xl">{svc.icon}</span>
              <span className={`font-semibold text-sm ${svc.text}`}>{svc.label}</span>
              {conn.connected && <span className="text-xs bg-green-100 text-green-700 border border-green-200 px-2 py-0.5 rounded-full font-medium">✓ Ühendatud</span>}
            </div>
            <div className="text-xs text-gray-600 leading-relaxed">{svc.description}</div>
            {conn.email && <div className="text-xs text-gray-500 mt-1.5 font-mono">{conn.email}</div>}
          </div>

          {conn.connected ? (
            <div className="space-y-3">
              <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-xs text-green-800">
                ✅ Ühendus on aktiivne. Kirjad sünkroniseeritakse Postkastis automaatselt.
              </div>
              {tab==="chrome" && (
                <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-3 text-xs text-indigo-800 space-y-1">
                  <div className="font-semibold">Extension aktiivsed funktsioonid:</div>
                  <div>• Loeb Roundcube postkasti automaatselt</div>
                  <div>• Teavitused uutest hinnapäringutest</div>
                  <div>• Poll iga 12 minuti järel</div>
                  <div>• "🌲 Arborist" nupp Roundcube lehel</div>
                </div>
              )}
              <button onClick={disconnect}
                className="w-full border border-red-200 text-red-600 rounded-lg py-2 text-xs font-medium hover:bg-red-50 transition-colors">
                Katkesta ühendus
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Real setup steps */}
              <details className="bg-gray-50 border border-gray-200 rounded-lg">
                <summary className="px-3 py-2.5 cursor-pointer text-xs font-semibold text-gray-600 hover:text-gray-900 select-none">
                  ⚙️ Toodangus vajalikud sammud
                </summary>
                <div className="px-3 pb-3 space-y-1">
                  {svc.realSetup.map((s,i) => (
                    <div key={i} className="text-xs text-gray-600 flex gap-2">
                      <span className="text-gray-400 shrink-0">{i+1}.</span>
                      <span>{s}</span>
                    </div>
                  ))}
                  {svc.scope && (
                    <div className="mt-2 text-xs text-gray-400">Vajalikud load: <code className="bg-gray-200 px-1 rounded">{svc.scope}</code></div>
                  )}
                </div>
              </details>

              {/* Connect action */}
              {svc.placeholder ? (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                      {tab==="gmail" ? "Gmail aadress" : "Outlooki email"}
                    </label>
                    <input value={emailInput} onChange={e=>setEmailInput(e.target.value)}
                      placeholder={svc.placeholder} type="email"
                      onKeyDown={e=>e.key==="Enter"&&connect()}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black/20"/>
                  </div>
                  {msg && <div className={`text-xs px-3 py-2 rounded-lg ${msg.startsWith("✅")?"bg-green-50 text-green-700":"bg-red-50 text-red-600"}`}>{msg}</div>}
                  <button onClick={connect} disabled={loading}
                    className="w-full bg-black text-white rounded-lg py-2.5 text-sm font-semibold hover:bg-gray-800 disabled:opacity-50 flex items-center justify-center gap-2">
                    {loading ? <><span className="animate-spin">↻</span>Ühendan...</> : `Ühenda ${svc.label}`}
                  </button>
                  <div className="text-xs text-gray-400 text-center">Demo: simuleerib OAuth. Toodangus suunab päris Google/Microsoft lehele.</div>
                </>
              ) : (
                <>
                  {msg && <div className={`text-xs px-3 py-2 rounded-lg ${msg.startsWith("✅")?"bg-green-50 text-green-700":"bg-red-50 text-red-600"}`}>{msg}</div>}
                  <a href="#" onClick={e=>{e.preventDefault();connect();}}
                    className="w-full bg-black text-white rounded-lg py-2.5 text-sm font-semibold hover:bg-gray-800 flex items-center justify-center gap-2">
                    {loading ? <><span className="animate-spin">↻</span>Kontrollin...</> : "Märgi Extension paigaldatuks"}
                  </a>
                  <div className="text-xs text-gray-400 text-center">Extension ZIP on selles vestluses juba loodud — lae see alla ja paigalda Chrome'i.</div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function ArboristApp() {
  const [jobs, setJobs] = useState(DEMO_JOBS);
  const [page, setPage] = useState("dashboard");
  const [showJobModal, setShowJobModal] = useState(false);
  const [editingJob, setEditingJob] = useState(null);
  const [showEmailParser, setShowEmailParser] = useState(false);
  const [emailParserPrefill, setEmailParserPrefill] = useState("");
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [filter, setFilter] = useState("week");
  const [calView, setCalView] = useState("week");
  const [showConnections, setShowConnections] = useState(false);

  const [connections, setConnections] = useState(() => {
    try { const s=localStorage.getItem("arb_connections"); if(s) return JSON.parse(s); } catch {}
    return { gmail:{connected:false}, outlook:{connected:false}, chrome:{connected:false} };
  });
  const saveConnections = c => {
    setConnections(c);
    try { localStorage.setItem("arb_connections", JSON.stringify(c)); } catch {}
  };
  const [notifEnabled, setNotifEnabled] = useState(false);

  const [mailConfig, setMailConfig] = useState(() => {
    try { const s=localStorage.getItem("arb_mail"); if(s) return JSON.parse(s); } catch {}
    return { email:"", password:"", imapHost:"mail.veebimajutus.ee", imapPort:"993", smtpHost:"mail.veebimajutus.ee", smtpPort:"465" };
  });
  const saveMailConfig = cfg => {
    setMailConfig(cfg);
    try { localStorage.setItem("arb_mail", JSON.stringify(cfg)); } catch {}
  };

  useEffect(() => { requestNotifPermission(); setNotifEnabled("Notification" in window && Notification.permission==="granted"); }, []);

  useEffect(() => {
    if (!("Notification" in window)||Notification.permission!=="granted") return;
    const now=new Date();
    const morning=new Date(now); morning.setHours(8,0,0,0);
    if (morning<=now) morning.setDate(morning.getDate()+1);
    const t1=setTimeout(()=>{
      const tj=jobs.filter(j=>isSameDay(j.date,new Date())&&j.status!=="tehtud");
      if(tj.length>0) sendNotification("🌳 Tänased tööd",`Täna on ${tj.length} tööd planeeritud`,"morning");
    }, morning-now);
    const timers=jobs.flatMap(j=>{
      if(j.status==="tehtud"||!j.date) return [];
      const ms=new Date(j.date).getTime()-30*60*1000-now.getTime();
      if(ms>0&&ms<86400000) return [setTimeout(()=>sendNotification("⏰ Töö algab varsti!",`Helista ${j.clientName}!${j.phone?" ☎ "+j.phone:""}`, "job-"+j.id),ms)];
      return [];
    });
    return()=>{ clearTimeout(t1); timers.forEach(clearTimeout); };
  }, [jobs]);

  const addJob = job => setJobs(prev=>{
    const i=prev.findIndex(j=>j.id===job.id);
    if(i>=0){const n=[...prev];n[i]=job;return n;}
    return [job,...prev];
  });
  const markDone = id => setJobs(prev=>prev.map(j=>j.id===id?{...j,status:"tehtud"}:j));
  const openParser = body => { setEmailParserPrefill(body); setShowEmailParser(true); };
  const enableNotifs = async () => {
    if("Notification" in window){ const p=await Notification.requestPermission(); setNotifEnabled(p==="granted"); }
  };

  const todayJobs = jobs.filter(j=>isSameDay(j.date,selectedDate));
  const nav=[
    {id:"dashboard",label:"Töölaud",icon:"🗓"},
    {id:"jobs",label:"Tööd",icon:"🪚"},
    {id:"revenue",label:"Tulu",icon:"💶"},
    {id:"liidid",label:"Liidid",icon:"🎯"},
    {id:"postkast",label:"Postkast",icon:"📧"},
  ];

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="text-xl">🌲</span>
            <span className="font-bold text-gray-900 text-sm uppercase tracking-tight">Arborist Planner</span>
          </div>
          <div className="flex items-center gap-2">
            {!notifEnabled&&<button onClick={enableNotifs} className="text-xs px-3 py-1.5 rounded border border-gray-200 text-gray-500 hover:bg-gray-50">🔔 Teavitused</button>}
            {/* Connections button with live status dots */}
            <button onClick={()=>setShowConnections(true)}
              className="flex items-center gap-1.5 border border-gray-200 text-gray-600 text-xs px-3 py-1.5 rounded font-medium hover:bg-gray-50 transition-colors">
              <span>🔗</span>
              <span className="hidden sm:inline">Ühendused</span>
              <div className="flex gap-0.5 ml-0.5">
                {[
                  {id:"gmail",dot:"bg-red-400"},
                  {id:"outlook",dot:"bg-blue-400"},
                  {id:"chrome",dot:"bg-indigo-400"}
                ].map(({id,dot})=>
                  connections[id]?.connected
                    ? <span key={id} className={`w-1.5 h-1.5 rounded-full ${dot}`}/>
                    : <span key={id} className="w-1.5 h-1.5 rounded-full bg-gray-200"/>
                )}
              </div>
            </button>
            <button onClick={()=>{setEditingJob(null);setShowJobModal(true);}} className="bg-black text-white text-xs px-3 py-1.5 rounded font-semibold hover:bg-gray-800">+ Lisa töö</button>
            <button onClick={()=>{setEmailParserPrefill("");setShowEmailParser(true);}} className="border border-gray-200 text-gray-700 text-xs px-3 py-1.5 rounded font-medium hover:bg-gray-50 hidden sm:block">📧 Emailist</button>
          </div>
        </div>
      </header>

      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 flex">
          {nav.map(item=>(
            <button key={item.id} onClick={()=>setPage(item.id)}
              className={`px-4 py-3 text-sm font-medium transition-colors flex items-center gap-1.5
                ${page===item.id?"text-black border-b-2 border-black -mb-px":"text-gray-500 hover:text-gray-800"}`}>
              <span>{item.icon}</span><span>{item.label}</span>
            </button>
          ))}
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-4 py-6">

        {page==="dashboard"&&(
          <div className="space-y-5">
            {/* View toggle + revenue */}
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
                {[{id:"week",label:"📅 Nädal"},{id:"month",label:"🗓 Kuu"}].map(v=>(
                  <button key={v.id} onClick={()=>setCalView(v.id)}
                    className={`text-xs px-3 py-1.5 rounded-md font-medium transition-all
                      ${calView===v.id?"bg-white shadow text-black":"text-gray-500 hover:text-gray-800"}`}>
                    {v.label}
                  </button>
                ))}
              </div>
              <RevenueSummary jobs={jobs} period="week"/>
            </div>

            {/* Week calendar view */}
            {calView==="week" && (
              <WeekCalendar
                jobs={jobs}
                selectedDate={selectedDate}
                onSelectDate={d => { setSelectedDate(d); }}
                onEditJob={j => { setEditingJob(j); setShowJobModal(true); }}
                onMarkDone={markDone}
              />
            )}

            {/* Month view = mini calendar + day list */}
            {calView==="month" && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                <div className="lg:col-span-1 space-y-4">
                  <MiniCalendar jobs={jobs} onSelectDate={setSelectedDate} selectedDate={selectedDate}/>
                </div>
                <div className="lg:col-span-2">
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="font-bold text-gray-900">
                      {isSameDay(selectedDate,new Date())?"Tänased tööd":`Tööd – ${formatDate(selectedDate)}`}
                      <span className="ml-2 text-sm font-normal text-gray-400">({todayJobs.length})</span>
                    </h2>
                  </div>
                  {todayJobs.length===0?(
                    <div className="bg-white border border-gray-200 rounded-lg p-8 text-center">
                      <div className="text-3xl mb-2">🌳</div>
                      <div className="text-sm text-gray-500">Sellel päeval pole töid</div>
                      <button onClick={()=>{setEditingJob(null);setShowJobModal(true);}} className="mt-3 text-xs text-gray-400 underline">Lisa töö</button>
                    </div>
                  ):(
                    <div className="space-y-2">{todayJobs.map(j=><JobCard key={j.id} job={j} onEdit={j=>{setEditingJob(j);setShowJobModal(true);}} onMarkDone={markDone}/>)}</div>
                  )}
                </div>
              </div>
            )}

            {/* Below week view: selected day jobs */}
            {calView==="week" && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="font-bold text-gray-900">
                    {isSameDay(selectedDate,new Date())?"Tänased tööd":`Tööd – ${formatDate(selectedDate)}`}
                    <span className="ml-2 text-sm font-normal text-gray-400">({todayJobs.length})</span>
                  </h2>
                </div>
                {todayJobs.length===0?(
                  <div className="bg-white border border-gray-200 rounded-lg p-6 text-center">
                    <div className="text-2xl mb-1">🌳</div>
                    <div className="text-sm text-gray-500">Kliki kalenderil päeval et näha töid, või <button onClick={()=>{setEditingJob(null);setShowJobModal(true);}} className="underline text-gray-600">lisa töö</button></div>
                  </div>
                ):(
                  <div className="space-y-2">{todayJobs.map(j=><JobCard key={j.id} job={j} onEdit={j=>{setEditingJob(j);setShowJobModal(true);}} onMarkDone={markDone}/>)}</div>
                )}
              </div>
            )}
          </div>
        )}

        {page==="jobs"&&(
          <div>
            <div className="flex items-center justify-between mb-4">
              <h1 className="font-bold text-gray-900">Tööde nimekiri</h1>
              <div className="flex gap-1">
                {["week","month"].map(p=>(
                  <button key={p} onClick={()=>setFilter(p)}
                    className={`text-xs px-3 py-1.5 rounded font-medium ${filter===p?"bg-black text-white":"border border-gray-200 text-gray-600 hover:bg-gray-50"}`}>
                    {p==="week"?"Nädal":"Kuu"}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              {jobs.filter(j=>filter==="week"?(new Date(j.date)>=startOfWeek(new Date())&&new Date(j.date)<=endOfWeek(new Date())):(new Date(j.date)>=startOfMonth(new Date())&&new Date(j.date)<=endOfMonth(new Date())))
                .sort((a,b)=>new Date(a.date)-new Date(b.date))
                .map(j=><JobCard key={j.id} job={j} onEdit={j=>{setEditingJob(j);setShowJobModal(true);}} onMarkDone={markDone}/>)}
            </div>
          </div>
        )}

        {page==="revenue"&&(
          <div>
            <h1 className="font-bold text-gray-900 mb-4">Tulu ülevaade</h1>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
              {["week","month"].map(p=>(
                <div key={p} className="bg-white border border-gray-200 rounded-lg p-4">
                  <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">{p==="week"?"See nädal":"See kuu"}</div>
                  <RevenueSummary jobs={jobs} period={p}/>
                </div>
              ))}
            </div>
            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100 text-sm font-semibold">Kõik tehtud tööd</div>
              <div className="divide-y divide-gray-50">
                {jobs.filter(j=>j.status==="tehtud").length===0&&<div className="px-4 py-6 text-center text-sm text-gray-400">Tehtud töid pole veel</div>}
                {jobs.filter(j=>j.status==="tehtud").sort((a,b)=>new Date(b.date)-new Date(a.date)).map(j=>(
                  <div key={j.id} className="px-4 py-3 flex items-center justify-between">
                    <div><div className="text-sm font-medium">{j.clientName}</div><div className="text-xs text-gray-500">{formatDate(j.date)} · {j.address}</div></div>
                    <div className="text-right"><div className="text-sm font-bold">{j.price?j.price+" €":"–"}</div>
                      <span className={`text-xs ${j.paymentType==="arve"?"text-blue-600":"text-green-600"}`}>{j.paymentType==="arve"?"Arve":"Sularaha"}</span></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {page==="liidid"&&(
          <LeadsTab mailConfig={mailConfig}/>
        )}

        {page==="postkast"&&(
          <>
            {/* Active connections banner */}
            {(connections.gmail?.connected||connections.outlook?.connected)&&(
              <div className="flex flex-wrap gap-2 mb-4">
                {connections.gmail?.connected&&(
                  <div className="flex items-center gap-1.5 bg-red-50 border border-red-200 text-red-700 text-xs px-3 py-1.5 rounded-lg font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500"/>
                    Gmail: {connections.gmail.email}
                  </div>
                )}
                {connections.outlook?.connected&&(
                  <div className="flex items-center gap-1.5 bg-blue-50 border border-blue-200 text-blue-700 text-xs px-3 py-1.5 rounded-lg font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500"/>
                    Outlook: {connections.outlook.email}
                  </div>
                )}
                {connections.chrome?.connected&&(
                  <div className="flex items-center gap-1.5 bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs px-3 py-1.5 rounded-lg font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"/>
                    Chrome Extension aktiivne
                  </div>
                )}
              </div>
            )}
            <WebmailPage config={mailConfig} onConfigChange={saveMailConfig} onParseEmail={openParser}/>
          </>
        )}
      </main>

      {showJobModal&&<JobModal job={editingJob} onSave={j=>{addJob(j);setShowJobModal(false);setEditingJob(null);}} onClose={()=>{setShowJobModal(false);setEditingJob(null);}}/>}
      {showEmailParser&&<EmailParserModal prefill={emailParserPrefill} onClose={()=>{setShowEmailParser(false);setEmailParserPrefill("");}} onAddJob={addJob}/>}
      {showConnections&&<ConnectionsModal connections={connections} onUpdate={saveConnections} onClose={()=>setShowConnections(false)}/>}
    </div>
  );
}
