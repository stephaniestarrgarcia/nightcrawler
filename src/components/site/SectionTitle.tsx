import { c, display } from '@/lib/tokens'

export function SectionTitle({
  eyebrow,
  title,
  accent = false,
}: {
  eyebrow: string
  title: string
  accent?: boolean
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div className="nc-eyebrow">{eyebrow}</div>
      <h2
        className="nc-title"
        style={{
          fontFamily: display,
          fontSize: 62,
          color: accent ? c.accent : c.bone,
          lineHeight: 1,
          transform: 'rotate(-2deg)',
          margin: 0,
          fontWeight: 400,
        }}
      >
        {title}
      </h2>
    </div>
  )
}
