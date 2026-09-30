import type { Metadata, Viewport } from 'next'
import { Pinyon_Script, Space_Grotesk } from 'next/font/google'
import { siteUrl } from '@/lib/site'
import './globals.css'

const display = Pinyon_Script({
  weight: '400',
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-display',
})

const sans = Space_Grotesk({
  weight: ['300', '400', '500', '700'],
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-sans',
})

export const metadata: Metadata = {
  // Lets Next resolve absolute URLs for link previews when the site is shared.
  metadataBase: new URL(siteUrl('http://localhost:3000')),
  title: 'Nightcrawler — fine cannabis, after dark',
  description:
    'Small-batch cannabis across four rooms: New York, New Jersey, Los Angeles and The Valley. Order ahead for pickup or delivery — pay on arrival. 21+ only.',
}

export const viewport: Viewport = {
  themeColor: '#0e0b09',
  colorScheme: 'dark',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${sans.variable}`}>
      <body>{children}</body>
    </html>
  )
}
