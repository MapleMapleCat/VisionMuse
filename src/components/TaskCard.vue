<script setup lang="ts">
// 任务卡片 = 一段胶片条：上下齿孔，中间是帧。生成中的帧显示噪点显影动画
import { computed, onBeforeUnmount, ref } from 'vue'
import type { GenerationTask } from '@/types'
import { sizeToWH } from '@/types'
import { useTaskStore } from '@/stores/tasks'
import { useGalleryStore } from '@/stores/gallery'
import { useUiStore } from '@/stores/ui'

const props = defineProps<{ task: GenerationTask }>()
const tasks = useTaskStore()
const gallery = useGalleryStore()
const ui = useUiStore()

// 已耗时计时器
const now = ref(Date.now())
const tick = setInterval(() => (now.value = Date.now()), 500)
onBeforeUnmount(() => clearInterval(tick))

const elapsed = computed(() => {
  const t = props.task
  const start = t.startedAt ?? t.createdAt
  const end = t.finishedAt ?? now.value
  return Math.max(0, Math.round((end - start) / 1000))
})

const ratio = computed(() => {
  const { w, h } = sizeToWH(props.task.params.size)
  return w / h
})

// 帧高固定，宽度按比例；竖图窄、横图宽，像真实底片
const frameH = 148
const frameW = computed(() => Math.round(frameH * ratio.value))

const doneImages = computed(() =>
  props.task.imageIds.map(id => gallery.byId(id)).filter(r => r && !r.deletedAt) as NonNullable<ReturnType<typeof gallery.byId>>[],
)

const statusText = computed(() => {
  switch (props.task.status) {
    case 'queued': return '排队中'
    case 'running': return `显影中 ${elapsed.value}s`
    case 'done': return `完成 · ${elapsed.value}s`
    case 'failed': return '失败'
    case 'canceled': return '已取消'
  }
})

function openImage(id: string) {
  ui.openViewer(id, doneImages.value.map(r => r.id))
}
</script>

<template>
  <div class="fade-in overflow-hidden rounded-xl border border-line bg-well shadow-card transition-shadow duration-300 hover:shadow-lift">
    <div class="sprockets" />
    <div v-if="task.status === 'running'" class="progress-line" />

    <div class="flex items-stretch gap-2.5 overflow-x-auto px-3 py-2.5">
      <!-- 生成中/排队：shimmer 占位帧 -->
      <template v-if="task.status === 'queued' || task.status === 'running'">
        <div
          v-for="i in task.params.n" :key="i"
          class="noise relative shrink-0 overflow-hidden rounded-md"
          :style="{ width: frameW + 'px', height: frameH + 'px', opacity: task.status === 'queued' ? 0.55 : 1, animationDelay: (i - 1) * 0.18 + 's' }"
        >
          <div v-if="i === 1" class="absolute inset-0 flex items-center justify-center">
            <span class="rounded-md bg-well/85 px-2 py-1 font-mono text-[11px] text-amberhi shadow-card backdrop-blur-sm">
              {{ task.status === 'queued' ? '排队中' : elapsed + 's' }}
            </span>
          </div>
        </div>
      </template>

      <!-- 完成：真实帧，显影动画入场 -->
      <template v-else-if="task.status === 'done'">
        <button
          v-for="(rec, ri) in doneImages" :key="rec.id"
          class="develop-in group relative shrink-0 overflow-hidden rounded-md shadow-card transition-shadow duration-200 hover:shadow-lift focus-visible:outline-amber"
          :style="{ width: frameW + 'px', height: frameH + 'px', animationDelay: ri * 0.12 + 's' }"
          @click="openImage(rec.id)"
        >
          <img :src="rec.dataUrl" :alt="rec.prompt" class="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.05]" />
          <span
            v-if="rec.favorite"
            class="absolute right-1.5 top-1.5 text-[13px] text-amber drop-shadow"
          >♥</span>
        </button>
      </template>

      <!-- 失败 / 取消 -->
      <div
        v-else
        class="flex shrink-0 items-center gap-3 rounded-md border border-dashed px-4"
        :class="task.status === 'failed' ? 'border-red/40 bg-red/4' : 'border-line2'"
        :style="{ height: frameH + 'px' }"
      >
        <template v-if="task.status === 'failed'">
          <span class="max-w-72 text-[12px] leading-relaxed text-red/90">{{ task.error }}</span>
          <button class="btn text-[12px]" @click="tasks.retry(task.id)">重试</button>
        </template>
        <span v-else class="text-[12px] text-dim">任务已取消</span>
      </div>
    </div>

    <!-- 片条信息栏 -->
    <div class="flex items-center gap-3 border-t border-line bg-ink/60 px-3.5 py-2">
      <span
        class="font-mono text-[10.5px] tracking-wider"
        :class="{
          'text-amberhi': task.status === 'running',
          'text-dim': task.status === 'queued' || task.status === 'canceled',
          'text-green': task.status === 'done',
          'text-red': task.status === 'failed',
        }"
      >
        <span v-if="task.status === 'running'" class="pulse-soft mr-1 inline-block h-1.5 w-1.5 rounded-full bg-amber align-middle" />{{ statusText }}
      </span>
      <span v-if="task.kind === 'edit'" class="rounded bg-amber/15 px-1.5 py-px font-mono text-[10px] text-amberhi">img2img</span>
      <span class="min-w-0 flex-1 truncate text-[12px] text-fade" :title="task.prompt">{{ task.prompt }}</span>
      <span class="shrink-0 font-mono text-[10.5px] text-dim">
        {{ task.model }} · {{ task.params.size.replace('x', '×') }} · {{ task.params.quality }} · ${{ task.estimatedCost.toFixed(2) }}
      </span>
      <button
        v-if="task.status === 'queued' || task.status === 'running'"
        class="btn btn-ghost shrink-0 !px-2 !py-1 text-[11px]"
        @click="tasks.cancel(task.id)"
      >取消</button>
      <button
        v-else
        class="btn btn-ghost shrink-0 !px-2 !py-1 text-[11px]"
        title="移除该记录（图片仍在图库）"
        @click="tasks.remove(task.id)"
      >✕</button>
    </div>
  </div>
</template>
