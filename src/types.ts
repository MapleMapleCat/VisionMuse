// 全局领域类型 —— 预览版用 dataUrl 代替 IndexedDB blobKey

export type ImageSize = '1024x1024' | '1536x1024' | '1024x1536' | '2048x2048'
export type ImageQuality = 'low' | 'medium' | 'high'
export type ImageFormat = 'png' | 'webp' | 'jpeg'
export type TaskStatus = 'queued' | 'running' | 'done' | 'failed' | 'canceled'

export interface GenParams {
  size: ImageSize
  quality: ImageQuality
  format: ImageFormat
  n: number
}

export interface GenerationTask {
  id: string
  kind: 'generate' | 'edit'
  prompt: string
  params: GenParams
  referenceThumb?: string
  status: TaskStatus
  error?: string
  createdAt: number
  startedAt?: number
  finishedAt?: number
  imageIds: string[]
}

export interface ImageRecord {
  id: string
  taskId: string
  dataUrl: string
  width: number
  height: number
  prompt: string
  params: GenParams
  kind: 'generate' | 'edit'
  favorite: boolean
  tags: string[]
  deletedAt?: number
  createdAt: number
}

export interface PromptTemplate {
  id: string
  title: string
  content: string
  category: string
  useCount: number
}

export const SIZE_OPTIONS: { value: ImageSize; label: string; ratio: string }[] = [
  { value: '1024x1024', label: '1024 × 1024', ratio: '1:1' },
  { value: '1536x1024', label: '1536 × 1024', ratio: '3:2' },
  { value: '1024x1536', label: '1024 × 1536', ratio: '2:3' },
  { value: '2048x2048', label: '2048 × 2048', ratio: '2K' },
]

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

export function estimateCost(params: GenParams, kind: 'generate' | 'edit'): number {
  const per = QUALITY_OPTIONS.find(q => q.value === params.quality)?.cost ?? 0.07
  const refSurcharge = kind === 'edit' ? 0.04 : 0
  return (per + refSurcharge) * params.n
}
