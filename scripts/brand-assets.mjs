/**
 * Generates the brand's social assets into brand/.
 *   node scripts/brand-assets.mjs
 *
 * Text is converted to vector outlines so nothing depends on a font being
 * installed wherever these are opened.
 */
import fs from 'node:fs'
import sharp from 'sharp'
import opentype from 'opentype.js'

const OUT = 'brand'
const FONTS = '/tmp/ncfonts'
const C = { bg: '#0e0b09', accent: '#e8382f', bone: '#ece9df', cigar: '#8f5a4a', umber: '#3a2620' }

fs.mkdirSync(OUT, { recursive: true })

const load = f => {
  const b = fs.readFileSync(f)
  return opentype.parse(b.buffer.slice(b.byteOffset, b.byteOffset + b.length))
}
const pinyon = load(`${FONTS}/Pinyon-Script.ttf`)
const grotesk = load(`${FONTS}/Space-Grotesk.ttf`)

const n = v => {
  if (!Number.isFinite(v)) throw new Error(`non-finite coordinate: ${v}`)
  return Math.round(v * 100) / 100
}

/**
 * Serialises path commands by hand. opentype.js 2.0.0's own toPathData()
 * emits NaN coordinates for some glyphs even when the commands themselves
 * are finite, which silently truncates the rendered text at the first bad
 * number — so it is not used.
 */
function serialise(commands) {
  let d = ''
  for (const c of commands) {
    if (c.type === 'M') d += `M${n(c.x)} ${n(c.y)}`
    else if (c.type === 'L') d += `L${n(c.x)} ${n(c.y)}`
    else if (c.type === 'C') d += `C${n(c.x1)} ${n(c.y1)} ${n(c.x2)} ${n(c.y2)} ${n(c.x)} ${n(c.y)}`
    else if (c.type === 'Q') d += `Q${n(c.x1)} ${n(c.y1)} ${n(c.x)} ${n(c.y)}`
    else if (c.type === 'Z') d += 'Z'
    else throw new Error(`unknown path command: ${c.type}`)
  }
  return d
}

/**
 * Lays text out and positions it by its real inked bounds. Script faces have
 * overhangs outside the advance width, so centring on advance width pushes
 * them off-centre and lets exit strokes leave the canvas. Glyphs with no
 * outline (spaces) are skipped when measuring — an empty bounding box reads
 * as (0,0,0,0) and would drag the bounds to the origin.
 */
function fitText(font, text, { cx, cy, maxWidth, maxHeight, fill, letterSpacing = 0 }) {
  let pen = 0
  const glyphs = []
  for (const ch of text) {
    glyphs.push(font.getPath(ch, pen, 0, 100))
    pen += font.getAdvanceWidth(ch, 100) + letterSpacing
  }

  const drawn = glyphs.filter(g => g.commands.length)
  if (!drawn.length) throw new Error(`nothing to draw for ${JSON.stringify(text)}`)

  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity
  for (const g of drawn) {
    const b = g.getBoundingBox()
    x0 = Math.min(x0, b.x1); y0 = Math.min(y0, b.y1)
    x1 = Math.max(x1, b.x2); y1 = Math.max(y1, b.y2)
  }

  const w = x1 - x0, h = y1 - y0
  const scale = Math.min(maxWidth / w, maxHeight / h)
  const d = drawn.map(g => serialise(g.commands)).join(' ')
  return {
    svg: `<g transform="translate(${n(cx - (x0 + w / 2) * scale)} ${n(cy - (y0 + h / 2) * scale)}) scale(${scale.toFixed(5)})"><path d="${d}" fill="${fill}"/></g>`,
    width: w * scale,
    height: h * scale,
  }
}

const glow = (cx, cy, r, op) =>
  `<radialGradient id="g${cx}_${cy}" cx="50%" cy="50%" r="50%">
     <stop offset="0%" stop-color="${C.accent}" stop-opacity="${op}"/>
     <stop offset="72%" stop-color="${C.accent}" stop-opacity="0"/>
   </radialGradient>
   <circle cx="${cx}" cy="${cy}" r="${r}" fill="url(#g${cx}_${cy})"/>`

async function render(svg, w, h, file) {
  // A broken coordinate truncates the artwork silently — refuse to ship one.
  // Embedded image data is excluded: a long base64 blob contains "NaN" by
  // chance, which is not a coordinate.
  const markup = svg.replace(/data:image\/png;base64,[A-Za-z0-9+/=]+/g, 'IMG')
  if (/NaN|undefined/.test(markup)) {
    throw new Error(`${file}: SVG contains an invalid coordinate`)
  }
  await sharp(Buffer.from(svg), { density: 300 }).resize(w, h).png({ compressionLevel: 9 }).toFile(`${OUT}/${file}`)
}

// The motif is 720×600 with ink at x 33–690, y 184–521. The whiskers run its
// full width, so any straight crop slices them — the whole mark is used.
const motif = await sharp('public/motif-vermilion.png')
  .extract({ left: 33, top: 184, width: 658, height: 338 })
  .toBuffer()
const MOTIF = `data:image/png;base64,${motif.toString('base64')}`
const [MW, MH] = [658, 338]
const motifAt = (cx, cy, w) =>
  `<image href="${MOTIF}" x="${n(cx - w / 2)}" y="${n(cy - (w * MH / MW) / 2)}" width="${n(w)}" height="${n(w * MH / MW)}"/>`

// ── profile · monogram — vector, so it stays sharp at any size ─────────────
{
  const t = fitText(pinyon, 'N', { cx: 540, cy: 548, maxWidth: 740, maxHeight: 620, fill: C.accent })
  await render(`<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1080" viewBox="0 0 1080 1080">
    <rect width="1080" height="1080" fill="${C.bg}"/>${glow(540, 540, 520, 0.32)}
    <g transform="rotate(-4 540 540)">${t.svg}</g></svg>`, 1080, 1080, 'profile-monogram.png')
}

// ── profile · tiger, whole motif. Instagram crops to a circle, so the roses
//    at either end are lost — kept as an alternative, not the default. ──────
await render(`<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1080" viewBox="0 0 1080 1080">
  <rect width="1080" height="1080" fill="${C.bg}"/>${glow(540, 540, 520, 0.34)}
  ${motifAt(540, 540, 1020)}</svg>`, 640, 640, 'profile-tiger.png')

// ── profile · tiger's head, scaled to fill the circular crop. The whiskers
//    run off the edge deliberately, so no hard crop line is ever visible.
//    This is the one that still reads at 34px in a comment thread. ──────────
await render(`<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1080" viewBox="0 0 1080 1080">
  <rect width="1080" height="1080" fill="${C.bg}"/>${glow(540, 540, 520, 0.34)}
  ${motifAt(540, 566, 2070)}</svg>`, 640, 640, 'profile-tiger-face.png')

// ── square post · wordmark ────────────────────────────────────────────────
{
  const w = fitText(pinyon, 'Nightcrawler', { cx: 540, cy: 495, maxWidth: 840, maxHeight: 340, fill: C.accent })
  const e = fitText(grotesk, 'FINE CANNABIS — AFTER DARK', { cx: 540, cy: 700, maxWidth: 680, maxHeight: 24, fill: C.cigar, letterSpacing: 16 })
  const d = fitText(grotesk, '21+ ONLY', { cx: 540, cy: 832, maxWidth: 160, maxHeight: 17, fill: C.umber, letterSpacing: 14 })
  await render(`<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1080" viewBox="0 0 1080 1080">
    <rect width="1080" height="1080" fill="${C.bg}"/>${glow(540, 500, 560, 0.28)}
    <g transform="rotate(-4 540 495)">${w.svg}</g>${e.svg}
    <rect x="495" y="775" width="90" height="1" fill="${C.umber}"/>${d.svg}</svg>`, 1080, 1080, 'post-wordmark.png')
}

// ── square post · tiger over wordmark ─────────────────────────────────────
{
  const w = fitText(pinyon, 'Nightcrawler', { cx: 540, cy: 790, maxWidth: 720, maxHeight: 210, fill: C.accent })
  const e = fitText(grotesk, 'AFTER DARK, EVERYTHING BLOOMS', { cx: 540, cy: 940, maxWidth: 680, maxHeight: 21, fill: C.cigar, letterSpacing: 13 })
  await render(`<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1080" viewBox="0 0 1080 1080">
    <rect width="1080" height="1080" fill="${C.bg}"/>${glow(540, 400, 470, 0.26)}
    ${motifAt(540, 395, 900)}
    <g transform="rotate(-4 540 790)">${w.svg}</g>${e.svg}</svg>`, 1080, 1080, 'post-tiger.png')
}

// ── story ─────────────────────────────────────────────────────────────────
{
  const w = fitText(pinyon, 'Nightcrawler', { cx: 540, cy: 1180, maxWidth: 820, maxHeight: 260, fill: C.accent })
  const e = fitText(grotesk, 'FINE CANNABIS — AFTER DARK', { cx: 540, cy: 1340, maxWidth: 640, maxHeight: 23, fill: C.cigar, letterSpacing: 15 })
  const u = fitText(grotesk, 'NIGHTCRAWLER.DELIVERY', { cx: 540, cy: 1665, maxWidth: 600, maxHeight: 26, fill: C.bone, letterSpacing: 13 })
  const d = fitText(grotesk, '21+ ONLY', { cx: 540, cy: 1745, maxWidth: 150, maxHeight: 16, fill: C.umber, letterSpacing: 12 })
  await render(`<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1920" viewBox="0 0 1080 1920">
    <rect width="1080" height="1920" fill="${C.bg}"/>${glow(540, 820, 600, 0.30)}
    ${motifAt(540, 810, 920)}
    <g transform="rotate(-4 540 1180)">${w.svg}</g>${e.svg}${u.svg}${d.svg}</svg>`, 1080, 1920, 'story.png')
}

for (const f of fs.readdirSync(OUT).sort()) {
  const m = await sharp(`${OUT}/${f}`).metadata()
  console.log(`  ${f.padEnd(24)} ${m.width}×${m.height}  ${(fs.statSync(`${OUT}/${f}`).size / 1024).toFixed(0)} KB`)
}
