import { afterEach, describe, expect, it, vi } from 'vitest'
import { cloneDefaultSettings } from '@/defaults/settings'
import { buildJsonRequestBody, buildMultipartRequestBody, requestImages } from '@/services/imageApi'

describe('custom image API request templates', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('requests base64 image responses in the default templates', () => {
    const settings = cloneDefaultSettings().api
    const generationBody = JSON.parse(settings.generation.bodyTemplate) as Record<string, unknown>
    const editBody = JSON.parse(settings.edit.bodyTemplate) as Record<string, unknown>

    expect(generationBody).toMatchObject({
      model: '{{model}}',
      output_format: '{{format}}',
      response_format: 'b64_json',
    })
    expect(editBody).toMatchObject({
      image: '{{referenceImageFile}}',
      output_format: '{{format}}',
      response_format: 'b64_json',
    })
  })

  it('preserves typed values for exact placeholders', () => {
    const body = buildJsonRequestBody(
      '{"prompt":"{{prompt}}","count":"{{n}}","label":"size={{size}}"}',
      {
        prompt: 'misty mountain',
        model: 'custom-image-model',
        size: '1024x1024',
        quality: 'high',
        format: 'png',
        n: 3,
      },
    )

    expect(body).toEqual({
      prompt: 'misty mountain',
      count: 3,
      label: 'size=1024x1024',
    })
  })

  it('attaches reference images to configurable multipart fields', () => {
    const referenceBlob = new Blob(['reference'], { type: 'image/png' })
    const formData = buildMultipartRequestBody(
      '{"source":"{{referenceImageFile}}","prompt":"{{prompt}}"}',
      {
        prompt: 'make it cinematic',
        model: 'custom-image-model',
        size: '1024x1024',
        quality: 'medium',
        format: 'png',
        n: 1,
        referenceImageFile: referenceBlob,
        referenceFileName: 'source.png',
      },
    )

    expect(formData.get('prompt')).toBe('make it cinematic')
    expect(formData.get('source')).toBeInstanceOf(Blob)
  })

  it('rejects file placeholders in JSON mode instead of serializing an empty object', () => {
    expect(() => buildJsonRequestBody(
      '{"image":"{{referenceImageFile}}"}',
      {
        prompt: 'edit this',
        model: 'custom-image-model',
        size: '1024x1024',
        quality: 'medium',
        format: 'png',
        n: 1,
        referenceImageFile: new Blob(['reference'], { type: 'image/png' }),
      },
    )).toThrow('JSON 请求体不能使用')
  })

  it('parses default b64_json image responses', async () => {
    vi.stubGlobal('window', globalThis)
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({
      created: 1_713_833_628,
      data: [{ b64_json: btoa('generated-image') }],
      usage: { total_tokens: 100 },
    }), { status: 200, headers: { 'content-type': 'application/json' } })))

    const result = await requestImages({
      settings: cloneDefaultSettings().api,
      prompt: 'a quiet lake',
      params: { size: '1024x1024', quality: 'medium', format: 'png', n: 1 },
    })

    expect(result.images).toHaveLength(1)
    expect(result.images[0].mimeType).toBe('image/png')
    expect(await result.images[0].blob.text()).toBe('generated-image')
    expect(result.usage).toEqual({ total_tokens: 100 })
  })

  it('parses a custom base64 response mapping', async () => {
    vi.stubGlobal('window', globalThis)
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({
      output: [{ encoded: btoa('generated-image'), mime: 'image/png', rewritten: 'revised prompt' }],
      billing: { outputTokens: 12 },
    }), { status: 200, headers: { 'content-type': 'application/json' } })))

    const settings = cloneDefaultSettings().api
    settings.generation.url = 'https://images.example.test/generate'
    settings.response = {
      itemsPath: 'output',
      base64Path: 'encoded',
      urlPath: '',
      mimeTypePath: 'mime',
      revisedPromptPath: 'rewritten',
      usagePath: 'billing',
    }

    const result = await requestImages({
      settings,
      prompt: 'a quiet lake',
      params: { size: '1024x1024', quality: 'medium', format: 'png', n: 1 },
    })

    expect(result.images).toHaveLength(1)
    expect(result.images[0].mimeType).toBe('image/png')
    expect(result.images[0].revisedPrompt).toBe('revised prompt')
    expect(await result.images[0].blob.text()).toBe('generated-image')
    expect(result.usage).toEqual({ outputTokens: 12 })
  })

  it('supports scalar results with $ while blank mappings stay disabled', async () => {
    vi.stubGlobal('window', globalThis)
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({
      output: [btoa('scalar-image')],
    }), { status: 200, headers: { 'content-type': 'application/json' } })))

    const settings = cloneDefaultSettings().api
    settings.response = {
      itemsPath: 'output',
      base64Path: '$',
      urlPath: '',
      mimeTypePath: '',
      revisedPromptPath: '',
      usagePath: '',
    }
    const result = await requestImages({
      settings,
      prompt: 'scalar response',
      params: { size: '1024x1024', quality: 'low', format: 'png', n: 1 },
    })

    expect(await result.images[0].blob.text()).toBe('scalar-image')
    expect(result.usage).toBeUndefined()
  })
})
