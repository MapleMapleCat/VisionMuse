// 图库 store：预置数据 + 会话新增，搜索/筛选/收藏/标签/回收站
import { defineStore } from 'pinia'
import { computed, ref, shallowRef } from 'vue'
import type { GenerationTask, ImageRecord } from '@/types'
import { sizeToWH } from '@/types'
import { buildSeedImages } from '@/mock/seedData'

let uid = 0

export const useGalleryStore = defineStore('gallery', () => {
  // shallowRef：记录数组内含大 dataUrl，避免深层响应式开销
  const images = shallowRef<ImageRecord[]>([])
  const initialized = ref(false)

  function init() {
    if (initialized.value) return
    images.value = buildSeedImages()
    initialized.value = true
  }

  function bump() {
    images.value = [...images.value]
  }

  function addImage(task: GenerationTask, dataUrl: string, variant: number): ImageRecord {
    const { w, h } = sizeToWH(task.params.size)
    const rec: ImageRecord = {
      id: `img-${Date.now().toString(36)}-${++uid}`,
      taskId: task.id,
      dataUrl,
      width: w,
      height: h,
      prompt: task.prompt,
      params: { ...task.params },
      kind: task.kind,
      favorite: false,
      tags: [],
      createdAt: Date.now() + variant,
    }
    images.value = [rec, ...images.value]
    return rec
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

  function toggleFavorite(id: string) {
    const img = byId(id)
    if (img) { img.favorite = !img.favorite; bump() }
  }

  function setTags(id: string, tags: string[]) {
    const img = byId(id)
    if (img) { img.tags = tags; bump() }
  }

  function addTagToMany(ids: string[], tag: string) {
    for (const id of ids) {
      const img = byId(id)
      if (img && !img.tags.includes(tag)) img.tags.push(tag)
    }
    bump()
  }

  function softDelete(ids: string[]) {
    const now = Date.now()
    for (const id of ids) {
      const img = byId(id)
      if (img) img.deletedAt = now
    }
    bump()
  }

  function restore(ids: string[]) {
    for (const id of ids) {
      const img = byId(id)
      if (img) img.deletedAt = undefined
    }
    bump()
  }

  function purge(ids: string[]) {
    const set = new Set(ids)
    images.value = images.value.filter(i => !set.has(i.id))
  }

  return {
    images, alive, trashed, allTags, initialized,
    init, addImage, byId, siblings, toggleFavorite, setTags, addTagToMany,
    softDelete, restore, purge,
  }
})
