import type { AppSettings } from '@/types'

const OPENAI_GENERATION_BODY = JSON.stringify({
  model: '{{model}}',
  prompt: '{{prompt}}',
  size: '{{size}}',
  quality: '{{quality}}',
  output_format: '{{format}}',
  n: '{{n}}',
  response_format: 'b64_json',
}, null, 2)

export const LEGACY_OPENAI_EDIT_BODY = JSON.stringify({
  model: '{{model}}',
  prompt: '{{prompt}}',
  image: '{{referenceImageFile}}',
  size: '{{size}}',
  quality: '{{quality}}',
  output_format: '{{format}}',
  n: '{{n}}',
  response_format: 'b64_json',
}, null, 2)

const OPENAI_EDIT_BODY = JSON.stringify({
  model: '{{model}}',
  prompt: '{{prompt}}',
  'image[]': '{{referenceImageFile}}',
  size: '{{size}}',
  quality: '{{quality}}',
  output_format: '{{format}}',
  n: '{{n}}',
  response_format: 'b64_json',
}, null, 2)

export const DEFAULT_SETTINGS: AppSettings = {
  api: {
    apiKey: '',
    model: 'gpt-image-2',
    authHeader: 'Authorization',
    authPrefix: 'Bearer ',
    extraHeaders: '{}',
    testUrl: 'https://api.openai.com/v1/models/gpt-image-2',
    timeoutMs: 180_000,
    maxConcurrent: 2,
    generation: {
      url: 'https://api.openai.com/v1/images/generations',
      method: 'POST',
      bodyMode: 'json',
      bodyTemplate: OPENAI_GENERATION_BODY,
    },
    edit: {
      url: 'https://api.openai.com/v1/images/edits',
      method: 'POST',
      bodyMode: 'multipart',
      bodyTemplate: OPENAI_EDIT_BODY,
    },
    response: {
      itemsPath: 'data',
      base64Path: 'b64_json',
      urlPath: 'url',
      mimeTypePath: '',
      revisedPromptPath: 'revised_prompt',
      usagePath: 'usage',
    },
  },
  defaultParams: {
    size: '1024x1024',
    quality: 'medium',
    format: 'png',
    n: 1,
  },
  budgetDaily: 5,
  autoDownloadOriginals: false,
  estimatedCostByQuality: {
    low: 0.02,
    medium: 0.07,
    high: 0.19,
  },
}

export function cloneDefaultSettings(): AppSettings {
  return structuredClone(DEFAULT_SETTINGS)
}
