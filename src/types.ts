export type ImageAspectRatio = '1:1' | '3:2' | '2:3'
export type ImageResolution = '1K' | '2K'
export type ImageSize =
  | '1024x1024'
  | '1536x1024'
  | '1024x1536'
  | '2048x2048'
  | '2016x1344'
  | '1344x2016'
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

export const ASPECT_RATIO_OPTIONS: { value: ImageAspectRatio; label: string }[] = [
  { value: '1:1', label: '1:1' },
  { value: '3:2', label: '3:2' },
  { value: '2:3', label: '2:3' },
]

export const RESOLUTION_OPTIONS: { value: ImageResolution; label: string }[] = [
  { value: '1K', label: '1K' },
  { value: '2K', label: '2K' },
]

export const SIZE_OPTIONS: {
  value: ImageSize
  label: string
  aspectRatio: ImageAspectRatio
  resolution: ImageResolution
}[] = [
  { value: '1024x1024', label: '1024 × 1024', aspectRatio: '1:1', resolution: '1K' },
  { value: '1536x1024', label: '1536 × 1024', aspectRatio: '3:2', resolution: '1K' },
  { value: '1024x1536', label: '1024 × 1536', aspectRatio: '2:3', resolution: '1K' },
  { value: '2048x2048', label: '2048 × 2048', aspectRatio: '1:1', resolution: '2K' },
  { value: '2016x1344', label: '2016 × 1344', aspectRatio: '3:2', resolution: '2K' },
  { value: '1344x2016', label: '1344 × 2016', aspectRatio: '2:3', resolution: '2K' },
]

export function getImageSize(aspectRatio: ImageAspectRatio, resolution: ImageResolution): ImageSize {
  const matchingOption = SIZE_OPTIONS.find(option =>
    option.aspectRatio === aspectRatio && option.resolution === resolution,
  )
  if (!matchingOption) throw new Error(`不支持的图片尺寸组合：${aspectRatio} ${resolution}`)
  return matchingOption.value
}

export function getImageAspectRatio(size: ImageSize): ImageAspectRatio {
  return SIZE_OPTIONS.find(option => option.value === size)?.aspectRatio ?? '1:1'
}

export function getImageResolution(size: ImageSize): ImageResolution {
  return SIZE_OPTIONS.find(option => option.value === size)?.resolution ?? '1K'
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
