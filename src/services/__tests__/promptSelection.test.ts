import { describe, expect, it } from 'vitest'
import {
  clearPromptTaxonomyGroup,
  getPromptChoiceAvailability,
  getVisiblePromptTaxonomyGroups,
  normalizePromptSelections,
  togglePromptChoice,
} from '@/services/promptSelection'

function selectChoices(choiceIds: string[]): string[] {
  let selectedChoiceIds: string[] = []
  for (const choiceId of choiceIds) {
    const result = togglePromptChoice(selectedChoiceIds, choiceId)
    expect(result.blockedReason).toBeUndefined()
    selectedChoiceIds = result.selectedChoiceIds
  }
  return selectedChoiceIds
}

describe('prompt taxonomy selection', () => {
  it('reveals handheld controls progressively after selecting photography and platform', () => {
    let selectedChoiceIds = selectChoices(['module-style-photography'])
    expect(getVisiblePromptTaxonomyGroups('domain-medium', selectedChoiceIds).map(({ group }) => (
      group.id
    ))).toContain('group-capture-platform')
    expect(getVisiblePromptTaxonomyGroups('domain-medium', selectedChoiceIds).map(({ group }) => (
      group.id
    ))).not.toContain('group-capture-handheld-posture')

    selectedChoiceIds = togglePromptChoice(
      selectedChoiceIds,
      'module-capture-handheld',
    ).selectedChoiceIds

    const visibleGroupIds = getVisiblePromptTaxonomyGroups('domain-medium', selectedChoiceIds)
      .map(({ group }) => group.id)
    expect(visibleGroupIds).toContain('group-capture-handheld-posture')
    expect(visibleGroupIds).toContain('group-capture-handheld-height')
    expect(visibleGroupIds).toContain('group-capture-handheld-stability')
    expect(visibleGroupIds).not.toContain('group-capture-drone-altitude')
  })

  it('clears handheld descendants when the capture platform changes to drone', () => {
    const handheldSelection = selectChoices([
      'module-style-photography',
      'module-capture-handheld',
      'module-capture-operator-crouching',
      'module-capture-height-waist',
      'module-capture-gimbal',
    ])

    const result = togglePromptChoice(handheldSelection, 'module-capture-drone')

    expect(result.selectedChoiceIds).toContain('module-style-photography')
    expect(result.selectedChoiceIds).toContain('module-capture-drone')
    expect(result.selectedChoiceIds).not.toContain('module-capture-handheld')
    expect(result.selectedChoiceIds).not.toContain('module-capture-height-waist')
    expect(result.removedChoiceIds).toEqual(expect.arrayContaining([
      'module-capture-handheld',
      'module-capture-operator-crouching',
      'module-capture-height-waist',
      'module-capture-gimbal',
    ]))
  })

  it('keeps orthogonal body and arm choices while replacing the body state only', () => {
    const initialSelection = selectChoices([
      'module-subject-person',
      'module-pose-standing',
      'module-pose-arms-crossed',
    ])
    const result = togglePromptChoice(initialSelection, 'module-pose-seated')

    expect(result.selectedChoiceIds).toContain('module-pose-seated')
    expect(result.selectedChoiceIds).toContain('module-pose-arms-crossed')
    expect(result.selectedChoiceIds).not.toContain('module-pose-standing')
  })

  it('removes person-only selections when the subject changes to an animal', () => {
    const personSelection = selectChoices([
      'module-subject-person',
      'module-pose-standing',
      'module-expression-smile',
      'module-detail-skin',
    ])

    const result = togglePromptChoice(personSelection, 'module-subject-animal')

    expect(result.selectedChoiceIds).toContain('module-subject-animal')
    expect(result.selectedChoiceIds).not.toContain('module-pose-standing')
    expect(result.selectedChoiceIds).not.toContain('module-expression-smile')
    expect(result.selectedChoiceIds).not.toContain('module-detail-skin')
  })

  it('removes full-body and facial constraints when only hands are visible', () => {
    const fullBodySelection = selectChoices([
      'module-subject-person',
      'module-pose-standing',
      'module-expression-smile',
      'module-shot-full',
    ])

    const result = togglePromptChoice(fullBodySelection, 'module-subject-hands')

    expect(result.selectedChoiceIds).toContain('module-subject-hands')
    expect(result.selectedChoiceIds).not.toContain('module-pose-standing')
    expect(result.selectedChoiceIds).not.toContain('module-expression-smile')
    expect(result.selectedChoiceIds).not.toContain('module-shot-full')
    expect(getPromptChoiceAvailability(
      'module-shot-full',
      result.selectedChoiceIds,
    ).enabled).toBe(false)
  })

  it('enforces multiple-selection limits within an individual group', () => {
    const twoEffects = selectChoices([
      'module-lighting-dramatic',
      'module-lighting-blinds',
    ])
    const result = togglePromptChoice(twoEffects, 'module-lighting-rim')

    expect(getPromptChoiceAvailability('module-lighting-rim', twoEffects)).toEqual({
      enabled: false,
      reason: '辅助与投影效果最多选择 2 项',
    })
    expect(result.blockedReason).toBe('辅助与投影效果最多选择 2 项')
    expect(result.selectedChoiceIds).toEqual(twoEffects)
  })

  it('resolves explicit conflicts in both selection directions', () => {
    const colorSelection = selectChoices([
      'module-color-warm',
      'module-color-monochrome',
      'module-color-low-saturation',
    ])
    const grayscaleResult = togglePromptChoice(colorSelection, 'module-color-grayscale')

    expect(grayscaleResult.selectedChoiceIds).toContain('module-color-grayscale')
    expect(grayscaleResult.selectedChoiceIds).not.toContain('module-color-warm')
    expect(grayscaleResult.selectedChoiceIds).not.toContain('module-color-monochrome')

    const restoredColorResult = togglePromptChoice(
      grayscaleResult.selectedChoiceIds,
      'module-color-warm',
    )
    expect(restoredColorResult.selectedChoiceIds).toContain('module-color-warm')
    expect(restoredColorResult.selectedChoiceIds).not.toContain('module-color-grayscale')
  })

  it('normalizes orphan descendants and conditionally unavailable choices', () => {
    expect(normalizePromptSelections([
      'module-capture-handheld',
      'module-capture-height-eye',
    ])).toEqual([])

    expect(getPromptChoiceAvailability(
      'module-expression-mutual-gaze',
      ['module-subject-person'],
    )).toEqual({
      enabled: false,
      reason: '当前主体或数量条件不满足',
    })
  })

  it('clears a selected parent group together with all selected descendants', () => {
    const selection = selectChoices([
      'module-style-photography',
      'module-capture-fixed',
      'module-capture-tripod',
      'module-capture-fixed-static',
    ])
    const result = clearPromptTaxonomyGroup(selection, 'group-capture-platform')

    expect(result.selectedChoiceIds).toEqual(['module-style-photography'])
    expect(result.removedChoiceIds).toEqual(expect.arrayContaining([
      'module-capture-fixed',
      'module-capture-tripod',
      'module-capture-fixed-static',
    ]))
  })
})
