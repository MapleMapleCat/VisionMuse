import type { ImageFormat, ReferenceImage } from '@/types'
import { MEDIA_LIMITS, formatMegabytes } from './resourceLimits'

const MAXIMUM_IMAGE_HEADER_BYTES = 1024 * 1024
const JPEG_START_OF_FRAME_MARKERS = new Set([
  0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7,
  0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf,
])

function readBigEndianUint32(bytes: Uint8Array, offset: number): number {
  return new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint32(offset, false)
}

function bytesMatch(bytes: Uint8Array, offset: number, expectedBytes: readonly number[]): boolean {
  return expectedBytes.every((expectedByte, expectedIndex) => (
    bytes[offset + expectedIndex] === expectedByte
  ))
}

function parsePngDimensions(bytes: Uint8Array): { width: number; height: number } | undefined {
  const pngSignature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]
  const ihdrChunkType = [0x49, 0x48, 0x44, 0x52]
  if (bytes.length < 24
    || !bytesMatch(bytes, 0, pngSignature)
    || readBigEndianUint32(bytes, 8) !== 13
    || !bytesMatch(bytes, 12, ihdrChunkType)) {
    return undefined
  }
  return {
    width: readBigEndianUint32(bytes, 16),
    height: readBigEndianUint32(bytes, 20),
  }
}

function parseJpegDimensions(bytes: Uint8Array): { width: number; height: number } | undefined {
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) return undefined
  let markerOffset = 2
  while (markerOffset + 4 <= bytes.length) {
    while (markerOffset < bytes.length && bytes[markerOffset] !== 0xff) markerOffset += 1
    while (markerOffset < bytes.length && bytes[markerOffset] === 0xff) markerOffset += 1
    if (markerOffset >= bytes.length) break

    const marker = bytes[markerOffset]
    markerOffset += 1
    if (marker === 0xd8 || marker === 0xd9 || (marker >= 0xd0 && marker <= 0xd7)) continue
    if (markerOffset + 2 > bytes.length) break
    const segmentLength = (bytes[markerOffset] << 8) | bytes[markerOffset + 1]
    if (segmentLength < 2 || markerOffset + segmentLength > bytes.length) break

    if (JPEG_START_OF_FRAME_MARKERS.has(marker) && segmentLength >= 7) {
      return {
        height: (bytes[markerOffset + 3] << 8) | bytes[markerOffset + 4],
        width: (bytes[markerOffset + 5] << 8) | bytes[markerOffset + 6],
      }
    }
    markerOffset += segmentLength
  }
  return undefined
}

function parseWebpDimensions(bytes: Uint8Array): { width: number; height: number } | undefined {
  const riffSignature = [0x52, 0x49, 0x46, 0x46]
  const webpSignature = [0x57, 0x45, 0x42, 0x50]
  if (bytes.length < 30
    || !bytesMatch(bytes, 0, riffSignature)
    || !bytesMatch(bytes, 8, webpSignature)) {
    return undefined
  }

  const chunkType = String.fromCharCode(...bytes.subarray(12, 16))
  if (chunkType === 'VP8X') {
    return {
      width: 1 + bytes[24] + (bytes[25] << 8) + (bytes[26] << 16),
      height: 1 + bytes[27] + (bytes[28] << 8) + (bytes[29] << 16),
    }
  }
  if (chunkType === 'VP8 ' && bytesMatch(bytes, 23, [0x9d, 0x01, 0x2a])) {
    return {
      width: (bytes[26] | (bytes[27] << 8)) & 0x3fff,
      height: (bytes[28] | (bytes[29] << 8)) & 0x3fff,
    }
  }
  if (chunkType === 'VP8L' && bytes[20] === 0x2f) {
    return {
      width: 1 + bytes[21] + ((bytes[22] & 0x3f) << 8),
      height: 1 + (bytes[22] >> 6) + (bytes[23] << 2) + ((bytes[24] & 0x0f) << 10),
    }
  }
  return undefined
}

function validateImageDimensions(dimensions: { width: number; height: number }): void {
  const dimensionsAreInvalid = !Number.isInteger(dimensions.width)
    || !Number.isInteger(dimensions.height)
    || dimensions.width <= 0
    || dimensions.height <= 0
    || dimensions.width > MEDIA_LIMITS.maximumImageWidth
    || dimensions.height > MEDIA_LIMITS.maximumImageHeight
    || dimensions.width * dimensions.height > MEDIA_LIMITS.maximumImagePixels
  if (dimensionsAreInvalid) {
    throw new Error(
      `图片尺寸超过安全上限：最大 ${MEDIA_LIMITS.maximumImageWidth}×${MEDIA_LIMITS.maximumImageHeight}，且不超过 ${MEDIA_LIMITS.maximumImagePixels.toLocaleString()} 像素`,
    )
  }
}

export async function validateImageResource(blob: Blob): Promise<{ width: number; height: number }> {
  const headerBytes = new Uint8Array(await blob.slice(
    0,
    Math.min(blob.size, MAXIMUM_IMAGE_HEADER_BYTES),
  ).arrayBuffer())
  const dimensions = parsePngDimensions(headerBytes)
    ?? parseJpegDimensions(headerBytes)
    ?? parseWebpDimensions(headerBytes)
  if (!dimensions) {
    throw new Error('无法安全读取图片头，仅支持有效的 PNG、JPEG 或 WebP 图片')
  }
  validateImageDimensions(dimensions)
  return dimensions
}

export function getFileExtension(mimeType: string, fallback: ImageFormat = 'png'): ImageFormat {
  if (mimeType.includes('webp')) return 'webp'
  if (mimeType.includes('jpeg') || mimeType.includes('jpg')) return 'jpeg'
  if (mimeType.includes('png')) return 'png'
  return fallback
}

export function getMimeTypeForFormat(format: ImageFormat): string {
  if (format === 'jpeg') return 'image/jpeg'
  return `image/${format}`
}

export async function readImageDimensions(blob: Blob): Promise<{ width: number; height: number }> {
  await validateImageResource(blob)
  const objectUrl = URL.createObjectURL(blob)
  try {
    const decodedDimensions = await new Promise<{ width: number; height: number }>((resolve, reject) => {
      const image = new Image()
      image.onload = () => resolve({ width: image.naturalWidth, height: image.naturalHeight })
      image.onerror = () => reject(new Error('无法读取图片尺寸，请确认文件是有效图片'))
      image.src = objectUrl
    })
    validateImageDimensions(decodedDimensions)
    return decodedDimensions
  } finally {
    URL.revokeObjectURL(objectUrl)
  }
}

export async function createThumbnail(blob: Blob, maximumSide = 640): Promise<Blob> {
  const dimensions = await readImageDimensions(blob)
  if (Math.max(dimensions.width, dimensions.height) <= maximumSide && blob.type === 'image/webp') return blob

  const scale = Math.min(1, maximumSide / Math.max(dimensions.width, dimensions.height))
  const targetWidth = Math.max(1, Math.round(dimensions.width * scale))
  const targetHeight = Math.max(1, Math.round(dimensions.height * scale))
  const objectUrl = URL.createObjectURL(blob)

  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const candidate = new Image()
      candidate.onload = () => resolve(candidate)
      candidate.onerror = () => reject(new Error('无法生成图片缩略图'))
      candidate.src = objectUrl
    })
    const canvas = document.createElement('canvas')
    canvas.width = targetWidth
    canvas.height = targetHeight
    const context = canvas.getContext('2d')
    if (!context) throw new Error('当前浏览器不支持图片缩略图处理')
    context.drawImage(image, 0, 0, targetWidth, targetHeight)
    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(result => result ? resolve(result) : reject(new Error('缩略图编码失败')), 'image/webp', 0.82)
    })
  } finally {
    URL.revokeObjectURL(objectUrl)
  }
}

export async function createReferenceImage(file: File): Promise<ReferenceImage> {
  if (!file.type.startsWith('image/')) throw new Error('请选择图片文件')
  if (file.size > MEDIA_LIMITS.maximumReferenceImageBytes) {
    throw new Error(`参考图不能超过 ${formatMegabytes(MEDIA_LIMITS.maximumReferenceImageBytes)}`)
  }
  const dimensions = await readImageDimensions(file)
  return {
    blob: file,
    previewUrl: URL.createObjectURL(file),
    fileName: file.name || `reference-${Date.now()}`,
    mimeType: file.type || 'application/octet-stream',
    ...dimensions,
  }
}

export async function blobToBase64(blob: Blob): Promise<string> {
  const buffer = await blob.arrayBuffer()
  const bytes = new Uint8Array(buffer)
  let binary = ''
  const chunkSize = 32_768
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize))
  }
  return btoa(binary)
}

export function base64ToBlob(base64Value: string, mimeType: string): Blob {
  const dataUrlMatch = base64Value.match(/^data:([^;,]+)?(?:;base64)?,(.*)$/s)
  const normalizedMimeType = dataUrlMatch?.[1] || mimeType
  const normalizedBase64 = dataUrlMatch?.[2] || base64Value
  const binary = atob(normalizedBase64.replace(/\s/g, ''))
  const bytes = new Uint8Array(binary.length)
  for (let index = 0; index < binary.length; index++) bytes[index] = binary.charCodeAt(index)
  return new Blob([bytes], { type: normalizedMimeType })
}

export function revokeReferenceImage(referenceImage?: ReferenceImage): void {
  if (referenceImage?.previewUrl.startsWith('blob:')) URL.revokeObjectURL(referenceImage.previewUrl)
}
