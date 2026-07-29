import type {
  ApiOperationConfig,
  ApiSettings,
  GenParams,
  ImageApiResult,
  ReferenceImage,
} from '@/types'
import { getImageAspectRatio, getImageResolution, sizeToWH } from '@/types'
import { base64ToBlob, blobToBase64, getMimeTypeForFormat } from './imageAssets'

interface RequestVariables {
  prompt: string
  model: string
  size: string
  width?: number
  height?: number
  aspectRatio?: string
  resolution?: string
  quality: string
  format: string
  n: number
  referenceImageFile?: Blob | Blob[]
  referenceImageBase64?: string | string[]
  referenceMimeType?: string | string[]
  referenceFileName?: string | string[]
}

export class ImageApiError extends Error {
  constructor(message: string, readonly status?: number) {
    super(message)
    this.name = 'ImageApiError'
  }
}

function getValueAtPath(source: unknown, path: string): unknown {
  if (!path.trim() || path.trim() === '$') return source
  return path.split('.').reduce<unknown>((current, segment) => {
    if (current === null || current === undefined) return undefined
    if (Array.isArray(current) && /^\d+$/.test(segment)) return current[Number(segment)]
    if (typeof current === 'object') return (current as Record<string, unknown>)[segment]
    return undefined
  }, source)
}

function getOptionalMappedValue(source: unknown, path: string): unknown {
  return path.trim() ? getValueAtPath(source, path) : undefined
}

function containsBlob(value: unknown): boolean {
  if (value instanceof Blob) return true
  if (Array.isArray(value)) return value.some(containsBlob)
  if (value && typeof value === 'object') return Object.values(value).some(containsBlob)
  return false
}

function throwIfAborted(signal?: AbortSignal): void {
  if (signal?.aborted) throw signal.reason ?? new DOMException('请求已取消', 'AbortError')
}

function substituteString(template: string, variables: RequestVariables): unknown {
  const exactPlaceholder = template.match(/^\{\{([a-zA-Z0-9]+)\}\}$/)
  if (exactPlaceholder) return variables[exactPlaceholder[1] as keyof RequestVariables]
  return template.replace(/\{\{([a-zA-Z0-9]+)\}\}/g, (_, variableName: string) => {
    const value = variables[variableName as keyof RequestVariables]
    return value === undefined ? '' : String(value)
  })
}

function substituteTemplateValue(template: unknown, variables: RequestVariables): unknown {
  if (typeof template === 'string') return substituteString(template, variables)
  if (Array.isArray(template)) return template.map(item => substituteTemplateValue(item, variables))
  if (template && typeof template === 'object') {
    return Object.fromEntries(
      Object.entries(template).flatMap(([key, value]) => {
        const substitutedValue = substituteTemplateValue(value, variables)
        return substitutedValue === undefined ? [] : [[key, substitutedValue]]
      }),
    )
  }
  return template
}

export function buildJsonRequestBody(bodyTemplate: string, variables: RequestVariables): unknown {
  let parsedTemplate: unknown
  try {
    parsedTemplate = JSON.parse(bodyTemplate)
  } catch (error) {
    throw new ImageApiError(`请求体模板不是有效 JSON：${error instanceof Error ? error.message : String(error)}`)
  }
  const substitutedBody = substituteTemplateValue(parsedTemplate, variables)
  if (containsBlob(substitutedBody)) {
    throw new ImageApiError('JSON 请求体不能使用 {{referenceImageFile}}，请改用 {{referenceImageBase64}} 或 Multipart 模式')
  }
  return substitutedBody
}

export function buildMultipartRequestBody(bodyTemplate: string, variables: RequestVariables): FormData {
  let parsedTemplate: unknown
  try {
    parsedTemplate = JSON.parse(bodyTemplate)
  } catch (error) {
    throw new ImageApiError(`请求体模板不是有效 JSON：${error instanceof Error ? error.message : String(error)}`)
  }
  const substitutedBody = substituteTemplateValue(parsedTemplate, variables)
  if (!substitutedBody || Array.isArray(substitutedBody) || typeof substitutedBody !== 'object') {
    throw new ImageApiError('Multipart 请求体模板必须是 JSON 对象')
  }

  const formData = new FormData()
  for (const [fieldName, value] of Object.entries(substitutedBody)) {
    if (value === undefined || value === null || value === '') continue
    if (value instanceof Blob) {
      const referenceFileName = Array.isArray(variables.referenceFileName)
        ? variables.referenceFileName[0]
        : variables.referenceFileName
      formData.append(fieldName, value, referenceFileName || 'reference.png')
    } else if (Array.isArray(value) && value.every(item => item instanceof Blob)) {
      const referenceFileNames = Array.isArray(variables.referenceFileName)
        ? variables.referenceFileName
        : []
      for (const [referenceIndex, referenceBlob] of value.entries()) {
        formData.append(
          fieldName,
          referenceBlob,
          referenceFileNames[referenceIndex] || `reference-${referenceIndex + 1}.png`,
        )
      }
    } else if (typeof value === 'object') {
      if (containsBlob(value)) throw new ImageApiError('Multipart 文件占位符必须位于请求体模板的顶层字段')
      formData.append(fieldName, JSON.stringify(value))
    } else {
      formData.append(fieldName, String(value))
    }
  }
  return formData
}

function parseExtraHeaders(extraHeaders: string): Record<string, string> {
  try {
    const parsed = JSON.parse(extraHeaders || '{}') as unknown
    if (!parsed || Array.isArray(parsed) || typeof parsed !== 'object') throw new Error('必须是 JSON 对象')
    return Object.fromEntries(Object.entries(parsed).map(([key, value]) => [key, String(value)]))
  } catch (error) {
    throw new ImageApiError(`额外 Headers 配置无效：${error instanceof Error ? error.message : String(error)}`)
  }
}

function createHeaders(settings: ApiSettings, includeJsonContentType: boolean): Headers {
  const headers = new Headers(parseExtraHeaders(settings.extraHeaders))
  if (settings.apiKey && settings.authHeader) headers.set(settings.authHeader, `${settings.authPrefix}${settings.apiKey}`)
  if (includeJsonContentType) headers.set('Content-Type', 'application/json')
  else headers.delete('Content-Type')
  headers.set('Accept', 'application/json, image/*')
  return headers
}

async function parseApiError(response: Response): Promise<ImageApiError> {
  const responseText = await response.text()
  let detail = responseText
  try {
    const parsed = JSON.parse(responseText) as Record<string, unknown>
    const nestedError = parsed.error
    if (nestedError && typeof nestedError === 'object') {
      detail = String((nestedError as Record<string, unknown>).message ?? responseText)
    } else if (parsed.message) {
      detail = String(parsed.message)
    }
  } catch {
    // Plain-text provider errors are already useful.
  }
  return new ImageApiError(`接口返回 ${response.status}${detail ? `：${detail}` : ''}`, response.status)
}

async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number,
  externalSignal?: AbortSignal,
): Promise<Response> {
  const controller = new AbortController()
  const timeout = window.setTimeout(() => controller.abort(new DOMException('请求超时', 'TimeoutError')), timeoutMs)
  const abortFromExternalSignal = () => controller.abort(externalSignal?.reason)
  externalSignal?.addEventListener('abort', abortFromExternalSignal, { once: true })

  try {
    return await fetch(url, { ...init, signal: controller.signal })
  } catch (error) {
    if (externalSignal?.aborted) throw error
    if (controller.signal.aborted) throw new ImageApiError(`请求超过 ${Math.round(timeoutMs / 1000)} 秒，已停止等待`)
    if (error instanceof TypeError) {
      throw new ImageApiError('网络请求失败。请检查接口地址、网络连接以及接口是否允许浏览器跨域访问（CORS）')
    }
    throw error
  } finally {
    window.clearTimeout(timeout)
    externalSignal?.removeEventListener('abort', abortFromExternalSignal)
  }
}

async function createRequestVariables(
  prompt: string,
  params: GenParams,
  model: string,
  referenceImages: ReferenceImage[],
  requiresReferenceBase64 = false,
): Promise<RequestVariables> {
  const { w: width, h: height } = sizeToWH(params.size)
  const referenceImageFiles = referenceImages.map(referenceImage => referenceImage.blob)
  const referenceImageBase64Values = requiresReferenceBase64
    ? await Promise.all(referenceImages.map(referenceImage => blobToBase64(referenceImage.blob)))
    : []

  const collapseSingleReferenceValue = <Value>(values: Value[]): Value | Value[] | undefined => {
    if (!values.length) return undefined
    return values.length === 1 ? values[0] : values
  }

  return {
    prompt,
    model,
    size: params.size,
    width,
    height,
    aspectRatio: getImageAspectRatio(params.size),
    resolution: getImageResolution(params.size),
    quality: params.quality,
    format: params.format,
    n: params.n,
    referenceImageFile: collapseSingleReferenceValue(referenceImageFiles),
    referenceImageBase64: collapseSingleReferenceValue(referenceImageBase64Values),
    referenceMimeType: collapseSingleReferenceValue(referenceImages.map(referenceImage => referenceImage.mimeType)),
    referenceFileName: collapseSingleReferenceValue(referenceImages.map(referenceImage => referenceImage.fileName)),
  }
}

async function parseImageResponse(
  response: Response,
  settings: ApiSettings,
  fallbackMimeType: string,
  signal?: AbortSignal,
): Promise<ImageApiResult> {
  throwIfAborted(signal)
  const responseContentType = response.headers.get('content-type') ?? ''
  if (responseContentType.startsWith('image/')) {
    const blob = await response.blob()
    return { images: [{ blob, mimeType: blob.type || responseContentType }] }
  }

  let payload: unknown
  try {
    payload = await response.json()
  } catch {
    throw new ImageApiError('接口响应不是有效 JSON，也不是图片文件')
  }

  const mappedItems = getValueAtPath(payload, settings.response.itemsPath)
  const items = Array.isArray(mappedItems) ? mappedItems : mappedItems ? [mappedItems] : []
  if (!items.length) throw new ImageApiError(`响应中没有找到图片数组：${settings.response.itemsPath || '(响应根节点)'}`)

  const images = await Promise.all(items.map(async item => {
    throwIfAborted(signal)
    const base64Value = getOptionalMappedValue(item, settings.response.base64Path)
    const remoteUrl = getOptionalMappedValue(item, settings.response.urlPath)
    const mappedMimeType = getOptionalMappedValue(item, settings.response.mimeTypePath)
    const revisedPrompt = getOptionalMappedValue(item, settings.response.revisedPromptPath)
    const mimeType = typeof mappedMimeType === 'string' && mappedMimeType ? mappedMimeType : fallbackMimeType

    if (typeof base64Value === 'string' && base64Value) {
      const blob = base64ToBlob(base64Value, mimeType)
      return { blob, mimeType: blob.type || mimeType, revisedPrompt: typeof revisedPrompt === 'string' ? revisedPrompt : undefined }
    }
    if (typeof remoteUrl === 'string' && remoteUrl) {
      const imageResponse = await fetchWithTimeout(remoteUrl, { method: 'GET' }, settings.timeoutMs, signal)
      if (!imageResponse.ok) throw await parseApiError(imageResponse)
      const blob = await imageResponse.blob()
      return { blob, mimeType: blob.type || mimeType, revisedPrompt: typeof revisedPrompt === 'string' ? revisedPrompt : undefined }
    }
    throw new ImageApiError('图片结果缺少可识别的 Base64 或 URL 字段')
  }))

  return { images, usage: getOptionalMappedValue(payload, settings.response.usagePath) }
}

async function executeOperation(
  operation: ApiOperationConfig,
  settings: ApiSettings,
  prompt: string,
  params: GenParams,
  referenceImages: ReferenceImage[],
  signal?: AbortSignal,
): Promise<ImageApiResult> {
  if (!operation.url.trim()) throw new ImageApiError('请先在设置中填写请求 URL')
  const requiresReferenceBase64 = operation.bodyTemplate.includes('{{referenceImageBase64}}')
  const variables = await createRequestVariables(prompt, params, settings.model, referenceImages, requiresReferenceBase64)
  const isJson = operation.bodyMode === 'json'
  const requestBody = isJson
    ? JSON.stringify(buildJsonRequestBody(operation.bodyTemplate, variables))
    : buildMultipartRequestBody(operation.bodyTemplate, variables)
  const response = await fetchWithTimeout(operation.url, {
    method: operation.method,
    headers: createHeaders(settings, isJson),
    body: requestBody,
  }, settings.timeoutMs, signal)
  if (!response.ok) throw await parseApiError(response)
  throwIfAborted(signal)
  return parseImageResponse(response, settings, getMimeTypeForFormat(params.format), signal)
}

export function requestImages(options: {
  settings: ApiSettings
  prompt: string
  params: GenParams
  referenceImages?: ReferenceImage[]
  signal?: AbortSignal
}): Promise<ImageApiResult> {
  const referenceImages = options.referenceImages ?? []
  const operation = referenceImages.length ? options.settings.edit : options.settings.generation
  return executeOperation(operation, options.settings, options.prompt, options.params, referenceImages, options.signal)
}

export async function testApiConnection(settings: ApiSettings): Promise<void> {
  if (!settings.testUrl.trim()) throw new ImageApiError('请填写连接测试 URL')
  const response = await fetchWithTimeout(settings.testUrl, {
    method: 'GET',
    headers: createHeaders(settings, false),
  }, Math.min(settings.timeoutMs, 30_000))
  if (!response.ok) throw await parseApiError(response)
}
