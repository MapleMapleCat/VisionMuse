import type {
  ApiOperationConfig,
  ApiSettings,
  GenParams,
  ImageApiResult,
  ReferenceImage,
} from '@/types'
import { MAX_REFERENCE_IMAGE_COUNT, getImageAspectRatio, getImageResolution, sizeToWH } from '@/types'
import { base64ToBlob, blobToBase64, getMimeTypeForFormat } from './imageAssets'
import { MEDIA_LIMITS, formatMegabytes } from './resourceLimits'
import { parseApiSettings, parseGenerationParameters } from './settingsValidation'

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

function readStreamChunkWithAbort(
  responseReader: ReadableStreamDefaultReader<Uint8Array<ArrayBuffer>>,
  signal?: AbortSignal,
): Promise<ReadableStreamReadResult<Uint8Array<ArrayBuffer>>> {
  if (!signal) return responseReader.read()
  if (signal.aborted) {
    return Promise.reject(signal.reason ?? new DOMException('请求已取消', 'AbortError'))
  }

  return new Promise((resolve, reject) => {
    const abortRead = () => {
      void responseReader.cancel(signal.reason).catch(() => undefined)
      reject(signal.reason ?? new DOMException('请求已取消', 'AbortError'))
    }
    signal.addEventListener('abort', abortRead, { once: true })
    responseReader.read().then(resolve, reject).finally(() => {
      signal.removeEventListener('abort', abortRead)
    })
  })
}

function getDeclaredContentLength(response: Response): number | undefined {
  const contentLengthHeader = response.headers.get('content-length')
  if (!contentLengthHeader) return undefined
  const parsedContentLength = Number(contentLengthHeader)
  return Number.isFinite(parsedContentLength) && parsedContentLength >= 0
    ? parsedContentLength
    : undefined
}

async function readResponseBlobWithinLimit(
  response: Response,
  maximumBytes: number,
  resourceLabel: string,
  signal?: AbortSignal,
): Promise<Blob> {
  const declaredContentLength = getDeclaredContentLength(response)
  if (declaredContentLength !== undefined && declaredContentLength > maximumBytes) {
    throw new ImageApiError(`${resourceLabel}超过 ${formatMegabytes(maximumBytes)} 上限`)
  }

  if (!response.body) {
    const responseBlob = await response.blob()
    if (responseBlob.size > maximumBytes) {
      throw new ImageApiError(`${resourceLabel}超过 ${formatMegabytes(maximumBytes)} 上限`)
    }
    return responseBlob
  }

  const responseReader = response.body.getReader()
  const responseChunks: BlobPart[] = []
  let receivedBytes = 0
  try {
    while (true) {
      throwIfAborted(signal)
      const { done, value } = await readStreamChunkWithAbort(responseReader, signal)
      if (done) break
      receivedBytes += value.byteLength
      if (receivedBytes > maximumBytes) {
        void responseReader.cancel().catch(() => undefined)
        throw new ImageApiError(`${resourceLabel}超过 ${formatMegabytes(maximumBytes)} 上限`)
      }
      responseChunks.push(value)
    }
  } finally {
    try {
      responseReader.releaseLock()
    } catch {
      // An aborted pending read keeps the lock until the underlying stream settles.
    }
  }
  return new Blob(responseChunks, {
    type: response.headers.get('content-type') ?? 'application/octet-stream',
  })
}

async function readResponseTextWithinLimit(
  response: Response,
  maximumBytes: number,
  resourceLabel: string,
  signal?: AbortSignal,
): Promise<string> {
  return (await readResponseBlobWithinLimit(response, maximumBytes, resourceLabel, signal)).text()
}

function estimateBase64DecodedBytes(base64Value: string): number {
  const dataUrlPayload = base64Value.match(/^data:[^,]*,(.*)$/s)?.[1] ?? base64Value
  const normalizedValue = dataUrlPayload.replace(/\s/g, '')
  const paddingBytes = normalizedValue.endsWith('==') ? 2 : normalizedValue.endsWith('=') ? 1 : 0
  return Math.max(0, Math.floor(normalizedValue.length * 3 / 4) - paddingBytes)
}

function validateReferenceImageBudget(
  referenceImages: ReferenceImage[],
  requiresReferenceBase64: boolean,
): void {
  if (referenceImages.length > MAX_REFERENCE_IMAGE_COUNT) {
    throw new ImageApiError(`参考图不能超过 ${MAX_REFERENCE_IMAGE_COUNT} 张`)
  }
  const totalReferenceBytes = referenceImages.reduce(
    (totalBytes, referenceImage) => totalBytes + referenceImage.blob.size,
    0,
  )
  if (referenceImages.some(referenceImage => (
    referenceImage.blob.size > MEDIA_LIMITS.maximumReferenceImageBytes
  ))) {
    throw new ImageApiError(
      `单张参考图不能超过 ${formatMegabytes(MEDIA_LIMITS.maximumReferenceImageBytes)}`,
    )
  }
  if (totalReferenceBytes > MEDIA_LIMITS.maximumReferenceImageTotalBytes) {
    throw new ImageApiError(
      `参考图总大小不能超过 ${formatMegabytes(MEDIA_LIMITS.maximumReferenceImageTotalBytes)}`,
    )
  }
  if (requiresReferenceBase64 && totalReferenceBytes > MEDIA_LIMITS.maximumBase64ReferenceTotalBytes) {
    throw new ImageApiError(
      `Base64 模式下参考图总大小不能超过 ${formatMegabytes(MEDIA_LIMITS.maximumBase64ReferenceTotalBytes)}`,
    )
  }
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

async function parseApiError(response: Response, signal?: AbortSignal): Promise<ImageApiError> {
  const responseText = await readResponseTextWithinLimit(
    response,
    Math.min(MEDIA_LIMITS.maximumApiJsonBytes, 1024 * 1024),
    '接口错误响应',
    signal,
  )
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

async function fetchWithTimeout<ResponseValue>(
  url: string,
  init: RequestInit,
  timeoutMs: number,
  externalSignal?: AbortSignal,
  consumeResponse?: (response: Response, signal: AbortSignal) => Promise<ResponseValue>,
): Promise<ResponseValue> {
  if (externalSignal?.aborted) {
    throw externalSignal.reason ?? new DOMException('请求已取消', 'AbortError')
  }
  const controller = new AbortController()
  const timeout = window.setTimeout(() => controller.abort(new DOMException('请求超时', 'TimeoutError')), timeoutMs)
  const abortFromExternalSignal = () => controller.abort(externalSignal?.reason)
  externalSignal?.addEventListener('abort', abortFromExternalSignal, { once: true })

  try {
    const response = await fetch(url, { ...init, signal: controller.signal })
    if (!consumeResponse) return response as ResponseValue
    return await consumeResponse(response, controller.signal)
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
  signal?: AbortSignal,
): Promise<RequestVariables> {
  throwIfAborted(signal)
  const { w: width, h: height } = sizeToWH(params.size)
  const referenceImageFiles = referenceImages.map(referenceImage => referenceImage.blob)
  validateReferenceImageBudget(referenceImages, requiresReferenceBase64)
  const referenceImageBase64Values: string[] = []
  if (requiresReferenceBase64) {
    for (const referenceImage of referenceImages) {
      throwIfAborted(signal)
      referenceImageBase64Values.push(await blobToBase64(referenceImage.blob))
    }
  }

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
    const blob = await readResponseBlobWithinLimit(
      response,
      MEDIA_LIMITS.maximumApiResponseImageBytes,
      '接口图片响应',
      signal,
    )
    return { images: [{ blob, mimeType: blob.type || responseContentType }] }
  }

  let payload: unknown
  try {
    payload = JSON.parse(await readResponseTextWithinLimit(
      response,
      MEDIA_LIMITS.maximumApiJsonBytes,
      '接口 JSON 响应',
      signal,
    ))
  } catch (error) {
    if (error instanceof ImageApiError) throw error
    if (signal?.aborted) throw signal.reason ?? error
    if (error instanceof DOMException && error.name === 'AbortError') throw error
    throw new ImageApiError('接口响应不是有效 JSON，也不是图片文件')
  }

  const mappedItems = getValueAtPath(payload, settings.response.itemsPath)
  const items = Array.isArray(mappedItems) ? mappedItems : mappedItems ? [mappedItems] : []
  if (!items.length) throw new ImageApiError(`响应中没有找到图片数组：${settings.response.itemsPath || '(响应根节点)'}`)
  if (items.length > MEDIA_LIMITS.maximumApiResponseImageCount) {
    throw new ImageApiError(`接口返回了 ${items.length} 张图片，单次最多接收 ${MEDIA_LIMITS.maximumApiResponseImageCount} 张`)
  }

  let accumulatedImageBytes = 0
  const images: ImageApiResult['images'] = []
  for (const item of items) {
    throwIfAborted(signal)
    const base64Value = getOptionalMappedValue(item, settings.response.base64Path)
    const remoteUrl = getOptionalMappedValue(item, settings.response.urlPath)
    const mappedMimeType = getOptionalMappedValue(item, settings.response.mimeTypePath)
    const revisedPrompt = getOptionalMappedValue(item, settings.response.revisedPromptPath)
    const mimeType = typeof mappedMimeType === 'string' && mappedMimeType ? mappedMimeType : fallbackMimeType

    if (typeof base64Value === 'string' && base64Value) {
      const estimatedImageBytes = estimateBase64DecodedBytes(base64Value)
      if (estimatedImageBytes > MEDIA_LIMITS.maximumApiResponseImageBytes) {
        throw new ImageApiError(`单张 Base64 图片超过 ${formatMegabytes(MEDIA_LIMITS.maximumApiResponseImageBytes)} 上限`)
      }
      if (accumulatedImageBytes + estimatedImageBytes > MEDIA_LIMITS.maximumApiResponseTotalBytes) {
        throw new ImageApiError(`接口图片总量超过 ${formatMegabytes(MEDIA_LIMITS.maximumApiResponseTotalBytes)} 上限`)
      }
      const blob = base64ToBlob(base64Value, mimeType)
      accumulatedImageBytes += blob.size
      images.push({
        blob,
        mimeType: blob.type || mimeType,
        revisedPrompt: typeof revisedPrompt === 'string' ? revisedPrompt : undefined,
      })
      continue
    }
    if (typeof remoteUrl === 'string' && remoteUrl) {
      const remainingResponseBudget = MEDIA_LIMITS.maximumApiResponseTotalBytes - accumulatedImageBytes
      const blob = await fetchWithTimeout(
        remoteUrl,
        { method: 'GET' },
        settings.timeoutMs,
        signal,
        async (imageResponse, requestSignal) => {
          if (!imageResponse.ok) throw await parseApiError(imageResponse, requestSignal)
          return readResponseBlobWithinLimit(
            imageResponse,
            Math.min(MEDIA_LIMITS.maximumApiResponseImageBytes, remainingResponseBudget),
            '远程图片响应',
            requestSignal,
          )
        },
      )
      accumulatedImageBytes += blob.size
      images.push({
        blob,
        mimeType: blob.type || mimeType,
        revisedPrompt: typeof revisedPrompt === 'string' ? revisedPrompt : undefined,
      })
      continue
    }
    throw new ImageApiError('图片结果缺少可识别的 Base64 或 URL 字段')
  }

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
  const variables = await createRequestVariables(
    prompt,
    params,
    settings.model,
    referenceImages,
    requiresReferenceBase64,
    signal,
  )
  const isJson = operation.bodyMode === 'json'
  const requestBody = isJson
    ? JSON.stringify(buildJsonRequestBody(operation.bodyTemplate, variables))
    : buildMultipartRequestBody(operation.bodyTemplate, variables)
  return fetchWithTimeout(
    operation.url,
    {
      method: operation.method,
      headers: createHeaders(settings, isJson),
      body: requestBody,
    },
    settings.timeoutMs,
    signal,
    async (response, requestSignal) => {
      if (!response.ok) throw await parseApiError(response, requestSignal)
      throwIfAborted(requestSignal)
      return parseImageResponse(
        response,
        settings,
        getMimeTypeForFormat(params.format),
        requestSignal,
      )
    },
  )
}

export function requestImages(options: {
  settings: ApiSettings
  prompt: string
  params: GenParams
  referenceImages?: ReferenceImage[]
  signal?: AbortSignal
}): Promise<ImageApiResult> {
  const settings = parseApiSettings(options.settings)
  const params = parseGenerationParameters(options.params)
  const referenceImages = options.referenceImages ?? []
  const operation = referenceImages.length ? settings.edit : settings.generation
  return executeOperation(operation, settings, options.prompt, params, referenceImages, options.signal)
}

export async function testApiConnection(settings: ApiSettings): Promise<void> {
  const validatedSettings = parseApiSettings(settings)
  if (!validatedSettings.testUrl.trim()) throw new ImageApiError('请填写连接测试 URL')
  await fetchWithTimeout(
    validatedSettings.testUrl,
    {
      method: 'GET',
      headers: createHeaders(validatedSettings, false),
    },
    Math.min(validatedSettings.timeoutMs, 30_000),
    undefined,
    async (response, requestSignal) => {
      if (!response.ok) throw await parseApiError(response, requestSignal)
      if (response.body) void response.body.cancel().catch(() => undefined)
    },
  )
}
