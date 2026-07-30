import { cloneDefaultSettings } from '@/defaults/settings'
import type {
  ApiOperationConfig,
  ApiRequestConfig,
  ApiResponseMapping,
  ApiSettings,
  AppSettings,
  GenParams,
  ImageFormat,
  ImageQuality,
} from '@/types'

type ValidationMode = 'normalize' | 'reject'
type UnknownRecord = Record<string, unknown>

interface NumberConstraints {
  minimum: number
  maximum: number
  integer?: boolean
}

interface StringConstraints {
  maximumLength: number
  allowEmpty?: boolean
  trim?: boolean
}

const API_TIMEOUT_CONSTRAINTS: NumberConstraints = {
  minimum: 1_000,
  maximum: 10 * 60 * 1_000,
  integer: true,
}
const API_CONCURRENCY_CONSTRAINTS: NumberConstraints = {
  minimum: 1,
  maximum: 8,
  integer: true,
}
const IMAGE_COUNT_CONSTRAINTS: NumberConstraints = {
  minimum: 1,
  maximum: 4,
  integer: true,
}
const COST_CONSTRAINTS: NumberConstraints = {
  minimum: 0,
  maximum: 10_000,
}
const DAILY_BUDGET_CONSTRAINTS: NumberConstraints = {
  minimum: 0,
  maximum: 1_000_000,
}

function isRecord(value: unknown): value is UnknownRecord {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function hasOwnProperty(source: UnknownRecord, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(source, key)
}

function rejectOrUseDefault<Value>(
  mode: ValidationMode,
  path: string,
  expectedDescription: string,
  defaultValue: Value,
): Value {
  if (mode === 'reject') {
    throw new Error(`${path} 无效，应为${expectedDescription}`)
  }
  return defaultValue
}

function readRecord(
  source: UnknownRecord,
  key: string,
  path: string,
  mode: ValidationMode,
): UnknownRecord {
  if (!hasOwnProperty(source, key)) return {}
  const value = source[key]
  if (isRecord(value)) return value
  return rejectOrUseDefault(mode, path, '对象', {})
}

function readString(
  source: UnknownRecord,
  key: string,
  defaultValue: string,
  path: string,
  mode: ValidationMode,
  constraints: StringConstraints,
): string {
  if (!hasOwnProperty(source, key)) return defaultValue
  const value = source[key]
  if (typeof value !== 'string') {
    return rejectOrUseDefault(mode, path, '字符串', defaultValue)
  }

  const normalizedValue = constraints.trim ? value.trim() : value
  const valueIsEmptyButRequired = !constraints.allowEmpty && normalizedValue.length === 0
  if (valueIsEmptyButRequired || normalizedValue.length > constraints.maximumLength) {
    const emptyDescription = constraints.allowEmpty ? '' : '非空、'
    return rejectOrUseDefault(
      mode,
      path,
      `${emptyDescription}长度不超过 ${constraints.maximumLength} 的字符串`,
      defaultValue,
    )
  }
  return normalizedValue
}

function readBoolean(
  source: UnknownRecord,
  key: string,
  defaultValue: boolean,
  path: string,
  mode: ValidationMode,
): boolean {
  if (!hasOwnProperty(source, key)) return defaultValue
  const value = source[key]
  if (typeof value === 'boolean') return value
  return rejectOrUseDefault(mode, path, '布尔值', defaultValue)
}

function readNumber(
  source: UnknownRecord,
  key: string,
  defaultValue: number,
  path: string,
  mode: ValidationMode,
  constraints: NumberConstraints,
): number {
  if (!hasOwnProperty(source, key)) return defaultValue
  const value = source[key]
  const numberIsValid = typeof value === 'number'
    && Number.isFinite(value)
    && (!constraints.integer || Number.isInteger(value))
    && value >= constraints.minimum
    && value <= constraints.maximum
  if (numberIsValid) return value

  const numberKind = constraints.integer ? '整数' : '有限数字'
  return rejectOrUseDefault(
    mode,
    path,
    `${constraints.minimum} 到 ${constraints.maximum} 之间的${numberKind}`,
    defaultValue,
  )
}

function readEnum<Value extends string>(
  source: UnknownRecord,
  key: string,
  defaultValue: Value,
  path: string,
  mode: ValidationMode,
  allowedValues: readonly Value[],
): Value {
  if (!hasOwnProperty(source, key)) return defaultValue
  const value = source[key]
  if (typeof value === 'string' && allowedValues.includes(value as Value)) return value as Value
  return rejectOrUseDefault(mode, path, allowedValues.join('、'), defaultValue)
}

function readRootRecord(value: unknown, context: string, mode: ValidationMode): UnknownRecord {
  if (isRecord(value)) return value
  return rejectOrUseDefault(mode, context, '对象', {})
}

function parseExtraHeaders(
  source: UnknownRecord,
  defaultValue: string,
  path: string,
  mode: ValidationMode,
): string {
  const serializedHeaders = readString(source, 'extraHeaders', defaultValue, path, mode, {
    allowEmpty: true,
    maximumLength: 64 * 1024,
  })
  try {
    const parsedHeaders: unknown = JSON.parse(serializedHeaders || '{}')
    if (!isRecord(parsedHeaders)) throw new Error('必须是 JSON 对象')
    return serializedHeaders
  } catch {
    return rejectOrUseDefault(mode, path, '有效的 JSON 对象字符串', defaultValue)
  }
}

function parseApiOperation(
  value: unknown,
  defaults: ApiOperationConfig,
  context: string,
  mode: ValidationMode,
): ApiOperationConfig {
  const source = readRootRecord(value, context, mode)
  return {
    url: readString(source, 'url', defaults.url, `${context}.url`, mode, {
      allowEmpty: true,
      maximumLength: 4_096,
      trim: true,
    }),
    method: readEnum(
      source,
      'method',
      defaults.method,
      `${context}.method`,
      mode,
      ['POST', 'PUT', 'PATCH'] as const,
    ),
    bodyMode: readEnum(
      source,
      'bodyMode',
      defaults.bodyMode,
      `${context}.bodyMode`,
      mode,
      ['json', 'multipart'] as const,
    ),
    bodyTemplate: readString(
      source,
      'bodyTemplate',
      defaults.bodyTemplate,
      `${context}.bodyTemplate`,
      mode,
      { maximumLength: 1024 * 1024 },
    ),
  }
}

function parseApiResponseMapping(
  value: unknown,
  defaults: ApiResponseMapping,
  context: string,
  mode: ValidationMode,
): ApiResponseMapping {
  const source = readRootRecord(value, context, mode)
  const readPath = (key: keyof ApiResponseMapping) => readString(
    source,
    key,
    defaults[key],
    `${context}.${key}`,
    mode,
    { allowEmpty: true, maximumLength: 512, trim: true },
  )

  return {
    itemsPath: readPath('itemsPath'),
    base64Path: readPath('base64Path'),
    urlPath: readPath('urlPath'),
    mimeTypePath: readPath('mimeTypePath'),
    revisedPromptPath: readPath('revisedPromptPath'),
    usagePath: readPath('usagePath'),
  }
}

function parseApiSettingsWithMode(
  value: unknown,
  context: string,
  mode: ValidationMode,
): ApiSettings {
  const defaults = cloneDefaultSettings().api
  const source = readRootRecord(value, context, mode)
  const generationSource = readRecord(source, 'generation', `${context}.generation`, mode)
  const editSource = readRecord(source, 'edit', `${context}.edit`, mode)
  const responseSource = readRecord(source, 'response', `${context}.response`, mode)

  return {
    apiKey: readString(source, 'apiKey', defaults.apiKey, `${context}.apiKey`, mode, {
      allowEmpty: true,
      maximumLength: 20_000,
    }),
    model: readString(source, 'model', defaults.model, `${context}.model`, mode, {
      allowEmpty: true,
      maximumLength: 256,
      trim: true,
    }),
    authHeader: readString(source, 'authHeader', defaults.authHeader, `${context}.authHeader`, mode, {
      allowEmpty: true,
      maximumLength: 256,
      trim: true,
    }),
    authPrefix: readString(source, 'authPrefix', defaults.authPrefix, `${context}.authPrefix`, mode, {
      allowEmpty: true,
      maximumLength: 256,
    }),
    extraHeaders: parseExtraHeaders(source, defaults.extraHeaders, `${context}.extraHeaders`, mode),
    testUrl: readString(source, 'testUrl', defaults.testUrl, `${context}.testUrl`, mode, {
      allowEmpty: true,
      maximumLength: 4_096,
      trim: true,
    }),
    timeoutMs: readNumber(
      source,
      'timeoutMs',
      defaults.timeoutMs,
      `${context}.timeoutMs`,
      mode,
      API_TIMEOUT_CONSTRAINTS,
    ),
    maxConcurrent: readNumber(
      source,
      'maxConcurrent',
      defaults.maxConcurrent,
      `${context}.maxConcurrent`,
      mode,
      API_CONCURRENCY_CONSTRAINTS,
    ),
    generationRequestMode: readEnum(
      source,
      'generationRequestMode',
      defaults.generationRequestMode,
      `${context}.generationRequestMode`,
      mode,
      ['request-n', 'parallel-single'] as const,
    ),
    generation: parseApiOperation(generationSource, defaults.generation, `${context}.generation`, mode),
    edit: parseApiOperation(editSource, defaults.edit, `${context}.edit`, mode),
    response: parseApiResponseMapping(responseSource, defaults.response, `${context}.response`, mode),
  }
}

function parseGenerationParametersWithMode(
  value: unknown,
  defaults: GenParams,
  context: string,
  mode: ValidationMode,
): GenParams {
  const source = readRootRecord(value, context, mode)
  const size = readString(source, 'size', defaults.size, `${context}.size`, mode, {
    maximumLength: 11,
    trim: true,
  })
  const sizeMatch = size.match(/^([1-9]\d{0,4})x([1-9]\d{0,4})$/)
  const sizeIsSupported = Boolean(
    sizeMatch
    && Number(sizeMatch[1]) <= 16_384
    && Number(sizeMatch[2]) <= 16_384,
  )

  return {
    size: sizeIsSupported
      ? size as GenParams['size']
      : rejectOrUseDefault(mode, `${context}.size`, '最大 16384x16384 的 宽x高 字符串', defaults.size),
    quality: readEnum<ImageQuality>(
      source,
      'quality',
      defaults.quality,
      `${context}.quality`,
      mode,
      ['low', 'medium', 'high'],
    ),
    format: readEnum<ImageFormat>(
      source,
      'format',
      defaults.format,
      `${context}.format`,
      mode,
      ['png', 'webp', 'jpeg'],
    ),
    n: readNumber(source, 'n', defaults.n, `${context}.n`, mode, IMAGE_COUNT_CONSTRAINTS),
  }
}

function parseAppSettingsWithMode(
  value: unknown,
  context: string,
  mode: ValidationMode,
): AppSettings {
  const defaults = cloneDefaultSettings()
  const source = readRootRecord(value, context, mode)
  const apiSource = readRecord(source, 'api', `${context}.api`, mode)
  const defaultParamsSource = readRecord(source, 'defaultParams', `${context}.defaultParams`, mode)
  const costSource = readRecord(
    source,
    'estimatedCostByQuality',
    `${context}.estimatedCostByQuality`,
    mode,
  )

  return {
    api: parseApiSettingsWithMode(apiSource, `${context}.api`, mode),
    defaultParams: parseGenerationParametersWithMode(
      defaultParamsSource,
      defaults.defaultParams,
      `${context}.defaultParams`,
      mode,
    ),
    budgetDaily: readNumber(
      source,
      'budgetDaily',
      defaults.budgetDaily,
      `${context}.budgetDaily`,
      mode,
      DAILY_BUDGET_CONSTRAINTS,
    ),
    autoDownloadOriginals: readBoolean(
      source,
      'autoDownloadOriginals',
      defaults.autoDownloadOriginals,
      `${context}.autoDownloadOriginals`,
      mode,
    ),
    estimatedCostByQuality: {
      low: readNumber(
        costSource,
        'low',
        defaults.estimatedCostByQuality.low,
        `${context}.estimatedCostByQuality.low`,
        mode,
        COST_CONSTRAINTS,
      ),
      medium: readNumber(
        costSource,
        'medium',
        defaults.estimatedCostByQuality.medium,
        `${context}.estimatedCostByQuality.medium`,
        mode,
        COST_CONSTRAINTS,
      ),
      high: readNumber(
        costSource,
        'high',
        defaults.estimatedCostByQuality.high,
        `${context}.estimatedCostByQuality.high`,
        mode,
        COST_CONSTRAINTS,
      ),
    },
  }
}

export function normalizeAppSettings(value: unknown): AppSettings {
  return parseAppSettingsWithMode(value, '设置', 'normalize')
}

export function parseAppSettings(value: unknown, context = '设置'): AppSettings {
  return parseAppSettingsWithMode(value, context, 'reject')
}

export function normalizeApiSettings(value: unknown): ApiSettings {
  return parseApiSettingsWithMode(value, 'API 设置', 'normalize')
}

export function parseApiSettings(value: unknown, context = 'API 设置'): ApiSettings {
  return parseApiSettingsWithMode(value, context, 'reject')
}

export function parseApiRequestConfig(value: unknown, context = 'API 请求配置'): ApiRequestConfig {
  const parsedSettings = parseApiSettingsWithMode(
    isRecord(value) ? { ...value, apiKey: '' } : value,
    context,
    'reject',
  )
  const { apiKey: _apiKey, ...requestConfig } = parsedSettings
  return requestConfig
}

export function parseGenerationParameters(value: unknown, context = '生成参数'): GenParams {
  return parseGenerationParametersWithMode(
    value,
    cloneDefaultSettings().defaultParams,
    context,
    'reject',
  )
}
