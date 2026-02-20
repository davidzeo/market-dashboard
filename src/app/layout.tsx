import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Market Dashboard',
  description: 'Live crypto, forex, and metals prices',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
