// 任务队列 store：模拟 gpt-image-2 的异步生成（排队 → 生成中 → 完成）
// 预览版：setTimeout 模拟 8~18s 延迟；接真实 API 时替换 runTask 内部实现
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { GenParams, GenerationTask } from '@/types'
import { estimateCost } from '@/types'
import { renderMockImage } from '@/mock/mockImage'
import { useGalleryStore } from './gallery'

const MAX_CONCURRENT = 2
let uid = 0
const nextId = (p: string) => `${p}-${Date.now().toString(36)}-${++uid}`

// 模拟生成耗时（预览版压短到 6~14s，真实为 30s~2min）
const mockDuration = () => 6000 + Math.random() * 8000

export const useTaskStore = defineStore('tasks', () => {
  const tasks = ref<GenerationTask[]>([])
  const timers = new Map<string, ReturnType<typeof setTimeout>>()

  const activeCount = computed(() => tasks.value.filter(t => t.status === 'queued' || t.status === 'running').length)
  const sessionTasks = computed(() => [...tasks.value].sort((a, b) => b.createdAt - a.createdAt))

  function submit(prompt: string, params: GenParams, referenceThumb?: string) {
    const task: GenerationTask = {
      id: nextId('task'),
      kind: referenceThumb ? 'edit' : 'generate',
      prompt,
      params: { ...params },
      referenceThumb,
      status: 'queued',
      createdAt: Date.now(),
      imageIds: [],
    }
    tasks.value.unshift(task)
    pump()
    return task.id
  }

  function pump() {
    const running = tasks.value.filter(t => t.status === 'running').length
    if (running >= MAX_CONCURRENT) return
    // 最早排队的先跑
    const next = [...tasks.value].reverse().find(t => t.status === 'queued')
    if (!next) return
    runTask(next)
    pump()
  }

  function runTask(task: GenerationTask) {
    task.status = 'running'
    task.startedAt = Date.now()
    const timer = setTimeout(() => {
      timers.delete(task.id)
      // 小概率模拟失败，演示重试 UI
      if (Math.random() < 0.06) {
        task.status = 'failed'
        task.error = '生成服务返回 429：请求过于频繁，请稍后重试'
        task.finishedAt = Date.now()
        pump()
        return
      }
      const gallery = useGalleryStore()
      const ids: string[] = []
      for (let i = 0; i < task.params.n; i++) {
        const rec = gallery.addImage(task, renderMockImage(task.prompt, task.params.size, i + Date.now() % 97), i)
        ids.push(rec.id)
      }
      task.imageIds = ids
      task.status = 'done'
      task.finishedAt = Date.now()
      pump()
    }, mockDuration())
    timers.set(task.id, timer)
  }

  function cancel(taskId: string) {
    const task = tasks.value.find(t => t.id === taskId)
    if (!task || (task.status !== 'queued' && task.status !== 'running')) return
    const timer = timers.get(taskId)
    if (timer) clearTimeout(timer)
    timers.delete(taskId)
    task.status = 'canceled'
    task.finishedAt = Date.now()
    pump()
  }

  function retry(taskId: string) {
    const task = tasks.value.find(t => t.id === taskId)
    if (!task || task.status !== 'failed') return
    task.status = 'queued'
    task.error = undefined
    task.startedAt = undefined
    task.finishedAt = undefined
    pump()
  }

  function remove(taskId: string) {
    cancel(taskId)
    tasks.value = tasks.value.filter(t => t.id !== taskId)
  }

  const sessionCost = computed(() =>
    tasks.value.filter(t => t.status === 'done').reduce((s, t) => s + estimateCost(t.params, t.kind), 0),
  )

  return { tasks, sessionTasks, activeCount, sessionCost, submit, cancel, retry, remove }
})
