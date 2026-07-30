import {
  AsyncUnzipInflate,
  Unzip,
  UnzipInflate,
  Zip,
  ZipPassThrough,
  type UnzipFile,
} from 'fflate'
import { ARCHIVE_LIMITS, formatMegabytes } from './resourceLimits'

const ARCHIVE_CHUNK_BYTES = 256 * 1024

export interface ArchiveEntrySource {
  path: string
  blob: Blob
}

export interface ArchiveExtractionLimits {
  maximumCompressedBytes: number
  maximumExpandedBytes: number
  maximumSingleEntryBytes: number
  maximumManifestBytes: number
  maximumEntryCount: number
  maximumPathLength: number
}

function validateArchivePath(path: string, maximumPathLength: number): void {
  const pathSegments = path.replace(/\\/g, '/').split('/')
  const pathEscapesArchiveRoot = path.startsWith('/')
    || pathSegments.some(pathSegment => pathSegment === '..')
  if (!path || path.length > maximumPathLength || path.includes('\0') || pathEscapesArchiveRoot) {
    throw new Error(`压缩包包含无效资源路径：${path.slice(0, maximumPathLength)}`)
  }
}

async function pushBlobIntoZipEntry(blob: Blob, zipEntry: ZipPassThrough): Promise<void> {
  if (blob.size === 0) {
    zipEntry.push(new Uint8Array(), true)
    return
  }

  for (let offset = 0; offset < blob.size; offset += ARCHIVE_CHUNK_BYTES) {
    const endOffset = Math.min(blob.size, offset + ARCHIVE_CHUNK_BYTES)
    const chunk = new Uint8Array(await blob.slice(offset, endOffset).arrayBuffer())
    zipEntry.push(chunk, endOffset === blob.size)
  }
}

export function createStoredZip(
  sources: ArchiveEntrySource[],
  maximumSourceBytes: number,
): Promise<Blob> {
  if (sources.length > ARCHIVE_LIMITS.maximumEntryCount) {
    throw new Error(`压缩包条目超过 ${ARCHIVE_LIMITS.maximumEntryCount} 个，请减少导出内容`)
  }

  const seenPaths = new Set<string>()
  let totalSourceBytes = 0
  for (const source of sources) {
    validateArchivePath(source.path, ARCHIVE_LIMITS.maximumPathLength)
    if (seenPaths.has(source.path)) throw new Error(`压缩包资源路径重复：${source.path}`)
    seenPaths.add(source.path)
    if (source.blob.size > ARCHIVE_LIMITS.maximumSingleEntryBytes) {
      throw new Error(`资源 ${source.path} 超过单文件上限 ${formatMegabytes(ARCHIVE_LIMITS.maximumSingleEntryBytes)}`)
    }
    if (source.path === 'manifest.json' && source.blob.size > ARCHIVE_LIMITS.maximumManifestBytes) {
      throw new Error(`备份清单超过 ${formatMegabytes(ARCHIVE_LIMITS.maximumManifestBytes)} 上限`)
    }
    totalSourceBytes += source.blob.size
    if (totalSourceBytes > maximumSourceBytes) {
      throw new Error(`待压缩内容超过 ${formatMegabytes(maximumSourceBytes)}，请减少本次导出内容`)
    }
  }

  return new Promise<Blob>((resolve, reject) => {
    const archiveChunks: BlobPart[] = []
    let archiveBytes = 0
    let settled = false
    const zip = new Zip((error, chunk, final) => {
      if (settled) return
      if (error) {
        settled = true
        reject(error)
        return
      }
      archiveBytes += chunk.byteLength
      if (archiveBytes > maximumSourceBytes + ARCHIVE_LIMITS.maximumManifestBytes) {
        settled = true
        zip.terminate()
        reject(new Error('压缩包输出超过浏览器安全预算'))
        return
      }
      archiveChunks.push(chunk)
      if (final) {
        settled = true
        resolve(new Blob(archiveChunks, { type: 'application/zip' }))
      }
    })

    void (async () => {
      try {
        for (const source of sources) {
          const zipEntry = new ZipPassThrough(source.path)
          zip.add(zipEntry)
          await pushBlobIntoZipEntry(source.blob, zipEntry)
        }
        zip.end()
      } catch (error) {
        if (settled) return
        settled = true
        zip.terminate()
        reject(error instanceof Error ? error : new Error(String(error)))
      }
    })()
  })
}

export function extractZipEntries(
  archiveFile: File,
  limits: ArchiveExtractionLimits = ARCHIVE_LIMITS,
): Promise<Map<string, Blob>> {
  if (archiveFile.size <= 0) throw new Error('备份文件为空')
  if (archiveFile.size > limits.maximumCompressedBytes) {
    throw new Error(`备份文件超过 ${formatMegabytes(limits.maximumCompressedBytes)}，浏览器无法安全导入`)
  }

  return new Promise<Map<string, Blob>>((resolve, reject) => {
    const extractedEntries = new Map<string, Blob>()
    const discoveredPaths = new Set<string>()
    const activeFiles = new Set<UnzipFile>()
    let discoveredEntryCount = 0
    let completedEntryCount = 0
    let declaredExpandedBytes = 0
    let actualExpandedBytes = 0
    let inputIsComplete = false
    let settled = false

    const terminateActiveFiles = () => {
      for (const activeFile of activeFiles) activeFile.terminate()
      activeFiles.clear()
    }

    const fail = (error: unknown) => {
      if (settled) return
      settled = true
      terminateActiveFiles()
      reject(error instanceof Error ? error : new Error(String(error)))
    }

    const finishIfComplete = () => {
      if (settled || !inputIsComplete || completedEntryCount !== discoveredEntryCount) return
      settled = true
      resolve(extractedEntries)
    }

    const unzipper = new Unzip((archiveEntry) => {
      if (settled) {
        archiveEntry.terminate()
        return
      }
      try {
        discoveredEntryCount += 1
        if (discoveredEntryCount > limits.maximumEntryCount) {
          throw new Error(`备份条目超过 ${limits.maximumEntryCount} 个，已停止导入`)
        }
        validateArchivePath(archiveEntry.name, limits.maximumPathLength)
        if (discoveredPaths.has(archiveEntry.name)) {
          throw new Error(`备份中存在重复资源路径：${archiveEntry.name}`)
        }
        discoveredPaths.add(archiveEntry.name)

        const declaredEntryBytes = archiveEntry.originalSize ?? 0
        const compressedEntryHasUnknownExpandedSize = archiveEntry.compression !== 0
          && archiveEntry.originalSize === undefined
        if (compressedEntryHasUnknownExpandedSize) {
          throw new Error(`备份资源 ${archiveEntry.name} 未声明解压大小，无法安全导入`)
        }
        if (declaredEntryBytes > limits.maximumSingleEntryBytes) {
          throw new Error(`备份资源 ${archiveEntry.name} 超过单文件上限`)
        }
        if (archiveEntry.name === 'manifest.json' && declaredEntryBytes > limits.maximumManifestBytes) {
          throw new Error('备份清单过大，已停止导入')
        }
        declaredExpandedBytes += declaredEntryBytes
        if (declaredExpandedBytes > limits.maximumExpandedBytes) {
          throw new Error(`备份声明的解压大小超过 ${formatMegabytes(limits.maximumExpandedBytes)}`)
        }

        activeFiles.add(archiveEntry)
        const entryChunks: BlobPart[] = []
        let entryBytes = 0
        archiveEntry.ondata = (error, chunk, final) => {
          if (settled) {
            archiveEntry.terminate()
            return
          }
          if (error) {
            fail(error)
            return
          }

          entryBytes += chunk.byteLength
          actualExpandedBytes += chunk.byteLength
          const entryLimit = archiveEntry.name === 'manifest.json'
            ? limits.maximumManifestBytes
            : limits.maximumSingleEntryBytes
          if (entryBytes > entryLimit) {
            fail(new Error(`备份资源 ${archiveEntry.name} 解压后超过允许大小`))
            return
          }
          if (actualExpandedBytes > limits.maximumExpandedBytes) {
            fail(new Error(`备份解压后超过 ${formatMegabytes(limits.maximumExpandedBytes)}，已停止导入`))
            return
          }

          if (chunk.byteLength) entryChunks.push(chunk)
          if (!final) return
          activeFiles.delete(archiveEntry)
          if (!archiveEntry.name.endsWith('/')) {
            extractedEntries.set(archiveEntry.name, new Blob(entryChunks))
          }
          completedEntryCount += 1
          finishIfComplete()
        }
        archiveEntry.start()
      } catch (error) {
        fail(error)
      }
    })

    if (typeof Worker === 'undefined') unzipper.register(UnzipInflate)
    else unzipper.register(AsyncUnzipInflate)

    void (async () => {
      try {
        for (let offset = 0; offset < archiveFile.size; offset += ARCHIVE_CHUNK_BYTES) {
          if (settled) return
          const endOffset = Math.min(archiveFile.size, offset + ARCHIVE_CHUNK_BYTES)
          const chunk = new Uint8Array(await archiveFile.slice(offset, endOffset).arrayBuffer())
          if (settled) return
          unzipper.push(chunk, endOffset === archiveFile.size)
        }
        inputIsComplete = true
        finishIfComplete()
      } catch (error) {
        fail(error)
      }
    })()
  })
}
