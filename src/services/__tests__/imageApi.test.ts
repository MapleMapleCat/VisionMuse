import { afterEach, describe, expect, it, vi } from 'vitest'
import { cloneDefaultSettings } from '@/defaults/settings'
import { MEDIA_LIMITS } from '@/services/resourceLimits'
import { buildJsonRequestBody, buildMultipartRequestBody, requestImages } from '@/services/imageApi'

describe('custom image API request templates', () => {
  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

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
      'image[]': '{{referenceImageFile}}',
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

  it('uses one request with the selected n parameter by default', async () => {
    vi.stubGlobal('window', globalThis)
    const fetchMock = vi.fn(async (_url: string, _init?: RequestInit) => new Response(JSON.stringify({
      data: Array.from({ length: 4 }, (_, imageIndex) => ({
        b64_json: btoa(`generated-image-${imageIndex + 1}`),
      })),
    }), { status: 200, headers: { 'content-type': 'application/json' } }))
    vi.stubGlobal('fetch', fetchMock)

    const settings = cloneDefaultSettings().api
    settings.generationRequestMode = 'request-n'
    const result = await requestImages({
      settings,
      prompt: 'four variations',
      params: { size: '1024x1024', quality: 'medium', format: 'png', n: 4 },
    })

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const requestBody = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body)) as Record<string, unknown>
    expect(requestBody.n).toBe(4)
    expect(result.images).toHaveLength(4)
  })

  it('sends four simultaneous n=1 requests in parallel single-image mode', async () => {
    vi.stubGlobal('window', globalThis)
    let notifyAllRequestsStarted: (() => void) | undefined
    const allRequestsStarted = new Promise<void>(resolve => {
      notifyAllRequestsStarted = resolve
    })
    const requestBodies: Array<Record<string, unknown>> = []
    const fetchMock = vi.fn(async (_url: string, requestInit?: RequestInit) => {
      requestBodies.push(JSON.parse(String(requestInit?.body)) as Record<string, unknown>)
      const requestNumber = requestBodies.length
      if (requestNumber === 4) notifyAllRequestsStarted?.()
      await allRequestsStarted
      return new Response(JSON.stringify({
        data: [{ b64_json: btoa(`parallel-image-${requestNumber}`) }],
        usage: { requestNumber },
      }), { status: 200, headers: { 'content-type': 'application/json' } })
    })
    vi.stubGlobal('fetch', fetchMock)

    const settings = cloneDefaultSettings().api
    settings.generationRequestMode = 'parallel-single'
    const result = await requestImages({
      settings,
      prompt: 'four parallel variations',
      params: { size: '1024x1024', quality: 'medium', format: 'png', n: 4 },
    })

    expect(fetchMock).toHaveBeenCalledTimes(4)
    expect(requestBodies.map(requestBody => requestBody.n)).toEqual([1, 1, 1, 1])
    expect(result.images).toHaveLength(4)
    expect(result.usage).toEqual([
      { requestNumber: 1 },
      { requestNumber: 2 },
      { requestNumber: 3 },
      { requestNumber: 4 },
    ])
  })

  it('provides dimensions, aspect ratio, and resolution to request templates', async () => {
    vi.stubGlobal('window', globalThis)
    const fetchMock = vi.fn(async (_url: string, _init?: RequestInit) => new Response(JSON.stringify({
      data: [{ b64_json: btoa('generated-image') }],
    }), { status: 200, headers: { 'content-type': 'application/json' } }))
    vi.stubGlobal('fetch', fetchMock)

    const settings = cloneDefaultSettings().api
    settings.generation.bodyTemplate = JSON.stringify({
      width: '{{width}}',
      height: '{{height}}',
      aspect_ratio: '{{aspectRatio}}',
      resolution: '{{resolution}}',
    })

    await requestImages({
      settings,
      prompt: 'a cinematic landscape',
      params: { size: '4096x2304', quality: 'high', format: 'png', n: 1 },
    })

    const requestInit = fetchMock.mock.calls[0]?.[1]
    expect(JSON.parse(String(requestInit?.body))).toEqual({
      width: 4096,
      height: 2304,
      aspect_ratio: '16:9',
      resolution: '4K',
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

  it('attaches multiple reference images to one multipart field', () => {
    const firstReferenceBlob = new Blob(['first-reference'], { type: 'image/png' })
    const secondReferenceBlob = new Blob(['second-reference'], { type: 'image/webp' })
    const formData = buildMultipartRequestBody(
      '{"image[]":"{{referenceImageFile}}","prompt":"{{prompt}}"}',
      {
        prompt: 'combine these references',
        model: 'custom-image-model',
        size: '1024x1024',
        quality: 'medium',
        format: 'png',
        n: 1,
        referenceImageFile: [firstReferenceBlob, secondReferenceBlob],
        referenceFileName: ['first.png', 'second.webp'],
      },
    )

    expect(formData.getAll('image[]')).toHaveLength(2)
    expect(formData.getAll('image[]').every(value => value instanceof Blob)).toBe(true)
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

  it('rejects response arrays that exceed the image count budget', async () => {
    vi.stubGlobal('window', globalThis)
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({
      data: Array.from({ length: MEDIA_LIMITS.maximumApiResponseImageCount + 1 }, () => ({
        b64_json: btoa('generated-image'),
      })),
    }), { status: 200, headers: { 'content-type': 'application/json' } })))

    await expect(requestImages({
      settings: cloneDefaultSettings().api,
      prompt: 'too many outputs',
      params: { size: '1024x1024', quality: 'medium', format: 'png', n: 4 },
    })).rejects.toThrow('单次最多接收')
  })

  it('rejects oversized direct image responses from Content-Length before reading the body', async () => {
    vi.stubGlobal('window', globalThis)
    vi.stubGlobal('fetch', vi.fn(async () => new Response('small-placeholder', {
      status: 200,
      headers: {
        'content-type': 'image/png',
        'content-length': String(MEDIA_LIMITS.maximumApiResponseImageBytes + 1),
      },
    })))

    await expect(requestImages({
      settings: cloneDefaultSettings().api,
      prompt: 'oversized response',
      params: { size: '1024x1024', quality: 'medium', format: 'png', n: 1 },
    })).rejects.toThrow('接口图片响应超过')
  })

  it('rejects Base64 reference inputs over their cumulative budget before conversion', async () => {
    vi.stubGlobal('window', globalThis)
    const firstReferenceBlob = new Blob(['first-placeholder'], { type: 'image/png' })
    const secondReferenceBlob = new Blob(['second-placeholder'], { type: 'image/png' })
    const referenceBlobBytes = Math.floor(MEDIA_LIMITS.maximumBase64ReferenceTotalBytes / 2) + 1
    Object.defineProperty(firstReferenceBlob, 'size', { value: referenceBlobBytes })
    Object.defineProperty(secondReferenceBlob, 'size', { value: referenceBlobBytes })
    const settings = cloneDefaultSettings().api
    settings.edit.bodyMode = 'json'
    settings.edit.bodyTemplate = '{"image":"{{referenceImageBase64}}"}'

    await expect(requestImages({
      settings,
      prompt: 'oversized reference',
      params: { size: '1024x1024', quality: 'medium', format: 'png', n: 1 },
      referenceImages: [firstReferenceBlob, secondReferenceBlob].map((blob, referenceIndex) => ({
        blob,
        previewUrl: '',
        fileName: `oversized-${referenceIndex + 1}.png`,
        mimeType: 'image/png',
        width: 1024,
        height: 1024,
      })),
    })).rejects.toThrow('Base64 模式下参考图总大小')
  })

  it('does not count active response transmission toward the response wait timeout', async () => {
    vi.useFakeTimers()
    vi.stubGlobal('window', globalThis)
    const encodedResponse = JSON.stringify({
      data: [{ b64_json: btoa('slowly-transferred-image') }],
    })
    const responseEncoder = new TextEncoder()
    const responseBody = new ReadableStream<Uint8Array>({
      start(controller) {
        window.setTimeout(() => {
          controller.enqueue(responseEncoder.encode(encodedResponse.slice(0, 10)))
        }, 900)
        window.setTimeout(() => {
          controller.enqueue(responseEncoder.encode(encodedResponse.slice(10)))
          controller.close()
        }, 1_800)
      },
    })
    vi.stubGlobal('fetch', vi.fn(async () => new Response(responseBody, {
      status: 200,
      headers: { 'content-type': 'application/json' },
    })))
    const settings = cloneDefaultSettings().api
    settings.timeoutMs = 1_000

    const requestPromise = requestImages({
      settings,
      prompt: 'slow response transmission',
      params: { size: '1024x1024', quality: 'medium', format: 'png', n: 1 },
    })

    await vi.advanceTimersByTimeAsync(1_800)

    const result = await requestPromise
    expect(await result.images[0].blob.text()).toBe('slowly-transferred-image')
  })

  it('still enforces the timeout while waiting for response headers', async () => {
    vi.useFakeTimers()
    vi.stubGlobal('window', globalThis)
    vi.stubGlobal('fetch', vi.fn((_url: string, requestInit?: RequestInit) => new Promise<Response>((_resolve, reject) => {
      const requestSignal = requestInit?.signal
      requestSignal?.addEventListener('abort', () => reject(requestSignal.reason), { once: true })
    })))
    const settings = cloneDefaultSettings().api
    settings.timeoutMs = 1_000
    const requestPromise = requestImages({
      settings,
      prompt: 'response that never starts',
      params: { size: '1024x1024', quality: 'medium', format: 'png', n: 1 },
    })
    const rejectionExpectation = expect(requestPromise).rejects.toThrow(
      '请求超过 1 秒，已停止等待',
    )

    await vi.advanceTimersByTimeAsync(1_000)

    await rejectionExpectation
  })

  it('stops response transmission after a full timeout interval without data', async () => {
    vi.useFakeTimers()
    vi.stubGlobal('window', globalThis)
    let responseBodyWasCanceled = false
    const stalledResponseBody = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new TextEncoder().encode('{"data":['))
      },
      cancel() {
        responseBodyWasCanceled = true
      },
    })
    vi.stubGlobal('fetch', vi.fn(async () => new Response(stalledResponseBody, {
      status: 200,
      headers: { 'content-type': 'application/json' },
    })))
    const settings = cloneDefaultSettings().api
    settings.timeoutMs = 1_000
    const requestPromise = requestImages({
      settings,
      prompt: 'stalled response transmission',
      params: { size: '1024x1024', quality: 'medium', format: 'png', n: 1 },
    })
    const rejectionExpectation = expect(requestPromise).rejects.toThrow(
      '接口 JSON 响应传输超过 1 秒未收到数据',
    )

    await vi.advanceTimersByTimeAsync(1_000)

    await rejectionExpectation
    expect(responseBodyWasCanceled).toBe(true)
  })

  it('aborts a response body that stalls after sending headers', async () => {
    vi.stubGlobal('window', globalThis)
    let notifyFetchStarted: (() => void) | undefined
    const fetchStarted = new Promise<void>(resolve => {
      notifyFetchStarted = resolve
    })
    let bodyWasCanceled = false
    const stalledBody = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new TextEncoder().encode('{"data":['))
      },
      cancel() {
        bodyWasCanceled = true
      },
    })
    vi.stubGlobal('fetch', vi.fn(async () => {
      notifyFetchStarted?.()
      return new Response(stalledBody, {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    }))
    const requestController = new AbortController()
    const requestPromise = requestImages({
      settings: cloneDefaultSettings().api,
      prompt: 'stalled response',
      params: { size: '1024x1024', quality: 'medium', format: 'png', n: 1 },
      signal: requestController.signal,
    })

    await fetchStarted
    await Promise.resolve()
    requestController.abort(new DOMException('test cancellation', 'AbortError'))

    await expect(requestPromise).rejects.toThrow('test cancellation')
    expect(bodyWasCanceled).toBe(true)
  })

  it('rejects reference image counts above the service boundary', async () => {
    vi.stubGlobal('window', globalThis)
    const settings = cloneDefaultSettings().api
    const referenceImages = Array.from({ length: 17 }, (_, referenceIndex) => ({
      blob: new Blob(['x'], { type: 'image/png' }),
      previewUrl: '',
      fileName: `reference-${referenceIndex + 1}.png`,
      mimeType: 'image/png',
      width: 1,
      height: 1,
    }))

    await expect(requestImages({
      settings,
      prompt: 'too many references',
      params: { size: '1024x1024', quality: 'medium', format: 'png', n: 1 },
      referenceImages,
    })).rejects.toThrow('参考图不能超过 16 张')
  })
})
