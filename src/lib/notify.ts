import 'server-only'
import type { Order, Stage } from './db/types'
import { formatPrice } from './money'
import { stageLabels } from './stages'
import { toE164 } from './validate'
import { siteUrl, trackerUrl } from './site'

/**
 * SMS via Twilio, email via Resend. With neither configured every message is
 * logged instead of sent, so local development never needs credentials and
 * never silently swallows a notification.
 */

function trackerLink(order: Order): string {
  return trackerUrl(siteUrl('http://localhost:3000'), order.number, order.phone)
}

async function sendSms(to: string, body: string): Promise<void> {
  const sid = process.env.TWILIO_ACCOUNT_SID
  const auth = process.env.TWILIO_AUTH_TOKEN
  const from = process.env.TWILIO_FROM
  if (!sid || !auth || !from) {
    console.info(`[notify:sms → ${to}] ${body}`)
    return
  }
  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${sid}:${auth}`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({ To: toE164(to), From: from, Body: body }),
  })
  if (!res.ok) console.error(`[notify:sms] Twilio ${res.status}: ${await res.text()}`)
}

async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  const key = process.env.RESEND_API_KEY
  const from = process.env.RESEND_FROM
  if (!key || !from) {
    console.info(`[notify:email → ${to}] ${subject}`)
    return
  }
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from, to, subject, html }),
  })
  if (!res.ok) console.error(`[notify:email] Resend ${res.status}: ${await res.text()}`)
}

/** Notifications must never take an order down with them. */
function safely(work: Promise<unknown>): void {
  void work.catch(err => console.error('[notify] delivery failed', err))
}

export function notifyOrderPlaced(order: Order, roomName: string): void {
  const link = trackerLink(order)
  const where = order.fulfillment === 'delivery' ? `Delivery from ${roomName}` : `Pickup at ${roomName}`
  safely(sendSms(
    order.phone,
    `Nightcrawler — order ${order.number} received. ${where}. ${formatPrice(order.total_cents)} due on arrival. Track it: ${link}`,
  ))
  if (order.email) {
    const rows = order.items
      .map(i => `<tr><td style="padding:6px 0;color:#b5aea2">${i.qty} × ${i.name}</td><td style="padding:6px 0;text-align:right;color:#ece9df">${formatPrice(i.price_cents * i.qty)}</td></tr>`)
      .join('')
    safely(sendEmail(
      order.email,
      `Nightcrawler — order ${order.number}`,
      `<div style="background:#0e0b09;padding:32px;font-family:'Space Grotesk',Helvetica,Arial,sans-serif">
        <div style="font-family:'Pinyon Script',cursive;font-size:40px;color:#e8382f">Nightcrawler</div>
        <p style="color:#b5aea2;font-size:14px;line-height:1.7">${where}. No payment online — ${formatPrice(order.total_cents)} is due on arrival, and ID is required. 21+ only.</p>
        <table style="width:100%;border-collapse:collapse;font-size:14px">${rows}</table>
        <p><a href="${link}" style="color:#e8382f">Track order ${order.number} →</a></p>
      </div>`,
    ))
  }
}

export function notifyStageChanged(order: Order, stage: Stage): void {
  if (stage === 0) return
  const label = stageLabels(order.fulfillment)[stage]
  safely(sendSms(order.phone, `Nightcrawler — order ${order.number}: ${label}. ${trackerLink(order)}`))
}
