import { strToU8, Zip, ZipDeflate, zipSync } from 'fflate'
import { describe, expect, it } from 'vitest'
import {
  createStoredZip,
  extractZipEntries,
  type ArchiveExtractionLimits,
} from '@/services/archive'

const TEST_LIMITS: ArchiveExtractionLimits = {
  maximumCompressedBytes: 1024 * 1024,
  maximumExpandedBytes: 1024 * 1024,
  maximumSingleEntryBytes: 512 * 1024,
  maximumManifestBytes: 64 * 1024,
  maximumEntryCount: 10,
  maximumPathLength: 100,
}

describe('bounded ZIP processing', () => {
  it('round-trips stored entries without assembling source files into one buffer', async () => {
    const archive = await createStoredZip([
      { path: 'manifest.json', blob: new Blob(['{"version":1}']) },
      { path: 'images/test/original', blob: new Blob(['image-bytes']) },
    ], 1024)
    const archiveFile = new File([archive], 'round-trip.zip', { type: 'application/zip' })

    const entries = await extractZipEntries(archiveFile, TEST_LIMITS)

    expect(await entries.get('manifest.json')?.text()).toBe('{"version":1}')
    expect(await entries.get('images/test/original')?.text()).toBe('image-bytes')
  })

  it('rejects declared expanded bytes before accepting a high-ratio entry', async () => {
    const compressedArchive = zipSync({
      'manifest.json': strToU8('x'.repeat(8_192)),
    }, { level: 9 })
    const archiveFile = new File([compressedArchive], 'oversized-expanded.zip', {
      type: 'application/zip',
    })
    const restrictiveLimits: ArchiveExtractionLimits = {
      ...TEST_LIMITS,
      maximumExpandedBytes: 1_024,
      maximumManifestBytes: 16 * 1024,
    }

    await expect(extractZipEntries(archiveFile, restrictiveLimits))
      .rejects.toThrow('解压大小超过')
  })

  it('rejects archive paths that escape the logical archive root', async () => {
    const compressedArchive = zipSync({
      '../manifest.json': strToU8('{}'),
    })
    const archiveFile = new File([compressedArchive], 'unsafe-path.zip', {
      type: 'application/zip',
    })

    await expect(extractZipEntries(archiveFile, TEST_LIMITS))
      .rejects.toThrow('无效资源路径')
  })

  it('rejects compressed streaming entries without a declared expanded size', async () => {
    const archive = await new Promise<Blob>((resolve, reject) => {
      const chunks: BlobPart[] = []
      const zip = new Zip((error, chunk, final) => {
        if (error) {
          reject(error)
          return
        }
        chunks.push(chunk)
        if (final) resolve(new Blob(chunks, { type: 'application/zip' }))
      })
      const manifestEntry = new ZipDeflate('manifest.json', { level: 9 })
      zip.add(manifestEntry)
      manifestEntry.push(strToU8('{"version":1}'), true)
      zip.end()
    })
    const archiveFile = new File([archive], 'unknown-expanded-size.zip', {
      type: 'application/zip',
    })

    await expect(extractZipEntries(archiveFile, TEST_LIMITS))
      .rejects.toThrow('未声明解压大小')
  })
})
