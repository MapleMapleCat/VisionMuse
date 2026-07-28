import { strFromU8, strToU8, unzipSync, zipSync } from 'fflate'
import type {
  AppSettings,
  GenerationTask,
  ImageRecord,
  PromptTemplate,
  StoredGenerationTask,
  StoredImageRecord,
} from '@/types'
import { downloadBlob } from './download'
import { cloneForStorage } from './clone'

interface BackupTask extends Omit<StoredGenerationTask, 'referenceImage'> {
  referenceImage?: Omit<NonNullable<StoredGenerationTask['referenceImage']>, 'blob'> & { blobPath: string }
}

interface BackupImage extends Omit<StoredImageRecord, 'originalBlob' | 'thumbnailBlob'> {
  originalBlobPath: string
  thumbnailBlobPath: string
}

interface BackupManifest {
  format: 'vision-muse-backup'
  version: 1
  exportedAt: string
  settings: AppSettings
  tasks: BackupTask[]
  images: BackupImage[]
  templates: PromptTemplate[]
}

function toStoredTask(task: GenerationTask): StoredGenerationTask {
  return {
    ...task,
    referenceImage: task.referenceImage
      ? {
          blob: task.referenceImage.blob,
          fileName: task.referenceImage.fileName,
          mimeType: task.referenceImage.mimeType,
          width: task.referenceImage.width,
          height: task.referenceImage.height,
        }
      : undefined,
  }
}

function toStoredImage(image: ImageRecord): StoredImageRecord {
  const { dataUrl: _dataUrl, ...storedImage } = image
  return storedImage
}

export async function exportBackup(options: {
  settings: AppSettings
  tasks: GenerationTask[]
  images: ImageRecord[]
  templates: PromptTemplate[]
}): Promise<void> {
  const archiveFiles: Record<string, Uint8Array> = {}
  const tasks: BackupTask[] = []
  for (const task of options.tasks.map(toStoredTask)) {
    if (!task.referenceImage) {
      const { referenceImage: _referenceImage, ...taskMetadata } = task
      tasks.push(taskMetadata)
      continue
    }
    const referencePath = `references/${task.id}`
    archiveFiles[referencePath] = new Uint8Array(await task.referenceImage.blob.arrayBuffer())
    const { blob: _blob, ...referenceMetadata } = task.referenceImage
    tasks.push({ ...task, referenceImage: { ...referenceMetadata, blobPath: referencePath } })
  }

  const images: BackupImage[] = []
  for (const image of options.images.map(toStoredImage)) {
    const originalBlobPath = `images/${image.id}/original`
    const thumbnailBlobPath = `images/${image.id}/thumbnail`
    archiveFiles[originalBlobPath] = new Uint8Array(await image.originalBlob.arrayBuffer())
    archiveFiles[thumbnailBlobPath] = new Uint8Array(await image.thumbnailBlob.arrayBuffer())
    const { originalBlob: _originalBlob, thumbnailBlob: _thumbnailBlob, ...imageMetadata } = image
    images.push({ ...imageMetadata, originalBlobPath, thumbnailBlobPath })
  }

  const manifest: BackupManifest = {
    format: 'vision-muse-backup',
    version: 1,
    exportedAt: new Date().toISOString(),
    settings: cloneForStorage(options.settings),
    tasks,
    images,
    templates: cloneForStorage(options.templates),
  }
  archiveFiles['manifest.json'] = strToU8(JSON.stringify(manifest, null, 2))
  const archive = zipSync(archiveFiles, { level: 0 })
  const date = new Date().toISOString().slice(0, 10)
  downloadBlob(new Blob([archive], { type: 'application/zip' }), `vision-muse-backup-${date}.zip`)
}

function requireArchiveFile(files: Record<string, Uint8Array>, path: string): Uint8Array {
  const file = files[path]
  if (!file) throw new Error(`备份文件缺少资源：${path}`)
  return file
}

function copyToArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const copy = new Uint8Array(bytes.byteLength)
  copy.set(bytes)
  return copy.buffer
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function validateBackupManifest(value: unknown): asserts value is BackupManifest {
  if (!isRecord(value) || value.format !== 'vision-muse-backup' || value.version !== 1) {
    throw new Error('不是受支持的 VisionMuse 备份文件')
  }
  if (!isRecord(value.settings) || !isRecord(value.settings.api) || !isRecord(value.settings.defaultParams)) {
    throw new Error('备份中的设置结构无效')
  }
  if (!Array.isArray(value.tasks) || !Array.isArray(value.images) || !Array.isArray(value.templates)) {
    throw new Error('备份缺少任务、图片或模板列表')
  }

  const taskIds = new Set<string>()
  for (const task of value.tasks) {
    if (!isRecord(task) || typeof task.id !== 'string' || typeof task.prompt !== 'string'
      || !isRecord(task.params) || !isRecord(task.apiConfig) || !Array.isArray(task.imageIds)
      || !['queued', 'running', 'done', 'failed', 'canceled'].includes(String(task.status))) {
      throw new Error('备份中包含无效任务记录')
    }
    if (taskIds.has(task.id)) throw new Error(`备份中存在重复任务 ID：${task.id}`)
    taskIds.add(task.id)
    if (task.referenceImage !== undefined) {
      if (!isRecord(task.referenceImage) || typeof task.referenceImage.blobPath !== 'string'
        || typeof task.referenceImage.mimeType !== 'string') {
        throw new Error(`任务 ${task.id} 的参考图记录无效`)
      }
    }
  }

  const imageIds = new Set<string>()
  for (const image of value.images) {
    if (!isRecord(image) || typeof image.id !== 'string' || typeof image.taskId !== 'string'
      || typeof image.prompt !== 'string' || !Array.isArray(image.tags) || !isRecord(image.params)
      || typeof image.originalBlobPath !== 'string' || typeof image.thumbnailBlobPath !== 'string'
      || typeof image.mimeType !== 'string' || typeof image.width !== 'number' || typeof image.height !== 'number') {
      throw new Error('备份中包含无效图片记录')
    }
    if (imageIds.has(image.id)) throw new Error(`备份中存在重复图片 ID：${image.id}`)
    imageIds.add(image.id)
  }

  for (const template of value.templates) {
    if (!isRecord(template) || typeof template.id !== 'string' || typeof template.title !== 'string'
      || typeof template.content !== 'string' || typeof template.category !== 'string'
      || typeof template.useCount !== 'number') {
      throw new Error('备份中包含无效提示词模板')
    }
  }
}

export async function importBackup(file: File): Promise<{
  settings: AppSettings
  tasks: StoredGenerationTask[]
  images: StoredImageRecord[]
  templates: PromptTemplate[]
}> {
  if (file.size > 1024 * 1024 * 1024) throw new Error('备份文件超过 1 GB，浏览器无法安全导入')
  const files = unzipSync(new Uint8Array(await file.arrayBuffer()))
  const expandedBytes = Object.values(files).reduce((total, bytes) => total + bytes.byteLength, 0)
  if (expandedBytes > 2 * 1024 * 1024 * 1024) throw new Error('备份解压后超过 2 GB，已停止导入')
  const manifestBytes = requireArchiveFile(files, 'manifest.json')
  const manifest: unknown = JSON.parse(strFromU8(manifestBytes))
  validateBackupManifest(manifest)

  const tasks: StoredGenerationTask[] = manifest.tasks.map(task => {
    if (!task.referenceImage) {
      const { referenceImage: _referenceImage, ...taskMetadata } = task
      return taskMetadata
    }
    const { blobPath, ...referenceMetadata } = task.referenceImage
    return {
      ...task,
      referenceImage: {
        ...referenceMetadata,
        blob: new Blob([copyToArrayBuffer(requireArchiveFile(files, blobPath))], { type: referenceMetadata.mimeType }),
      },
    }
  })
  const images: StoredImageRecord[] = manifest.images.map(image => {
    const { originalBlobPath, thumbnailBlobPath, ...imageMetadata } = image
    return {
      ...imageMetadata,
      originalBlob: new Blob([copyToArrayBuffer(requireArchiveFile(files, originalBlobPath))], { type: image.mimeType }),
      thumbnailBlob: new Blob([copyToArrayBuffer(requireArchiveFile(files, thumbnailBlobPath))], { type: 'image/webp' }),
    }
  })

  return {
    settings: manifest.settings,
    tasks,
    images,
    templates: manifest.templates,
  }
}
