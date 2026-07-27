<script setup lang="ts">
import { computed, ref } from 'vue'
import { useGalleryStore } from '@/stores/gallery'
import { useUiStore } from '@/stores/ui'
import { SIZE_OPTIONS, QUALITY_OPTIONS } from '@/types'

const gallery = useGalleryStore()
const ui = useUiStore()

const apiMode = ref<'proxy' | 'direct'>('proxy')
const apiKey = ref('')
const budgetDaily = ref(5)
const keepOriginals = ref(true)

// 模拟存储用量：按 dataUrl 长度估算
const storageMB = computed(() => {
  const bytes = gallery.images.reduce((s, i) => s + i.dataUrl.length * 0.75, 0)
  return (bytes / 1024 / 1024).toFixed(1)
})

function clearTrash() {
  const n = gallery.trashed.length
  if (!n) return ui.showToast('回收站已经是空的')
  gallery.purge(gallery.trashed.map(i => i.id))
  ui.showToast(`已清空回收站 · ${n} 张`)
}

function fakeExport() {
  ui.showToast('预览版：真实版本将导出元数据 JSON + 图片 zip')
}
</script>

<template>
  <div class="h-full overflow-y-auto px-6 pb-44 pt-5">
    <div class="mx-auto max-w-[680px]">
      <p class="field-label">Studio settings</p>
      <h1 class="display mb-5 mt-1.5 text-[27px] leading-none">设置</h1>

      <!-- API -->
      <section class="rise-in mb-5 rounded-2xl border border-line bg-well p-5 shadow-card" style="--stagger: 0">
        <h2 class="mb-1 text-[13.5px] font-semibold">API 连接</h2>
        <p class="mb-4 text-[12px] leading-relaxed text-dim">生成能力由 OpenAI gpt-image-2 提供，需要付费 API Key（无免费额度）</p>

        <div class="mb-4 flex gap-2">
          <button
            class="flex-1 rounded-xl border p-3.5 text-left transition-all duration-200 hover:-translate-y-0.5 hover:shadow-card"
            :class="apiMode === 'proxy' ? 'border-amber bg-amber/6 shadow-card' : 'border-line hover:border-line2'"
            :aria-pressed="apiMode === 'proxy'"
            @click="apiMode = 'proxy'"
          >
            <div class="mb-0.5 text-[13px] font-medium" :class="{ 'text-amberhi': apiMode === 'proxy' }">代理模式（推荐）</div>
            <div class="text-[11.5px] leading-relaxed text-dim">请求经自建后端转发，Key 存在服务器，可对外部署</div>
          </button>
          <button
            class="flex-1 rounded-xl border p-3.5 text-left transition-all duration-200 hover:-translate-y-0.5 hover:shadow-card"
            :class="apiMode === 'direct' ? 'border-amber bg-amber/6 shadow-card' : 'border-line hover:border-line2'"
            :aria-pressed="apiMode === 'direct'"
            @click="apiMode = 'direct'"
          >
            <div class="mb-0.5 text-[13px] font-medium" :class="{ 'text-amberhi': apiMode === 'direct' }">直连模式</div>
            <div class="text-[11.5px] leading-relaxed text-dim">浏览器直接调用 OpenAI，仅限本机自用</div>
          </button>
        </div>

        <template v-if="apiMode === 'direct'">
          <label class="field-label mb-1.5 block">OpenAI API Key</label>
          <input v-model="apiKey" type="password" class="input font-mono" placeholder="sk-…" />
          <p class="mt-2 flex items-start gap-1.5 text-[11.5px] leading-relaxed text-red/80">
            <span class="mt-px">⚠</span>
            <span>Key 只保存在本机浏览器 localStorage。切勿在公网部署的页面里使用直连模式。</span>
          </p>
        </template>
        <template v-else>
          <label class="field-label mb-1.5 block">代理地址</label>
          <input class="input font-mono" placeholder="https://your-proxy.example.com/api" disabled value="（预览版未接入）" />
        </template>
      </section>

      <!-- 默认参数 -->
      <section class="rise-in mb-5 rounded-2xl border border-line bg-well p-5 shadow-card" style="--stagger: 2">
        <h2 class="mb-4 text-[13.5px] font-semibold">默认生成参数</h2>
        <div class="grid grid-cols-2 gap-4">
          <div>
            <div class="field-label mb-1.5">尺寸</div>
            <div class="seg" role="group" aria-label="默认图片尺寸">
              <button
                v-for="opt in SIZE_OPTIONS" :key="opt.value"
                :class="{ on: ui.draftParams.size === opt.value }"
                :aria-pressed="ui.draftParams.size === opt.value"
                @click="ui.draftParams.size = opt.value"
              >{{ opt.ratio }}</button>
            </div>
          </div>
          <div>
            <div class="field-label mb-1.5">质量</div>
            <div class="seg" role="group" aria-label="默认图片质量">
              <button
                v-for="opt in QUALITY_OPTIONS" :key="opt.value"
                :class="{ on: ui.draftParams.quality === opt.value }"
                :aria-pressed="ui.draftParams.quality === opt.value"
                @click="ui.draftParams.quality = opt.value"
              >{{ opt.label }}</button>
            </div>
          </div>
        </div>
        <div class="mt-4">
          <div class="field-label mb-1.5">每日成本提醒阈值</div>
          <div class="flex items-center gap-3">
            <input v-model.number="budgetDaily" type="range" min="1" max="50" class="flex-1 accent-amber" />
            <span class="w-14 text-right font-mono text-[13px] text-amberhi">${{ budgetDaily }}</span>
          </div>
          <p class="mt-1.5 text-[11.5px] text-dim">当日估算消耗超过阈值时，生成按钮旁会出现提醒</p>
        </div>
      </section>

      <!-- 存储 -->
      <section class="rise-in mb-5 rounded-2xl border border-line bg-well p-5 shadow-card" style="--stagger: 4">
        <h2 class="mb-4 text-[13.5px] font-semibold">本地存储</h2>
        <div class="mb-4 flex items-end justify-between">
          <div>
            <div class="font-mono text-[22px] leading-none text-amberhi">{{ storageMB }} <span class="text-[13px] text-fade">MB</span></div>
            <div class="mt-1 text-[11.5px] text-dim">{{ gallery.images.length }} 张图片（含回收站 {{ gallery.trashed.length }} 张）</div>
          </div>
          <div class="flex gap-2">
            <button class="btn text-[12px]" @click="fakeExport">导出备份</button>
            <button class="btn btn-danger text-[12px]" @click="clearTrash">清空回收站</button>
          </div>
        </div>
        <label class="flex cursor-pointer items-center gap-2.5 text-[12.5px]">
          <input v-model="keepOriginals" type="checkbox" class="h-4 w-4 accent-amber" />
          <span>保留原图（关闭后仅存缩略图，原图生成后即时下载）</span>
        </label>
      </section>

      <p class="pb-4 text-center font-mono text-[10.5px] text-dim">
        显影台 · 前端预览版 0.1 · 数据均为本地模拟，刷新后会话任务重置
      </p>
    </div>
  </div>
</template>
