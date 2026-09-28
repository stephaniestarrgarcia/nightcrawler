'use client'

import { useRef, useState } from 'react'
import { c } from '@/lib/tokens'

const MAX_EDGE = 1200

/**
 * Downscales in the browser before uploading — a 12 MP phone photo becomes a
 * ~200 KB JPEG, so staff on shop wifi aren't waiting on a full-size upload.
 */
async function resizeImage(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height))
  const width = Math.round(bitmap.width * scale)
  const height = Math.round(bitmap.height * scale)

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) return file
  ctx.drawImage(bitmap, 0, 0, width, height)
  bitmap.close()

  return new Promise<Blob>(resolve => {
    canvas.toBlob(blob => resolve(blob ?? file), 'image/jpeg', 0.85)
  })
}

export function PhotoUpload({
  productId,
  photoUrl,
  onChanged,
}: {
  productId: string
  photoUrl: string | null
  onChanged: () => void
}) {
  const input = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function upload(file: File) {
    setBusy(true)
    setError(null)
    try {
      const blob = await resizeImage(file)
      const form = new FormData()
      form.append('product_id', productId)
      form.append('file', new File([blob], 'photo.jpg', { type: blob.type || 'image/jpeg' }))
      const res = await fetch('/api/admin/upload', { method: 'POST', body: form })
      if (!res.ok) throw new Error(((await res.json()) as { error?: string }).error ?? 'Upload failed')
      onChanged()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setBusy(false)
    }
  }

  async function remove() {
    setBusy(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/upload?product_id=${encodeURIComponent(productId)}`, { method: 'DELETE' })
      if (!res.ok) throw new Error(((await res.json()) as { error?: string }).error ?? 'Could not remove that photo')
      onChanged()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not remove that photo')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div style={{ display: 'flex', gap: 12, alignItems: 'stretch' }}>
      <button
        onClick={() => input.current?.click()}
        onDragOver={e => e.preventDefault()}
        onDrop={e => {
          e.preventDefault()
          const file = e.dataTransfer.files[0]
          if (file) void upload(file)
        }}
        aria-label="Upload product photo"
        style={{
          width: 88,
          height: 88,
          flexShrink: 0,
          border: `1px ${photoUrl ? 'solid' : 'dashed'} ${c.umber}`,
          background: c.bg,
          padding: 0,
          cursor: 'pointer',
          overflow: 'hidden',
          color: c.ashDim,
          fontSize: 9,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
        }}
      >
        {photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- Storage URLs, arbitrary origin
          <img src={photoUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
        ) : (
          <span>{busy ? '…' : 'Photo'}</span>
        )}
      </button>

      <input
        ref={input}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/avif"
        hidden
        onChange={e => {
          const file = e.target.files?.[0]
          if (file) void upload(file)
          e.target.value = ''
        }}
      />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6, justifyContent: 'center' }}>
        <div style={{ fontSize: 11, color: error ? c.accent : c.ashDim, lineHeight: 1.6 }}>
          {error ?? (busy ? 'Uploading…' : 'Drop a product photo, or tap the square. It goes live straight away.')}
        </div>
        {photoUrl && !busy && (
          <button
            onClick={remove}
            className="nc-icon-btn"
            style={{
              alignSelf: 'flex-start',
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              padding: '7px 10px',
            }}
          >
            Remove photo
          </button>
        )}
      </div>
    </div>
  )
}
