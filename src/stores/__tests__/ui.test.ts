import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useUiStore } from '@/stores/ui'

describe('UI toast notifications', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('dismisses a completion notification after three seconds', () => {
    const ui = useUiStore()

    ui.showToast('生成完成', { durationMs: 3000 })
    vi.advanceTimersByTime(2999)
    expect(ui.toast?.text).toBe('生成完成')

    vi.advanceTimersByTime(1)
    expect(ui.toast).toBeNull()
  })

  it('dismisses an actionable notification before invoking its action', () => {
    const ui = useUiStore()
    const openImageDetails = vi.fn(() => {
      expect(ui.toast).toBeNull()
    })

    ui.showToast('生成完成', {
      actionLabel: '查看详情',
      durationMs: 3000,
      onClick: openImageDetails,
    })
    ui.activateToast()

    expect(openImageDetails).toHaveBeenCalledOnce()
    expect(ui.toast).toBeNull()
  })
})
