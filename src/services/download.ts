import type { ImageRecord } from '@/types'
import { createStoredZip } from './archive'
import { MEDIA_LIMITS } from './resourceLimits'

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
  const archiveSources = images.map((image, index) => ({
    path: getImageFileName(image, index),
    blob: image.originalBlob,
  }))
  const archive = await createStoredZip(
    archiveSources,
    MEDIA_LIMITS.maximumArchiveExportBytes,
  )
  downloadBlob(archive, archiveName)
}
