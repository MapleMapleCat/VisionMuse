import type {
  AppSettings,
  GenerationTask,
  ImageRecord,
  PromptModule,
  PromptTemplate,
  StoredGenerationTask,
  StoredImageRecord,
  StoredReferenceImage,
} from '@/types'
import { MAX_REFERENCE_IMAGE_COUNT, PROMPT_MODULE_CATEGORY_KEYS } from '@/types'
import { DEFAULT_PROMPT_MODULES } from '@/assets/prompt-modules'
import { downloadBlob } from './download'
import { cloneForStorage } from './clone'
import { normalizePromptTemplates } from './promptTemplates'
import { validateImageResource } from './imageAssets'
import { createStoredZip, extractZipEntries, type ArchiveEntrySource } from './archive'
import { MEDIA_LIMITS } from './resourceLimits'
import {
  parseApiRequestConfig,
  parseAppSettings,
  parseGenerationParameters,
} from './settingsValidation'

interface BackupReferenceImage extends Omit<StoredReferenceImage, 'blob'> {
  blobPath: string
}

interface BackupTask extends Omit<StoredGenerationTask, 'referenceImages' | 'referenceImage'> {
  referenceImages?: BackupReferenceImage[]
  /** Supported when reading backups exported before multi-reference tasks. */
  referenceImage?: BackupReferenceImage
}

interface BackupImage extends Omit<StoredImageRecord, 'originalBlob' | 'thumbnailBlob'> {
  originalBlobPath: string
  thumbnailBlobPath: string
}

interface BackupManifestBase {
  format: 'vision-muse-backup'
  exportedAt: string
  settings: AppSettings
  tasks: BackupTask[]
  images: BackupImage[]
  templates: unknown[]
}

interface BackupManifestV1 extends BackupManifestBase {
  version: 1
}

interface BackupManifestV2 extends BackupManifestBase {
  version: 2
  promptModules: PromptModule[]
}

type BackupManifest = BackupManifestV1 | BackupManifestV2

function toStoredTask(task: GenerationTask): StoredGenerationTask {
  return {
    ...task,
    referenceImages: task.referenceImages.map(referenceImage => ({
      blob: referenceImage.blob,
      fileName: referenceImage.fileName,
      mimeType: referenceImage.mimeType,
      width: referenceImage.width,
      height: referenceImage.height,
    })),
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
  promptModules: PromptModule[]
}): Promise<void> {
  const archiveSources: ArchiveEntrySource[] = []
  const tasks: BackupTask[] = []
  for (const task of options.tasks.map(toStoredTask)) {
    if (!task.referenceImages?.length) {
      const {
        referenceImage: _legacyReferenceImage,
        referenceImages: _referenceImages,
        ...taskMetadata
      } = task
      tasks.push(taskMetadata)
      continue
    }

    const referenceImages: BackupReferenceImage[] = []
    for (const [referenceIndex, referenceImage] of task.referenceImages.entries()) {
      const referencePath = `references/${task.id}/${referenceIndex}`
      archiveSources.push({ path: referencePath, blob: referenceImage.blob })
      const { blob: _blob, ...referenceMetadata } = referenceImage
      referenceImages.push({ ...referenceMetadata, blobPath: referencePath })
    }
    const {
      referenceImage: _legacyReferenceImage,
      referenceImages: _storedReferenceImages,
      ...taskMetadata
    } = task
    tasks.push({ ...taskMetadata, referenceImages })
  }

  const images: BackupImage[] = []
  for (const image of options.images.map(toStoredImage)) {
    const originalBlobPath = `images/${image.id}/original`
    const thumbnailBlobPath = `images/${image.id}/thumbnail`
    archiveSources.push({ path: originalBlobPath, blob: image.originalBlob })
    archiveSources.push({ path: thumbnailBlobPath, blob: image.thumbnailBlob })
    const { originalBlob: _originalBlob, thumbnailBlob: _thumbnailBlob, ...imageMetadata } = image
    images.push({ ...imageMetadata, originalBlobPath, thumbnailBlobPath })
  }

  const manifest: BackupManifestV2 = {
    format: 'vision-muse-backup',
    version: 2,
    exportedAt: new Date().toISOString(),
    settings: cloneForStorage(options.settings),
    tasks,
    images,
    templates: cloneForStorage(options.templates),
    promptModules: cloneForStorage(options.promptModules),
  }
  archiveSources.push({
    path: 'manifest.json',
    blob: new Blob([JSON.stringify(manifest, null, 2)], { type: 'application/json' }),
  })
  const archive = await createStoredZip(
    archiveSources,
    MEDIA_LIMITS.maximumArchiveExportBytes,
  )
  const date = new Date().toISOString().slice(0, 10)
  downloadBlob(archive, `vision-muse-backup-${date}.zip`)
}

function requireArchiveFile(files: Map<string, Blob>, path: string): Blob {
  const file = files.get(path)
  if (!file) throw new Error(`备份文件缺少资源：${path}`)
  return file
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function validateBackupManifest(value: unknown): asserts value is BackupManifest {
  if (!isRecord(value) || value.format !== 'vision-muse-backup'
    || (value.version !== 1 && value.version !== 2)) {
    throw new Error('不是受支持的 VisionMuse 备份文件')
  }
  if (!isRecord(value.settings)) {
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
    const taskReferenceImages = task.referenceImages !== undefined
      ? task.referenceImages
      : task.referenceImage !== undefined ? [task.referenceImage] : []
    if (!Array.isArray(taskReferenceImages)) {
      throw new Error(`任务 ${task.id} 的参考图列表无效`)
    }
    if (taskReferenceImages.length > MAX_REFERENCE_IMAGE_COUNT) {
      throw new Error(`任务 ${task.id} 的参考图超过 ${MAX_REFERENCE_IMAGE_COUNT} 张`)
    }
    for (const referenceImage of taskReferenceImages) {
      if (!isRecord(referenceImage) || typeof referenceImage.blobPath !== 'string'
        || typeof referenceImage.mimeType !== 'string') {
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
    const isLegacyTemplate = isRecord(template)
      && typeof template.id === 'string'
      && typeof template.title === 'string'
      && typeof template.content === 'string'
      && typeof template.category === 'string'
      && typeof template.useCount === 'number'
    const isCurrentTemplate = isRecord(template)
      && typeof template.id === 'string'
      && typeof template.title === 'string'
      && typeof template.summary === 'string'
      && typeof template.content === 'string'
      && (typeof template.categoryId === 'string' || template.categoryId === null)
      && (typeof template.medium === 'string' || template.medium === null)
      && Array.isArray(template.styleIds)
      && Array.isArray(template.variables)
      && ['builtin', 'user'].includes(String(template.origin))
      && typeof template.useCount === 'number'
      && typeof template.schemaVersion === 'number'
    if (!isLegacyTemplate && !isCurrentTemplate) {
      throw new Error('备份中包含无效提示词模板')
    }
  }

  if (value.version === 2) {
    if (!Array.isArray(value.promptModules)) throw new Error('备份缺少提示词模块列表')
    for (const promptModule of value.promptModules) {
      if (!isRecord(promptModule) || typeof promptModule.id !== 'string'
        || typeof promptModule.title !== 'string' || typeof promptModule.content !== 'string'
        || !PROMPT_MODULE_CATEGORY_KEYS.some(category => category === promptModule.category)
        || typeof promptModule.useCount !== 'number' || typeof promptModule.sortOrder !== 'number') {
        throw new Error('备份中包含无效提示词模块')
      }
    }
  }
}

export async function importBackup(file: File): Promise<{
  settings: AppSettings
  tasks: StoredGenerationTask[]
  images: StoredImageRecord[]
  templates: PromptTemplate[]
  promptModules: PromptModule[]
}> {
  const files = await extractZipEntries(file)
  const manifestFile = requireArchiveFile(files, 'manifest.json')
  const manifest: unknown = JSON.parse(await manifestFile.text())
  validateBackupManifest(manifest)

  const validatedImagePaths = new Map<string, Promise<{ width: number; height: number }>>()
  function validateArchivedImage(path: string): Promise<{ width: number; height: number }> {
    const existingValidation = validatedImagePaths.get(path)
    if (existingValidation) return existingValidation
    const validation = validateImageResource(requireArchiveFile(files, path))
    validatedImagePaths.set(path, validation)
    return validation
  }

  const tasks: StoredGenerationTask[] = await Promise.all(manifest.tasks.map(async task => {
    const {
      referenceImage: legacyReferenceImage,
      referenceImages: archivedReferenceImages,
      ...taskMetadata
    } = task
    const normalizedReferenceImages = archivedReferenceImages?.length
      ? archivedReferenceImages
      : legacyReferenceImage ? [legacyReferenceImage] : []

    return {
      ...taskMetadata,
      params: parseGenerationParameters(task.params, `任务 ${task.id} 的生成参数`),
      apiConfig: parseApiRequestConfig(task.apiConfig, `任务 ${task.id} 的 API 配置`),
      referenceImages: await Promise.all(normalizedReferenceImages.map(async referenceImage => {
        const { blobPath, ...referenceMetadata } = referenceImage
        const dimensions = await validateArchivedImage(blobPath)
        return {
          ...referenceMetadata,
          ...dimensions,
          blob: requireArchiveFile(files, blobPath).slice(0, undefined, referenceMetadata.mimeType),
        }
      })),
    }
  }))
  const images: StoredImageRecord[] = await Promise.all(manifest.images.map(async image => {
    const { originalBlobPath, thumbnailBlobPath, ...imageMetadata } = image
    const [originalDimensions] = await Promise.all([
      validateArchivedImage(originalBlobPath),
      validateArchivedImage(thumbnailBlobPath),
    ])
    return {
      ...imageMetadata,
      ...originalDimensions,
      params: parseGenerationParameters(image.params, `图片 ${image.id} 的生成参数`),
      originalBlob: requireArchiveFile(files, originalBlobPath).slice(0, undefined, image.mimeType),
      thumbnailBlob: requireArchiveFile(files, thumbnailBlobPath).slice(0, undefined, 'image/webp'),
    }
  }))

  return {
    settings: parseAppSettings(manifest.settings, '备份中的设置'),
    tasks,
    images,
    templates: normalizePromptTemplates(manifest.templates),
    promptModules: manifest.version === 2
      ? manifest.promptModules
      : cloneForStorage(DEFAULT_PROMPT_MODULES),
  }
}
