import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { ApiSettings, GenParams, GenerationTask, ReferenceImage, StoredGenerationTask } from '@/types'
import { estimateCost } from '@/types'
import { deleteTask, loadTasks, saveTask } from '@/services/database'
import { ImageApiError, requestImages } from '@/services/imageApi'
import { cloneForStorage } from '@/services/clone'
import { createId } from '@/utils/ids'
import { useGalleryStore } from './gallery'
import { useSettingsStore } from './settings'

export const useTaskStore = defineStore('tasks', () => {
  const tasks = ref<GenerationTask[]>([])
  const controllers = new Map<string, AbortController>()
  const initialized = ref(false)

  const activeCount = computed(() => tasks.value.filter(t => t.status === 'queued' || t.status === 'running').length)
  const sessionTasks = computed(() => [...tasks.value].sort((a, b) => b.createdAt - a.createdAt))

  function toStoredTask(task: GenerationTask): StoredGenerationTask {
    const referenceImages = task.referenceImages.map(referenceImage => ({
      blob: referenceImage.blob,
      fileName: referenceImage.fileName,
      mimeType: referenceImage.mimeType,
      width: referenceImage.width,
      height: referenceImage.height,
    }))
    return { ...task, referenceImages }
  }

  function toRuntimeTask(task: StoredGenerationTask): GenerationTask {
    const {
      referenceImage: legacyReferenceImage,
      referenceImages: storedReferenceImages,
      ...taskMetadata
    } = task
    const normalizedReferenceImages = storedReferenceImages?.length
      ? storedReferenceImages
      : legacyReferenceImage ? [legacyReferenceImage] : []

    return {
      ...taskMetadata,
      referenceImages: normalizedReferenceImages.map(referenceImage => ({
        ...referenceImage,
        previewUrl: '',
      })),
    }
  }

  async function initialize() {
    if (initialized.value) return
    tasks.value = (await loadTasks()).map(toRuntimeTask).sort((left, right) => right.createdAt - left.createdAt)
    for (const task of tasks.value) {
      if (task.status === 'running') {
        task.status = 'failed'
        task.error = '页面在请求期间被关闭，远端执行状态未知。重试可能再次产生费用。'
        task.finishedAt = Date.now()
        await saveTask(toStoredTask(task))
      } else if (task.status === 'queued') {
        task.status = 'failed'
        task.error = '页面刷新后任务已暂停，点击重试可重新发送请求。'
        task.finishedAt = Date.now()
        await saveTask(toStoredTask(task))
      }
    }
    initialized.value = true
  }

  async function submit(prompt: string, params: GenParams, referenceImages: ReferenceImage[] = []) {
    const settingsStore = useSettingsStore()
    if (!settingsStore.apiConfigured) throw new Error('请先在设置中填写文生图请求 URL')
    const apiSettings = cloneForStorage(settingsStore.settings.api)
    const { apiKey: _apiKey, ...apiConfig } = apiSettings
    const taskReferences = referenceImages.map(referenceImage => ({
      ...referenceImage,
      previewUrl: '',
    }))
    const kind = taskReferences.length ? 'edit' : 'generate'
    const task: GenerationTask = {
      id: createId('task'),
      kind,
      prompt,
      params: { ...params },
      referenceImages: taskReferences,
      status: 'queued',
      requestEndpoint: kind === 'edit' ? apiSettings.edit.url : apiSettings.generation.url,
      model: apiSettings.model || 'custom',
      apiConfig,
      estimatedCost: estimateCost(params, kind, settingsStore.settings.estimatedCostByQuality),
      createdAt: Date.now(),
      imageIds: [],
    }
    tasks.value.unshift(task)
    await saveTask(toStoredTask(task))
    pump()
    return task.id
  }

  function pump() {
    const maximumConcurrent = useSettingsStore().settings.api.maxConcurrent
    const running = tasks.value.filter(t => t.status === 'running').length
    const availableSlots = Math.max(0, maximumConcurrent - running)
    const queuedTasks = [...tasks.value].reverse().filter(task => task.status === 'queued').slice(0, availableSlots)
    for (const queuedTask of queuedTasks) void runTask(queuedTask)
  }

  async function runTask(task: GenerationTask) {
    const controller = new AbortController()
    controllers.set(task.id, controller)
    const createdImageIds: string[] = []
    task.status = 'running'
    task.startedAt = Date.now()
    task.finishedAt = undefined
    task.error = undefined
    task.errorStatus = undefined

    try {
      await saveTask(toStoredTask(task))
      if (controller.signal.aborted) throw controller.signal.reason
      const settingsStore = useSettingsStore()
      const apiSettings: ApiSettings = { ...cloneForStorage(task.apiConfig), apiKey: settingsStore.settings.api.apiKey }
      const result = await requestImages({
        settings: apiSettings,
        prompt: task.prompt,
        params: task.params,
        referenceImages: task.referenceImages,
        signal: controller.signal,
      })
      if (controller.signal.aborted) throw controller.signal.reason
      task.usage = result.usage
      const gallery = useGalleryStore()
      for (const [index, generatedImage] of result.images.entries()) {
        if (controller.signal.aborted) throw controller.signal.reason
        const image = await gallery.addGeneratedImage(task, generatedImage, index, settingsStore.settings.autoDownloadOriginals)
        createdImageIds.push(image.id)
        task.imageIds.push(image.id)
        await saveTask(toStoredTask(task))
        if (controller.signal.aborted) throw controller.signal.reason
      }
      task.referenceImages = []
      task.status = 'done'
      task.finishedAt = Date.now()
      await saveTask(toStoredTask(task))
    } catch (error) {
      if (controller.signal.aborted) {
        if (createdImageIds.length) await useGalleryStore().purge(createdImageIds)
        task.imageIds = task.imageIds.filter(imageId => !createdImageIds.includes(imageId))
        task.referenceImages = []
        await saveTask(toStoredTask(task))
      } else {
        task.status = 'failed'
        task.error = error instanceof Error ? error.message : String(error)
        task.errorStatus = error instanceof ImageApiError ? error.status : undefined
        task.finishedAt = Date.now()
        await saveTask(toStoredTask(task))
      }
    } finally {
      controllers.delete(task.id)
      pump()
    }
  }

  async function cancel(taskId: string) {
    const task = tasks.value.find(t => t.id === taskId)
    if (!task || (task.status !== 'queued' && task.status !== 'running')) return
    task.status = 'canceled'
    task.finishedAt = Date.now()
    task.referenceImages = []
    controllers.get(taskId)?.abort(new DOMException('用户取消请求', 'AbortError'))
    await saveTask(toStoredTask(task))
    pump()
  }

  async function retry(taskId: string) {
    const task = tasks.value.find(t => t.id === taskId)
    if (!task || task.status !== 'failed') return
    task.status = 'queued'
    task.error = undefined
    task.startedAt = undefined
    task.finishedAt = undefined
    task.imageIds = []
    await saveTask(toStoredTask(task))
    pump()
  }

  async function remove(taskId: string) {
    await cancel(taskId)
    const task = tasks.value.find(item => item.id === taskId)
    for (const referenceImage of task?.referenceImages ?? []) {
      if (referenceImage.previewUrl.startsWith('blob:')) URL.revokeObjectURL(referenceImage.previewUrl)
    }
    tasks.value = tasks.value.filter(t => t.id !== taskId)
    await deleteTask(taskId)
  }

  const sessionCost = computed(() =>
    tasks.value.filter(t => t.status === 'done').reduce((sum, task) => sum + task.estimatedCost, 0),
  )

  const todayCost = computed(() => {
    const startOfDay = new Date()
    startOfDay.setHours(0, 0, 0, 0)
    return tasks.value
      .filter(task => task.status === 'done' && task.createdAt >= startOfDay.getTime())
      .reduce((sum, task) => sum + task.estimatedCost, 0)
  })

  return { tasks, sessionTasks, activeCount, sessionCost, todayCost, initialized, initialize, submit, cancel, retry, remove }
})
