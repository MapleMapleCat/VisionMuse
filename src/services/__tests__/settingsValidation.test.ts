import { describe, expect, it } from 'vitest'
import { cloneDefaultSettings } from '@/defaults/settings'
import {
  normalizeAppSettings,
  parseAppSettings,
  parseGenerationParameters,
} from '@/services/settingsValidation'

describe('runtime settings validation', () => {
  it('normalizes corrupted persisted values to safe defaults', () => {
    const normalizedSettings = normalizeAppSettings({
      api: {
        timeoutMs: 0,
        maxConcurrent: -4,
        generation: { url: 42 },
      },
      defaultParams: { n: 99, quality: 'ultra' },
      budgetDaily: Number.NaN,
    })
    const defaults = cloneDefaultSettings()

    expect(normalizedSettings.api.timeoutMs).toBe(defaults.api.timeoutMs)
    expect(normalizedSettings.api.maxConcurrent).toBe(defaults.api.maxConcurrent)
    expect(normalizedSettings.api.generation.url).toBe(defaults.api.generation.url)
    expect(normalizedSettings.defaultParams).toEqual(defaults.defaultParams)
    expect(normalizedSettings.budgetDaily).toBe(defaults.budgetDaily)
  })

  it('rejects explicit invalid values at save and import boundaries', () => {
    const settings = cloneDefaultSettings()
    settings.api.maxConcurrent = 0

    expect(() => parseAppSettings(settings, '备份中的设置'))
      .toThrow('备份中的设置.api.maxConcurrent')
  })

  it('fills fields missing from older settings while preserving valid values', () => {
    const parsedSettings = parseAppSettings({
      api: {
        generation: { url: ' https://images.example.test/generate ' },
      },
      defaultParams: { quality: 'high' },
    })

    expect(parsedSettings.api.generation.url).toBe('https://images.example.test/generate')
    expect(parsedSettings.api.maxConcurrent).toBe(cloneDefaultSettings().api.maxConcurrent)
    expect(parsedSettings.defaultParams.quality).toBe('high')
    expect(parsedSettings.defaultParams.n).toBe(1)
  })

  it('rejects invalid request enums and image counts', () => {
    expect(() => parseGenerationParameters({
      size: '1024x1024',
      quality: 'medium',
      format: 'png',
      n: 0,
    })).toThrow('生成参数.n')

    expect(() => parseGenerationParameters({
      size: '1024x1024',
      quality: 'ultra',
      format: 'bitmap',
      n: 1,
    })).toThrow('生成参数.quality')

    expect(() => parseAppSettings({
      api: {
        generation: { method: 'DELETE' },
        edit: { bodyMode: 'binary' },
      },
    })).toThrow('设置.api.generation.method')

    const settings = cloneDefaultSettings()
    settings.api.extraHeaders = '[]'
    expect(() => parseAppSettings(settings)).toThrow('设置.api.extraHeaders')
  })
})
