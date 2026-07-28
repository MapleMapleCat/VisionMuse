import { describe, expect, it } from 'vitest'
import { getImageAspectRatio, getImageResolution, getImageSize, parseImageAspectRatio } from '@/types'

describe('image size selection', () => {
  it('maps aspect ratio and resolution to an API size', () => {
    expect(getImageSize('1:1', '1K')).toBe('1024x1024')
    expect(getImageSize('3:2', '1K')).toBe('1536x1024')
    expect(getImageSize('2:3', '2K')).toBe('1344x2016')
    expect(getImageSize('16:9', '4K')).toBe('4096x2304')
    expect(getImageSize('9:16', '4K')).toBe('2304x4096')
    expect(getImageSize('21:9', '4K')).toBe('4095x1755')
  })

  it('restores aspect ratio and resolution from stored sizes', () => {
    expect(getImageAspectRatio('2016x1344')).toBe('3:2')
    expect(getImageResolution('2016x1344')).toBe('2K')
    expect(getImageAspectRatio('3072x4096')).toBe('3:4')
    expect(getImageResolution('3072x4096')).toBe('4K')
  })

  it('parses and normalizes custom aspect ratios', () => {
    expect(parseImageAspectRatio(' 32：18 ')).toEqual({ width: 16, height: 9, normalized: '16:9' })
    expect(parseImageAspectRatio('21:9')).toEqual({ width: 7, height: 3, normalized: '7:3' })
    expect(parseImageAspectRatio('wide')).toBeNull()
  })
})
