import { c, display } from '@/lib/tokens'

export function Hero({ roomName }: { roomName: string }) {
  return (
    <header
      id="top"
      style={{
        position: 'relative',
        height: 640,
        maxHeight: '100vh',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: `linear-gradient(180deg, ${c.bg} 0%, ${c.card} 55%, ${c.bg} 100%)`,
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(ellipse 55% 40% at 50% 52%, rgba(232,56,47,0.16), transparent 70%)',
          animation: 'nc-glow 5s ease-in-out infinite',
        }}
      />
      {/* Ghost wordmark marquee — 200% wide so the loop is seamless. */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          top: '54%',
          left: 0,
          width: '200%',
          display: 'flex',
          whiteSpace: 'nowrap',
          animation: 'nc-drift 40s linear infinite',
          opacity: 0.08,
          pointerEvents: 'none',
        }}
      >
        <div style={{ fontFamily: display, fontSize: 320, color: c.accent, lineHeight: 0 }}>
          Nightcrawler Nightcrawler
        </div>
      </div>

      <div
        className="nc-rise"
        style={{
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 22,
          padding: '0 20px',
          textAlign: 'center',
          animationDelay: '0.15s',
        }}
      >
        <div style={{ fontSize: 11, color: c.cigar, letterSpacing: '0.5em', textTransform: 'uppercase', paddingLeft: '0.5em' }}>
          small batch · {roomName}
        </div>
        <h1
          className="nc-display nc-hero-word"
          style={{
            fontFamily: display,
            fontSize: 128,
            transform: 'rotate(-4deg)',
            whiteSpace: 'nowrap',
            textShadow: '0 0 60px rgba(232,56,47,0.35)',
            margin: 0,
            fontWeight: 400,
          }}
        >
          Nightcrawler
        </h1>
        <div style={{ fontSize: 13, color: c.boneMuted, letterSpacing: '0.35em', textTransform: 'uppercase', paddingLeft: '0.35em' }}>
          after dark, everything blooms
        </div>
        <a
          href="#shop"
          style={{
            marginTop: 14,
            background: c.accent,
            color: c.card,
            fontSize: 13,
            fontWeight: 700,
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
            padding: '16px 44px',
          }}
        >
          Shop the menu
        </a>
      </div>
    </header>
  )
}
