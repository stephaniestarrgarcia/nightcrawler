import type { Metadata } from 'next'
import { driver } from '@/lib/db'
import { TrackPage } from '@/components/site/TrackPage'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Nightcrawler — order tracker',
  robots: { index: false, follow: false },
}

/**
 * The link that goes out by SMS and email. The last four digits of the phone
 * on the order arrive as `?p=` so a bare order number is not enough.
 */
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ number: string }>
  searchParams: Promise<{ p?: string }>
}) {
  const { number } = await params
  const { p = '' } = await searchParams

  const order = await driver.orderByNumber(decodeURIComponent(number).toUpperCase())
  const matches = order && order.phone.replace(/\D/g, '').slice(-4) === p.replace(/\D/g, '').slice(-4)

  if (!order || !matches) {
    return <TrackPage saved={null} initial={null} />
  }

  const locations = (await driver.publicState(order.location_id)).locations
  const room = locations.find(l => l.id === order.location_id)

  return (
    <TrackPage
      saved={{ number: order.number, proof: p, where: '' }}
      initial={{
        number: order.number,
        fulfillment: order.fulfillment,
        stage: order.stage,
        total_cents: order.total_cents,
        items: order.items.map(i => ({ name: i.name, size: i.size, qty: i.qty, price_cents: i.price_cents })),
        where:
          order.fulfillment === 'delivery'
            ? `Delivery to ${order.address ?? ''}`
            : `Pickup at ${room?.name ?? ''}`,
      }}
    />
  )
}
