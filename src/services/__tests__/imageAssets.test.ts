import { describe, expect, it } from 'vitest'
import { MEDIA_LIMITS } from '@/services/resourceLimits'
import { validateImageResource } from '@/services/imageAssets'

function createPngHeader(width: number, height: number): Blob {
  const bytes = new Uint8Array(24)
  bytes.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], 0)
  const view = new DataView(bytes.buffer)
  view.setUint32(8, 13, false)
  bytes.set([0x49, 0x48, 0x44, 0x52], 12)
  view.setUint32(16, width, false)
  view.setUint32(20, height, false)
  return new Blob([bytes], { type: 'image/png' })
}

describe('safe image header validation', () => {
  it('reads supported image dimensions without decoding pixels', async () => {
    await expect(validateImageResource(createPngHeader(4096, 2304)))
      .resolves.toEqual({ width: 4096, height: 2304 })
  })

  it('rejects compressed images whose declared pixel surface is unsafe', async () => {
    const oversizedImage = createPngHeader(
      MEDIA_LIMITS.maximumImageWidth,
      MEDIA_LIMITS.maximumImageHeight,
    )

    await expect(validateImageResource(oversizedImage)).rejects.toThrow('图片尺寸超过安全上限')
  })

  it('rejects unsupported or malformed image headers', async () => {
    await expect(validateImageResource(new Blob(['not-an-image'], { type: 'image/png' })))
      .rejects.toThrow('仅支持有效的 PNG、JPEG 或 WebP')
  })
})
