import { describe, expect, it } from 'vitest'
import {
  composePrompt,
  createPromptCompositionInput,
} from '@/services/promptComposition'
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

const calmExpressionModule: PromptModule = {
  id: 'expression-calm-test',
  title: 'Calm',
  content: '神情平静',
  category: 'expression',
  useCount: 0,
  sortOrder: 20,
}

const cameraExpressionModule: PromptModule = {
  id: 'expression-camera-test',
  title: 'Camera',
  content: '直视镜头',
  category: 'expression',
  useCount: 0,
  sortOrder: 10,
}

describe('composePrompt', () => {
  it('keeps the user overview separate from categorized constraint blocks', () => {
    const compositionInput = createPromptCompositionInput(
      '一只黑猫',
      [lightingModule, styleModule],
    )

    expect(composePrompt(compositionInput)).toBe([
      '一只黑猫',
      '',
      '{光线：柔和自然窗光}',
      '{风格媒介：电影感摄影}',
    ].join('\n'))
  })

  it('creates structured constraint data before serializing the prompt', () => {
    const compositionInput = createPromptCompositionInput(
      '一位女性',
      [calmExpressionModule, cameraExpressionModule],
    )

    expect(compositionInput).toEqual({
      overview: '一位女性',
      constraints: [{
        category: 'expression',
        label: '表情与视线',
        prompts: ['直视镜头', '神情平静'],
      }],
    })
    expect(composePrompt(compositionInput))
      .toBe('一位女性\n\n{表情与视线：直视镜头；神情平静}')
  })

  it('supports constraint blocks without a user overview', () => {
    const compositionInput = createPromptCompositionInput('', [lightingModule, styleModule])

    expect(composePrompt(compositionInput))
      .toBe('{光线：柔和自然窗光}\n{风格媒介：电影感摄影}')
  })

  it('returns a normalized overview when no modules are selected', () => {
    const compositionInput = createPromptCompositionInput('  一座海边灯塔。 ', [])

    expect(composePrompt(compositionInput)).toBe('一座海边灯塔')
  })
})
