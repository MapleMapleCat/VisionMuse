import { defineStore } from 'pinia'
import { ref } from 'vue'
import {
  MAX_REFERENCE_IMAGE_COUNT,
  type GenParams,
  type ImageRecord,
  type ReferenceImage,
} from '@/types'
import { revokeReferenceImage } from '@/services/imageAssets'
import { MEDIA_LIMITS, formatMegabytes } from '@/services/resourceLimits'
import { useTemplateStore } from './templates'

interface ToastOptions {
  actionLabel?: string
  durationMs?: number
  onClick?: () => void
}

interface ToastMessage {
  id: number
  text: string
  actionLabel?: string
  onClick?: () => void
}

export const useUiStore = defineStore('ui', () => {
  // 生成浮窗（底部对话式）
  const dockOpen = ref(false)
  const draftPrompt = ref('')
  const draftParams = ref<GenParams>({ size: '1024x1024', quality: 'medium', format: 'png', n: 1 })
  const referenceImages = ref<ReferenceImage[]>([])

  // 详情抽屉
  const viewerId = ref<string | null>(null)
  const viewerList = ref<string[]>([])
  const lightbox = ref(false)

  // 轻提示
  const toast = ref<ToastMessage | null>(null)
  let toastTimer: ReturnType<typeof setTimeout> | null = null

  function dismissToast() {
    if (toastTimer) clearTimeout(toastTimer)
    toastTimer = null
    toast.value = null
  }

  function showToast(text: string, options: ToastOptions = {}) {
    dismissToast()
    const toastId = Date.now()
    toast.value = {
      id: toastId,
      text,
      actionLabel: options.actionLabel,
      onClick: options.onClick,
    }
    toastTimer = setTimeout(() => {
      if (toast.value?.id === toastId) toast.value = null
      toastTimer = null
    }, options.durationMs ?? 2600)
  }

  function activateToast() {
    const onClick = toast.value?.onClick
    if (!onClick) return
    dismissToast()
    onClick()
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
    clearReferenceImages()
    dockOpen.value = true
    closeViewer()
  }

  // 用作参考图（img2img）
  function useAsReference(rec: ImageRecord) {
    const addedReferenceCount = addReferenceImages([{
      blob: rec.originalBlob,
      previewUrl: URL.createObjectURL(rec.originalBlob),
      fileName: `reference-${rec.id}.${rec.fileExtension === 'jpeg' ? 'jpg' : rec.fileExtension}`,
      mimeType: rec.mimeType,
      width: rec.width,
      height: rec.height,
    }])
    if (!addedReferenceCount) return false
    draftParams.value = { ...rec.params, n: 1 }
    dockOpen.value = true
    closeViewer()
    return true
  }

  async function saveAsTemplate(rec: ImageRecord) {
    await useTemplateStore().createFromPrompt(rec.prompt)
    showToast('已存为模板')
  }

  function addReferenceImages(nextReferenceImages: ReferenceImage[]) {
    const availableReferenceSlots = MAX_REFERENCE_IMAGE_COUNT - referenceImages.value.length
    let availableReferenceBytes = MEDIA_LIMITS.maximumReferenceImageTotalBytes
      - referenceImages.value.reduce((totalBytes, referenceImage) => (
        totalBytes + referenceImage.blob.size
      ), 0)
    const acceptedReferenceImages: ReferenceImage[] = []
    const rejectedReferenceImages: ReferenceImage[] = []
    let rejectedForTotalSize = false

    for (const nextReferenceImage of nextReferenceImages) {
      const hasAvailableSlot = acceptedReferenceImages.length < availableReferenceSlots
      const fitsTotalSizeBudget = nextReferenceImage.blob.size <= availableReferenceBytes
      if (hasAvailableSlot && fitsTotalSizeBudget) {
        acceptedReferenceImages.push(nextReferenceImage)
        availableReferenceBytes -= nextReferenceImage.blob.size
      } else {
        rejectedReferenceImages.push(nextReferenceImage)
        if (hasAvailableSlot && !fitsTotalSizeBudget) rejectedForTotalSize = true
      }
    }
    for (const rejectedReferenceImage of rejectedReferenceImages) revokeReferenceImage(rejectedReferenceImage)

    if (rejectedForTotalSize) {
      showToast(`参考图总大小不能超过 ${formatMegabytes(MEDIA_LIMITS.maximumReferenceImageTotalBytes)}`)
    } else if (rejectedReferenceImages.length) {
      showToast(`最多添加 ${MAX_REFERENCE_IMAGE_COUNT} 张参考图`)
    }

    referenceImages.value.push(...acceptedReferenceImages)
    if (acceptedReferenceImages.length) draftParams.value.n = 1
    return acceptedReferenceImages.length
  }

  function removeReferenceImage(referenceIndex: number) {
    const [removedReferenceImage] = referenceImages.value.splice(referenceIndex, 1)
    revokeReferenceImage(removedReferenceImage)
  }

  function clearReferenceImages() {
    for (const referenceImage of referenceImages.value) revokeReferenceImage(referenceImage)
    referenceImages.value = []
  }

  function prepareReferenceImagesForSubmission(): ReferenceImage[] {
    if (referenceImages.value.length) draftParams.value.n = 1
    return referenceImages.value.map(referenceImage => ({ ...referenceImage, previewUrl: '' }))
  }

  return {
    dockOpen, draftPrompt, draftParams, referenceImages,
    viewerId, viewerList, lightbox, toast,
    showToast, dismissToast, activateToast,
    openViewer, closeViewer, stepViewer,
    remix, useAsReference, saveAsTemplate,
    addReferenceImages, removeReferenceImage, clearReferenceImages,
    prepareReferenceImagesForSubmission,
  }
})
