'use client'

import { useEffect, useState } from 'react'

export default function Home() {
  const [App, setApp] = useState(null)

  useEffect(() => {
    import('./ArboristApp').then(mod => {
      setApp(() => mod.default)
    })
  }, [])

  if (!App) return (
    <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'#f9fafb'}}>
      <div style={{textAlign:'center'}}>
        <div style={{fontSize:48}}>🌲</div>
        <div style={{marginTop:8,color:'#666',fontFamily:'sans-serif'}}>Laen...</div>
      </div>
    </div>
  )

  return <App />
}
