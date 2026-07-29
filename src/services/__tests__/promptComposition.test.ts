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

    expect(compositionInput.sections.map(section => section.label)).toEqual([
      '媒介与拍摄',
      '相机与画面',
    ])
    const mediumConstraint = compositionInput.sections[0].constraints[0]
    expect(mediumConstraint.label).toBe('表现媒介')
    expect(mediumConstraint.children[0].label).toBe('拍摄方式')
    expect(mediumConstraint.children[0].children[0].label).toBe('摄影者姿势')

    const composedPrompt = composePrompt(compositionInput)
    expect(composedPrompt).toContain([
      '一位女性摄影师。',
      '',
      '以真实相机摄影作为画面形成方式',
    ].join('\n'))
    expect(composedPrompt).toContain('；采用摄影者人手持机拍摄')
    expect(composedPrompt).toContain('；摄影者屈膝降低身体重心')
    expect(composedPrompt).toContain(
      '\n\n摄影机镜头中心位于主体主要视觉中心下方',
    )
    expect(composedPrompt).toContain('。摄影机光轴明确向上仰起')
    expect(composedPrompt).not.toContain('媒介与拍摄')
    expect(composedPrompt).not.toContain('表现媒介')
    expect(composedPrompt).not.toContain('拍摄方式')
    expect(composedPrompt).not.toContain('摄影者姿势')
    expect(composedPrompt).not.toContain('在此基础上')
    expect(composedPrompt).not.toContain('进一步')
    expect(composedPrompt).not.toMatch(/[{}]/)
  })

  it('groups compatible selections from the same taxonomy group', () => {
    const compositionInput = createPromptCompositionInput(
      '一位女性',
      ['module-detail-realistic', 'module-detail-polished'],
      DEFAULT_PROMPT_MODULES,
    )

    expect(compositionInput).toEqual({
      overview: '一位女性',
      sections: [{
        category: 'domain-material',
        label: '材质与完成度',
        constraints: [{
          category: 'group-material-overall-quality',
          label: '整体表现',
          prompts: [
            '准确呈现不同材质的粗糙度、反射率、透明度和微小表面变化，使接触关系与物理响应可信',
            '达到高完成度成片标准，边缘干净，细节连贯，局部结构无明显伪影，整体画面精确统一',
          ],
          children: [],
        }],
      }],
    })
    expect(composePrompt(compositionInput)).toContain([
      '准确呈现不同材质的粗糙度、反射率、透明度和微小表面变化，使接触关系与物理响应可信',
      '；达到高完成度成片标准',
    ].join(''))
    expect(composePrompt(compositionInput)).not.toContain('整体表现')
  })

  it('drops invalid descendants before serializing the prompt', () => {
    const compositionInput = createPromptCompositionInput(
      '',
      ['module-capture-handheld', 'module-capture-height-waist'],
      DEFAULT_PROMPT_MODULES,
    )

    expect(compositionInput.sections).toEqual([])
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
