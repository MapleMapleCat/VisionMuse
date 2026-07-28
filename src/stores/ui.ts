import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { GenParams, ImageRecord, PromptTemplate, ReferenceImage } from '@/types'
import { revokeReferenceImage } from '@/services/imageAssets'
import { useTemplateStore } from './templates'

export const useUiStore = defineStore('ui', () => {
  // 生成浮窗（底部对话式）
  const dockOpen = ref(false)
  const draftPrompt = ref('')
  const draftParams = ref<GenParams>({ size: '1024x1024', quality: 'medium', format: 'png', n: 1 })
  const referenceImage = ref<ReferenceImage | undefined>()

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
    clearReferenceImage()
    dockOpen.value = true
    closeViewer()
  }

  // 用作参考图（img2img）
  function useAsReference(rec: ImageRecord) {
    setReferenceImage({
      blob: rec.originalBlob,
      previewUrl: URL.createObjectURL(rec.originalBlob),
      fileName: `reference-${rec.id}.${rec.fileExtension === 'jpeg' ? 'jpg' : rec.fileExtension}`,
      mimeType: rec.mimeType,
      width: rec.width,
      height: rec.height,
    })
    draftParams.value = { ...rec.params, n: 1 }
    dockOpen.value = true
    closeViewer()
  }

  function useTemplate(tpl: PromptTemplate) {
    void useTemplateStore().recordUse(tpl)
    draftPrompt.value = tpl.content
    dockOpen.value = true
  }

  async function saveAsTemplate(rec: ImageRecord) {
    await useTemplateStore().createFromPrompt(rec.prompt)
    showToast('已存为模板')
  }

  function setReferenceImage(nextReferenceImage: ReferenceImage) {
    revokeReferenceImage(referenceImage.value)
    referenceImage.value = nextReferenceImage
    draftParams.value.n = 1
  }

  function clearReferenceImage() {
    revokeReferenceImage(referenceImage.value)
    referenceImage.value = undefined
  }

  return {
    dockOpen, draftPrompt, draftParams, referenceImage,
    viewerId, viewerList, lightbox, toast,
    showToast, openViewer, closeViewer, stepViewer,
    remix, useAsReference, useTemplate, saveAsTemplate, setReferenceImage, clearReferenceImage,
  }
})
