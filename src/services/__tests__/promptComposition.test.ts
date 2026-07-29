import { describe, expect, it } from 'vitest'
import { DEFAULT_PROMPT_MODULES } from '@/assets/prompt-modules'
import {
  composePrompt,
  createPromptCompositionInput,
} from '@/services/promptComposition'

describe('composePrompt', () => {
  it('keeps the user overview separate from hierarchical constraint blocks', () => {
    const selectedChoiceIds = [
      'module-style-photography',
      'module-capture-handheld',
      'module-capture-operator-crouching',
      'module-angle-low',
      'module-angle-upward-pitch',
    ]

    const compositionInput = createPromptCompositionInput(
      '一位女性摄影师',
      selectedChoiceIds,
      DEFAULT_PROMPT_MODULES,
    )

    expect(compositionInput.constraints.map(constraint => constraint.label)).toEqual([
      '表现媒介',
      '拍摄方式',
      '摄影者姿势',
      '相机高度',
      '相机角度',
    ])
    expect(composePrompt(compositionInput)).toContain([
      '一位女性摄影师',
      '',
      '{表现媒介：以真实相机摄影作为画面形成方式',
    ].join('\n'))
    expect(composePrompt(compositionInput)).toContain('{拍摄方式：采用摄影者人手持机拍摄')
    expect(composePrompt(compositionInput)).toContain('{摄影者姿势：摄影者屈膝降低身体重心')
    expect(composePrompt(compositionInput)).toContain('{相机高度：摄影机镜头中心位于主体主要视觉中心下方')
    expect(composePrompt(compositionInput)).toContain('{相机角度：摄影机光轴明确向上仰起')
  })

  it('groups compatible selections from the same taxonomy group', () => {
    const compositionInput = createPromptCompositionInput(
      '一位女性',
      ['module-detail-realistic', 'module-detail-polished'],
      DEFAULT_PROMPT_MODULES,
    )

    expect(compositionInput).toEqual({
      overview: '一位女性',
      constraints: [{
        category: 'group-material-overall-quality',
        label: '整体表现',
        prompts: [
          '准确呈现不同材质的粗糙度、反射率、透明度和微小表面变化，使接触关系与物理响应可信',
          '达到高完成度成片标准，边缘干净，细节连贯，局部结构无明显伪影，整体画面精确统一',
        ],
      }],
    })
    expect(composePrompt(compositionInput)).toContain('{整体表现：准确呈现不同材质')
  })

  it('drops invalid descendants before serializing the prompt', () => {
    const compositionInput = createPromptCompositionInput(
      '',
      ['module-capture-handheld', 'module-capture-height-waist'],
      DEFAULT_PROMPT_MODULES,
    )

    expect(compositionInput.constraints).toEqual([])
    expect(composePrompt(compositionInput)).toBe('')
  })

  it('returns a normalized overview when no choices are selected', () => {
    const compositionInput = createPromptCompositionInput(
      '  一座海边灯塔。 ',
      [],
      DEFAULT_PROMPT_MODULES,
    )

    expect(composePrompt(compositionInput)).toBe('一座海边灯塔')
  })
})
