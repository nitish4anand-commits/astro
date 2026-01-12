import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Astro Kundli - Vedic & Western Astrology',
  description: 'Open-source astrology app with accurate Vedic and Western calculations',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-gray-50 min-h-screen antialiased`}>
        <div className="animate-in fade-in-50 duration-200">
          {children}
        </div>
      </body>
    </html>
  )
}
