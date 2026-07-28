import type { ImageFormat, ReferenceImage } from '@/types'

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
  const objectUrl = URL.createObjectURL(blob)
  try {
    return await new Promise((resolve, reject) => {
      const image = new Image()
      image.onload = () => resolve({ width: image.naturalWidth, height: image.naturalHeight })
      image.onerror = () => reject(new Error('无法读取图片尺寸，请确认文件是有效图片'))
      image.src = objectUrl
    })
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
  const maximumBytes = 25 * 1024 * 1024
  if (file.size > maximumBytes) throw new Error('参考图不能超过 25 MB')
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
