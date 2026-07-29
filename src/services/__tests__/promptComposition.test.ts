import { describe, expect, it } from 'vitest'
import { composePrompt } from '@/services/promptComposition'
import type { PromptModule } from '@/types'

const styleModule: PromptModule = {
  id: 'style-test',
  title: 'Style',
  content: '电影感摄影，',
  category: 'style',
  useCount: 0,
  sortOrder: 10,
}

const lightingModule: PromptModule = {
  id: 'lighting-test',
  title: 'Lighting',
  content: ' 柔和自然窗光 ',
  category: 'lighting',
  useCount: 0,
  sortOrder: 10,
}

describe('composePrompt', () => {
  it('composes the core content and modules in atomic category order', () => {
    expect(composePrompt('一只黑猫', [lightingModule, styleModule]))
      .toBe('一只黑猫，柔和自然窗光，电影感摄影')
  })

  it('supports composing module fragments without core content', () => {
    expect(composePrompt('', [lightingModule, styleModule]))
      .toBe('柔和自然窗光，电影感摄影')
  })

  it('returns a clean subject when no modules are selected', () => {
    expect(composePrompt('  一座海边灯塔。 ', [])).toBe('一座海边灯塔')
  })
})
