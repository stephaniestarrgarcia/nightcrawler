import { driver } from '@/lib/db'
import { bad, guarded, json } from '@/lib/api'

export const dynamic = 'force-dynamic'

const MAX_BYTES = 6 * 1024 * 1024
const TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif']

/**
 * Product photos. The browser has already downscaled to 1200px before the
 * upload (see `resizeImage`), so this only has to check and store.
 */
export function POST(req: Request) {
  return guarded(async () => {
    const form = await req.formData()
    const productId = form.get('product_id')
    const file = form.get('file')

    if (typeof productId !== 'string' || !productId) return bad('Which product?')
    if (!(file instanceof File)) return bad('No file was attached')
    if (!TYPES.includes(file.type)) return bad('Photos must be JPEG, PNG, WebP or AVIF')
    if (file.size > MAX_BYTES) return bad('That photo is larger than 6 MB')

    const photo_url = await driver.uploadPhoto(productId, file)
    await driver.patchProduct(productId, { photo_url })
    return json({ photo_url })
  })()
}

/** Clears a product's photo and deletes the stored object behind it. */
export function DELETE(req: Request) {
  return guarded(async () => {
    const productId = new URL(req.url).searchParams.get('product_id')
    if (!productId) return bad('Which product?')
    await driver.removePhoto(productId)
    return json({ photo_url: null })
  })()
}
