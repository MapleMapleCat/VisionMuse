import { zipSync, strToU8 } from 'fflate'
import type { ImageRecord } from '@/types'

export function downloadBlob(blob: Blob, fileName: string): void {
  const objectUrl = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = objectUrl
  anchor.download = fileName
  anchor.click()
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1_000)
}

function sanitizeFileName(value: string): string {
  return value.replace(/[\\/:*?"<>|\u0000-\u001f]/g, '-').replace(/\s+/g, ' ').trim().slice(0, 80) || 'image'
}

export function getImageFileName(image: ImageRecord, index?: number): string {
  const suffix = index === undefined ? '' : `-${String(index + 1).padStart(2, '0')}`
  return `${sanitizeFileName(image.prompt)}${suffix}.${image.fileExtension === 'jpeg' ? 'jpg' : image.fileExtension}`
}

export async function downloadImagesAsZip(images: ImageRecord[], archiveName = 'vision-muse-images.zip'): Promise<void> {
  const files: Record<string, Uint8Array> = {}
  for (const [index, image] of images.entries()) {
    files[getImageFileName(image, index)] = new Uint8Array(await image.originalBlob.arrayBuffer())
  }
  const archive = zipSync(files, { level: 0 })
  downloadBlob(new Blob([archive], { type: 'application/zip' }), archiveName)
}

export function createJsonFile(value: unknown): Uint8Array {
  return strToU8(JSON.stringify(value, null, 2))
}
