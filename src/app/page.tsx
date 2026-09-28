import { cookies } from 'next/headers'
import { driver } from '@/lib/db'
import { SiteApp } from '@/components/site/SiteApp'

export const dynamic = 'force-dynamic'

export default async function Page() {
  const jar = await cookies()
  const location = jar.get('nc-location')?.value || 'ny'
  const initial = await driver.publicState(location)

  return (
    <SiteApp
      initial={initial}
      initialLocation={location}
      // Read on the server so returning customers never see the gate flash.
      aged={jar.get('nc-age-ok')?.value === '1'}
    />
  )
}
