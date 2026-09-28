import { c } from '@/lib/tokens'

/**
 * A product photo, or the drop-zone placeholder until the client supplies one.
 * The placeholder is deliberately unmistakable — an empty slot should read as
 * "photo pending", never as a design choice.
 */
export function Photo({ url, alt, hint }: { url: string | null; alt: string; hint: string }) {
  if (url) {
    // eslint-disable-next-line @next/next/no-img-element -- photos come from Storage at arbitrary sizes
    return <img src={url} alt={alt} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
  }
  return (
    <div
      aria-label={hint}
      role="img"
      style={{
        width: '100%',
        height: '100%',
        background: c.bg,
        border: `1px dashed ${c.umber}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 12,
        textAlign: 'center',
        fontSize: 10,
        letterSpacing: '0.18em',
        textTransform: 'uppercase',
        color: c.ashDim,
        lineHeight: 1.6,
      }}
    >
      {hint}
    </div>
  )
}
