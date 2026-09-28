/** "2 min ago" / "18 min ago" / "1 hr ago" — the admin queue's timestamp. */
export function relativeTime(iso: string, now: number = Date.now()): string {
  const seconds = Math.max(0, Math.floor((now - new Date(iso).getTime()) / 1000))
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes} min ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} hr${hours === 1 ? '' : 's'} ago`
  const days = Math.floor(hours / 24)
  return `${days} day${days === 1 ? '' : 's'} ago`
}
