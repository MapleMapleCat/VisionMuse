import { defineStore } from 'pinia'
import { computed, ref, shallowRef } from 'vue'
import type { GeneratedImageResult, GenerationTask, ImageRecord, StoredImageRecord } from '@/types'
import { createThumbnail, getFileExtension, readImageDimensions } from '@/services/imageAssets'
import { deleteImages, loadImages, saveImage, saveImages } from '@/services/database'
import { downloadBlob, getImageFileName } from '@/services/download'
import { createId } from '@/utils/ids'

export const useGalleryStore = defineStore('gallery', () => {
  const images = shallowRef<ImageRecord[]>([])
  const initialized = ref(false)

  function toStoredImage(image: ImageRecord): StoredImageRecord {
    const { dataUrl: _dataUrl, ...storedImage } = image
    return storedImage
  }

  function toRuntimeImage(image: StoredImageRecord): ImageRecord {
    return { ...image, dataUrl: URL.createObjectURL(image.thumbnailBlob) }
  }

  async function initialize() {
    if (initialized.value) return
    images.value = (await loadImages()).map(toRuntimeImage).sort((left, right) => right.createdAt - left.createdAt)
    initialized.value = true
  }

  function bump() {
    images.value = [...images.value]
  }

  async function addGeneratedImage(
    task: GenerationTask,
    generatedImage: GeneratedImageResult,
    variant: number,
    autoDownloadOriginals: boolean,
  ): Promise<ImageRecord> {
    const dimensions = await readImageDimensions(generatedImage.blob)
    const thumbnailBlob = await createThumbnail(generatedImage.blob)
    const originalBlob = generatedImage.blob
    const mimeType = originalBlob.type || generatedImage.mimeType
    const image: ImageRecord = {
      id: createId('img'),
      taskId: task.id,
      dataUrl: URL.createObjectURL(thumbnailBlob),
      originalBlob,
      thumbnailBlob,
      mimeType,
      fileExtension: getFileExtension(mimeType, task.params.format),
      byteSize: originalBlob.size,
      width: dimensions.width,
      height: dimensions.height,
      prompt: task.prompt,
      params: { ...task.params },
      kind: task.kind,
      model: task.model,
      requestEndpoint: task.requestEndpoint,
      revisedPrompt: generatedImage.revisedPrompt,
      usage: task.usage,
      favorite: false,
      tags: [],
      createdAt: Date.now() + variant,
    }
    if (autoDownloadOriginals) downloadBlob(generatedImage.blob, getImageFileName(image))
    await saveImage(toStoredImage(image))
    images.value = [image, ...images.value]
    return image
  }

  const alive = computed(() => images.value.filter(i => !i.deletedAt))
  const trashed = computed(() => images.value.filter(i => i.deletedAt))

  const allTags = computed(() => {
    const count = new Map<string, number>()
    for (const img of alive.value) for (const t of img.tags) count.set(t, (count.get(t) ?? 0) + 1)
    return [...count.entries()].sort((a, b) => b[1] - a[1]).map(([tag]) => tag)
  })

  function byId(id: string) {
    return images.value.find(i => i.id === id)
  }

  function siblings(rec: ImageRecord) {
    return alive.value.filter(i => i.taskId === rec.taskId)
  }

  async function persistImage(image: ImageRecord) {
    await saveImage(toStoredImage(image))
  }

  async function toggleFavorite(id: string) {
    const img = byId(id)
    if (img) {
      img.favorite = !img.favorite
      bump()
      await persistImage(img)
    }
  }

  async function setTags(id: string, tags: string[]) {
    const img = byId(id)
    if (img) {
      img.tags = tags
      bump()
      await persistImage(img)
    }
  }

  async function addTagToMany(ids: string[], tag: string) {
    const changedImages: ImageRecord[] = []
    for (const id of ids) {
      const img = byId(id)
      if (img && !img.tags.includes(tag)) {
        img.tags.push(tag)
        changedImages.push(img)
      }
    }
    bump()
    await saveImages(changedImages.map(toStoredImage))
  }

  async function softDelete(ids: string[]) {
    const now = Date.now()
    const changedImages: ImageRecord[] = []
    for (const id of ids) {
      const img = byId(id)
      if (img) {
        img.deletedAt = now
        changedImages.push(img)
      }
    }
    bump()
    await saveImages(changedImages.map(toStoredImage))
  }

  async function restore(ids: string[]) {
    const changedImages: ImageRecord[] = []
    for (const id of ids) {
      const img = byId(id)
      if (img) {
        img.deletedAt = undefined
        changedImages.push(img)
      }
    }
    bump()
    await saveImages(changedImages.map(toStoredImage))
  }

  async function purge(ids: string[]) {
    const set = new Set(ids)
    for (const image of images.value) {
      if (set.has(image.id) && image.dataUrl.startsWith('blob:')) URL.revokeObjectURL(image.dataUrl)
    }
    await deleteImages(ids)
    images.value = images.value.filter(i => !set.has(i.id))
  }

  const storageBytes = computed(() => images.value.reduce(
    (total, image) => total + image.originalBlob.size + (image.thumbnailBlob === image.originalBlob ? 0 : image.thumbnailBlob.size),
    0,
  ))

  return {
    images, alive, trashed, allTags, storageBytes,
    initialize, addGeneratedImage, byId, siblings, toggleFavorite, setTags, addTagToMany,
    softDelete, restore, purge,
  }
})
