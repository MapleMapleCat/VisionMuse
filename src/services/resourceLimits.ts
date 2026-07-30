export const MEBIBYTE = 1024 * 1024

export const ARCHIVE_LIMITS = {
  maximumCompressedBytes: 256 * MEBIBYTE,
  maximumExpandedBytes: 512 * MEBIBYTE,
  maximumSingleEntryBytes: 128 * MEBIBYTE,
  maximumManifestBytes: 5 * MEBIBYTE,
  maximumEntryCount: 5_000,
  maximumPathLength: 240,
} as const

export const MEDIA_LIMITS = {
  maximumReferenceImageBytes: 25 * MEBIBYTE,
  maximumReferenceImageTotalBytes: 100 * MEBIBYTE,
  maximumBase64ReferenceTotalBytes: 40 * MEBIBYTE,
  maximumImageWidth: 12_000,
  maximumImageHeight: 12_000,
  maximumImagePixels: 40_000_000,
  maximumApiResponseImageCount: 4,
  maximumApiResponseImageBytes: 25 * MEBIBYTE,
  maximumApiResponseTotalBytes: 100 * MEBIBYTE,
  maximumApiJsonBytes: 25 * MEBIBYTE,
  maximumArchiveExportBytes: 512 * MEBIBYTE,
} as const

export function formatMegabytes(byteCount: number): string {
  return `${Math.round(byteCount / MEBIBYTE)} MB`
}
