import { describe, expect, it } from 'vitest'
import { getImageAspectRatio, getImageResolution, getImageSize } from '@/types'

describe('image size selection', () => {
  it('maps aspect ratio and resolution to an API size', () => {
    expect(getImageSize('1:1', '1K')).toBe('1024x1024')
    expect(getImageSize('3:2', '1K')).toBe('1536x1024')
    expect(getImageSize('2:3', '2K')).toBe('1344x2016')
  })

  it('restores aspect ratio and resolution from stored sizes', () => {
    expect(getImageAspectRatio('2016x1344')).toBe('3:2')
    expect(getImageResolution('2016x1344')).toBe('2K')
  })
})
