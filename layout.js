import './globals.css'

export const metadata = {
  title: 'Arborist Planner',
  description: 'Arborist töö- ja liidihaldus',
}

export default function RootLayout({ children }) {
  return (
    <html lang="et">
      <body>{children}</body>
    </html>
  )
}
