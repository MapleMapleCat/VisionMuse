export type ImageAspectRatio = `${number}:${number}`
export type ImageResolution = '1K' | '2K' | '4K'
export type ImageSize = `${number}x${number}`
export type ImageQuality = 'low' | 'medium' | 'high'
export type ImageFormat = 'png' | 'webp' | 'jpeg'
export type TaskStatus = 'queued' | 'running' | 'done' | 'failed' | 'canceled'
export type RequestBodyMode = 'json' | 'multipart'

export interface GenParams {
  size: ImageSize
  quality: ImageQuality
  format: ImageFormat
  n: number
}

export interface ReferenceImage {
  blob: Blob
  previewUrl: string
  fileName: string
  mimeType: string
  width: number
  height: number
}

export interface StoredReferenceImage extends Omit<ReferenceImage, 'previewUrl'> {}

export interface ApiOperationConfig {
  url: string
  method: 'POST' | 'PUT' | 'PATCH'
  bodyMode: RequestBodyMode
  bodyTemplate: string
}

export interface ApiResponseMapping {
  itemsPath: string
  base64Path: string
  urlPath: string
  mimeTypePath: string
  revisedPromptPath: string
  usagePath: string
}

export interface ApiSettings {
  apiKey: string
  model: string
  authHeader: string
  authPrefix: string
  extraHeaders: string
  testUrl: string
  timeoutMs: number
  maxConcurrent: number
  generation: ApiOperationConfig
  edit: ApiOperationConfig
  response: ApiResponseMapping
}

export type ApiRequestConfig = Omit<ApiSettings, 'apiKey'>

export interface AppSettings {
  api: ApiSettings
  defaultParams: GenParams
  budgetDaily: number
  autoDownloadOriginals: boolean
  estimatedCostByQuality: Record<ImageQuality, number>
}

export interface GenerationTask {
  id: string
  kind: 'generate' | 'edit'
  prompt: string
  params: GenParams
  referenceImage?: ReferenceImage
  status: TaskStatus
  error?: string
  errorStatus?: number
  requestEndpoint: string
  model: string
  apiConfig: ApiRequestConfig
  estimatedCost: number
  usage?: unknown
  createdAt: number
  startedAt?: number
  finishedAt?: number
  imageIds: string[]
}

export interface StoredGenerationTask extends Omit<GenerationTask, 'referenceImage'> {
  referenceImage?: StoredReferenceImage
}

export interface ImageRecord {
  id: string
  taskId: string
  dataUrl: string
  originalBlob: Blob
  thumbnailBlob: Blob
  mimeType: string
  fileExtension: ImageFormat
  byteSize: number
  width: number
  height: number
  prompt: string
  params: GenParams
  kind: 'generate' | 'edit'
  model: string
  requestEndpoint: string
  revisedPrompt?: string
  usage?: unknown
  favorite: boolean
  tags: string[]
  deletedAt?: number
  createdAt: number
}

export interface StoredImageRecord extends Omit<ImageRecord, 'dataUrl'> {}

export interface GeneratedImageResult {
  blob: Blob
  mimeType: string
  revisedPrompt?: string
}

export interface ImageApiResult {
  images: GeneratedImageResult[]
  usage?: unknown
}

export interface PromptTemplate {
  id: string
  title: string
  content: string
  category: string
  useCount: number
}

export const PROMPT_MODULE_CATEGORY_KEYS = [
  'style',
  'composition',
  'lighting',
  'environment',
  'color',
  'detail',
] as const

export type PromptModuleCategory = typeof PROMPT_MODULE_CATEGORY_KEYS[number]

export interface PromptModule {
  id: string
  title: string
  content: string
  category: PromptModuleCategory
  useCount: number
  sortOrder: number
}

export const ASPECT_RATIO_OPTIONS: { value: ImageAspectRatio; label: string }[] = [
  { value: '1:1', label: '1:1' },
  { value: '4:3', label: '4:3' },
  { value: '3:2', label: '3:2' },
  { value: '16:9', label: '16:9' },
]

export const RESOLUTION_OPTIONS: { value: ImageResolution; label: string }[] = [
  { value: '1K', label: '1K' },
  { value: '2K', label: '2K' },
  { value: '4K', label: '4K' },
]

export const SIZE_OPTIONS: {
  value: ImageSize
  label: string
  aspectRatio: ImageAspectRatio
  resolution: ImageResolution
}[] = [
  { value: '1024x1024', label: '1024 × 1024', aspectRatio: '1:1', resolution: '1K' },
  { value: '1365x1024', label: '1365 × 1024', aspectRatio: '4:3', resolution: '1K' },
  { value: '1024x1365', label: '1024 × 1365', aspectRatio: '3:4', resolution: '1K' },
  { value: '1536x1024', label: '1536 × 1024', aspectRatio: '3:2', resolution: '1K' },
  { value: '1024x1536', label: '1024 × 1536', aspectRatio: '2:3', resolution: '1K' },
  { value: '1820x1024', label: '1820 × 1024', aspectRatio: '16:9', resolution: '1K' },
  { value: '1024x1820', label: '1024 × 1820', aspectRatio: '9:16', resolution: '1K' },
  { value: '2048x2048', label: '2048 × 2048', aspectRatio: '1:1', resolution: '2K' },
  { value: '2048x1536', label: '2048 × 1536', aspectRatio: '4:3', resolution: '2K' },
  { value: '1536x2048', label: '1536 × 2048', aspectRatio: '3:4', resolution: '2K' },
  { value: '2016x1344', label: '2016 × 1344', aspectRatio: '3:2', resolution: '2K' },
  { value: '1344x2016', label: '1344 × 2016', aspectRatio: '2:3', resolution: '2K' },
  { value: '2048x1152', label: '2048 × 1152', aspectRatio: '16:9', resolution: '2K' },
  { value: '1152x2048', label: '1152 × 2048', aspectRatio: '9:16', resolution: '2K' },
  { value: '4096x4096', label: '4096 × 4096', aspectRatio: '1:1', resolution: '4K' },
  { value: '4096x3072', label: '4096 × 3072', aspectRatio: '4:3', resolution: '4K' },
  { value: '3072x4096', label: '3072 × 4096', aspectRatio: '3:4', resolution: '4K' },
  { value: '4096x2731', label: '4096 × 2731', aspectRatio: '3:2', resolution: '4K' },
  { value: '2731x4096', label: '2731 × 4096', aspectRatio: '2:3', resolution: '4K' },
  { value: '4096x2304', label: '4096 × 2304', aspectRatio: '16:9', resolution: '4K' },
  { value: '2304x4096', label: '2304 × 4096', aspectRatio: '9:16', resolution: '4K' },
]

export function getImageSize(aspectRatio: ImageAspectRatio, resolution: ImageResolution): ImageSize {
  const matchingOption = SIZE_OPTIONS.find(option =>
    option.aspectRatio === aspectRatio && option.resolution === resolution,
  )
  if (matchingOption) return matchingOption.value

  const parsedAspectRatio = parseImageAspectRatio(aspectRatio)
  if (!parsedAspectRatio) throw new Error(`不支持的图片比例：${aspectRatio}`)

  const maximumDimensionByResolution: Record<ImageResolution, number> = {
    '1K': 1024,
    '2K': 2048,
    '4K': 4096,
  }
  const maximumDimension = maximumDimensionByResolution[resolution]
  const dimensionMultiplier = Math.max(
    1,
    Math.floor(maximumDimension / Math.max(parsedAspectRatio.width, parsedAspectRatio.height)),
  )
  const width = parsedAspectRatio.width * dimensionMultiplier
  const height = parsedAspectRatio.height * dimensionMultiplier
  return `${width}x${height}`
}

export function getImageAspectRatio(size: ImageSize): ImageAspectRatio {
  const matchingOption = SIZE_OPTIONS.find(option => option.value === size)
  if (matchingOption) return matchingOption.aspectRatio

  const { w: width, h: height } = sizeToWH(size)
  if (!width || !height) return '1:1'
  const divisor = greatestCommonDivisor(width, height)
  return `${width / divisor}:${height / divisor}`
}

export function getImageResolution(size: ImageSize): ImageResolution {
  const matchingOption = SIZE_OPTIONS.find(option => option.value === size)
  if (matchingOption) return matchingOption.resolution

  const { w: width, h: height } = sizeToWH(size)
  const maximumDimension = Math.max(width, height)
  if (maximumDimension > 2048) return '4K'
  if (maximumDimension > 1024) return '2K'
  return '1K'
}

function greatestCommonDivisor(firstValue: number, secondValue: number): number {
  let currentValue = Math.abs(firstValue)
  let remainingValue = Math.abs(secondValue)
  while (remainingValue) {
    const nextRemainder = currentValue % remainingValue
    currentValue = remainingValue
    remainingValue = nextRemainder
  }
  return currentValue || 1
}

export function parseImageAspectRatio(value: string): { width: number; height: number; normalized: ImageAspectRatio } | null {
  const match = value.trim().match(/^(\d{1,3})\s*[:：]\s*(\d{1,3})$/)
  if (!match) return null

  const width = Number(match[1])
  const height = Number(match[2])
  if (width < 1 || height < 1) return null

  const divisor = greatestCommonDivisor(width, height)
  const normalizedWidth = width / divisor
  const normalizedHeight = height / divisor
  return {
    width: normalizedWidth,
    height: normalizedHeight,
    normalized: `${normalizedWidth}:${normalizedHeight}`,
  }
}

export const QUALITY_OPTIONS: { value: ImageQuality; label: string; cost: number }[] = [
  { value: 'low', label: '低', cost: 0.02 },
  { value: 'medium', label: '中', cost: 0.07 },
  { value: 'high', label: '高', cost: 0.19 },
]

export const FORMAT_OPTIONS: ImageFormat[] = ['png', 'webp', 'jpeg']

export function sizeToWH(size: ImageSize): { w: number; h: number } {
  const [w, h] = size.split('x').map(Number)
  return { w, h }
}

export function estimateCost(
  params: GenParams,
  kind: 'generate' | 'edit',
  costs: Record<ImageQuality, number> = { low: 0.02, medium: 0.07, high: 0.19 },
): number {
  const per = costs[params.quality]
  const refSurcharge = kind === 'edit' ? 0.04 : 0
  return (per + refSurcharge) * params.n
}
