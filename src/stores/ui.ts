// 生成浮窗与全局 UI 状态：草稿提示词、参数、Remix 回填、详情抽屉、toast
import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { GenParams, ImageRecord, PromptTemplate } from '@/types'
import { SEED_TEMPLATES } from '@/mock/seedData'

export const useUiStore = defineStore('ui', () => {
  // 生成浮窗（底部对话式）
  const dockOpen = ref(false)
  const draftPrompt = ref('')
  const draftParams = ref<GenParams>({ size: '1024x1024', quality: 'medium', format: 'png', n: 1 })
  const referenceThumb = ref<string | undefined>()

  // 模板库
  const templates = ref<PromptTemplate[]>([...SEED_TEMPLATES])

  // 详情抽屉
  const viewerId = ref<string | null>(null)
  const viewerList = ref<string[]>([])
  const lightbox = ref(false)

  // 轻提示
  const toast = ref<{ id: number; text: string } | null>(null)
  let toastTimer: ReturnType<typeof setTimeout> | null = null
  function showToast(text: string) {
    if (toastTimer) clearTimeout(toastTimer)
    toast.value = { id: Date.now(), text }
    toastTimer = setTimeout(() => (toast.value = null), 2600)
  }

  function openViewer(id: string, list: string[]) {
    viewerId.value = id
    viewerList.value = list
    lightbox.value = false
  }
  function closeViewer() {
    viewerId.value = null
    lightbox.value = false
  }
  function stepViewer(dir: 1 | -1) {
    if (!viewerId.value) return
    const idx = viewerList.value.indexOf(viewerId.value)
    if (idx < 0) return
    const next = viewerList.value[idx + dir]
    if (next) viewerId.value = next
  }

  // Remix：回填提示词与参数，展开生成浮窗
  function remix(rec: ImageRecord) {
    draftPrompt.value = rec.prompt
    draftParams.value = { ...rec.params }
    referenceThumb.value = undefined
    dockOpen.value = true
    closeViewer()
  }

  // 用作参考图（img2img）
  function useAsReference(rec: ImageRecord) {
    referenceThumb.value = rec.dataUrl
    draftParams.value = { ...rec.params, n: 1 }
    dockOpen.value = true
    closeViewer()
  }

  function useTemplate(tpl: PromptTemplate) {
    tpl.useCount++
    draftPrompt.value = tpl.content
    dockOpen.value = true
  }

  function saveAsTemplate(rec: ImageRecord) {
    const title = rec.prompt.slice(0, 12) + (rec.prompt.length > 12 ? '…' : '')
    templates.value.unshift({
      id: `tpl-${Date.now().toString(36)}`,
      title,
      content: rec.prompt,
      category: '我的',
      useCount: 0,
    })
    showToast('已存为模板')
  }

  return {
    dockOpen, draftPrompt, draftParams, referenceThumb, templates,
    viewerId, viewerList, lightbox, toast,
    showToast, openViewer, closeViewer, stepViewer,
    remix, useAsReference, useTemplate, saveAsTemplate,
  }
})
