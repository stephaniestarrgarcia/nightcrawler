import type { Metadata } from 'next'
import { sessionIsLive } from '@/lib/session'
import { AdminApp } from '@/components/admin/AdminApp'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Nightcrawler — back of house',
  robots: { index: false, follow: false },
}

export default async function Page() {
  // Rendering the pad for someone who is already unlocked would be a pointless
  // extra PIN entry, so the server decides which screen to send.
  return <AdminApp unlockedInitially={await sessionIsLive()} />
}
