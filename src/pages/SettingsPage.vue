<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useGalleryStore } from '@/stores/gallery'
import { useSettingsStore } from '@/stores/settings'
import { useTaskStore } from '@/stores/tasks'
import { useTemplateStore } from '@/stores/templates'
import { usePromptModuleStore } from '@/stores/promptModules'
import { useUiStore } from '@/stores/ui'
import { exportBackup, importBackup } from '@/services/backup'
import { replaceAllData } from '@/services/database'
import {
  ASPECT_RATIO_OPTIONS,
  QUALITY_OPTIONS,
  RESOLUTION_OPTIONS,
  getImageAspectRatio,
  getImageResolution,
  getImageSize,
  type ImageAspectRatio,
  type ImageQuality,
  type ImageResolution,
} from '@/types'

const gallery = useGalleryStore()
const settingsStore = useSettingsStore()
const tasks = useTaskStore()
const templateStore = useTemplateStore()
const promptModuleStore = usePromptModuleStore()
const ui = useUiStore()

const showAdvanced = ref(false)
const backingUp = ref(false)
const importing = ref(false)
const storageQuota = ref<{ usage: number; quota: number }>()
let saveTimer: ReturnType<typeof setTimeout> | undefined
const operationNames = ['generation', 'edit'] as const
const templateVariables = [
  '{{prompt}}', '{{model}}', '{{size}}', '{{width}}', '{{height}}', '{{aspectRatio}}', '{{resolution}}',
  '{{quality}}', '{{format}}', '{{n}}',
  '{{referenceImageFile}}', '{{referenceImageBase64}}',
]
const responseFields = [
  ['itemsPath', '图片数组路径'],
  ['base64Path', 'Base64 字段'],
  ['urlPath', 'URL 字段'],
  ['mimeTypePath', 'MIME 字段'],
  ['revisedPromptPath', '修订提示词字段'],
  ['usagePath', 'Usage 路径'],
] as const
const costQualities = ['low', 'medium', 'high'] as const

const storageMB = computed(() => (gallery.storageBytes / 1024 / 1024).toFixed(1))
const quotaText = computed(() => {
  if (!storageQuota.value?.quota) return '浏览器未提供配额信息'
  const used = (storageQuota.value.usage / 1024 / 1024).toFixed(1)
  const total = (storageQuota.value.quota / 1024 / 1024 / 1024).toFixed(1)
  return `浏览器已用 ${used} MB / 可用配额约 ${total} GB`
})
const defaultAspectRatio = computed(() => getImageAspectRatio(settingsStore.settings.defaultParams.size))
const defaultResolution = computed(() => getImageResolution(settingsStore.settings.defaultParams.size))

async function refreshStorageEstimate() {
  if (!navigator.storage?.estimate) return
  const estimate = await navigator.storage.estimate()
  storageQuota.value = { usage: estimate.usage ?? 0, quota: estimate.quota ?? 0 }
}

async function testConnection() {
  try {
    await settingsStore.persist()
    await settingsStore.testConnection()
    ui.showToast('连接测试成功')
  } catch (error) {
    ui.showToast(error instanceof Error ? error.message : String(error))
  }
}

async function resetOpenAiPreset() {
  if (!window.confirm('将请求路径、字段模板和响应映射恢复为 OpenAI Images API 预设，API Key 会保留。继续吗？')) return
  await settingsStore.resetToOpenAiDefaults()
  ui.showToast('已恢复 OpenAI Images API 预设')
}

function setDefaultAspectRatio(aspectRatio: ImageAspectRatio) {
  const size = getImageSize(aspectRatio, defaultResolution.value)
  settingsStore.settings.defaultParams.size = size
  ui.draftParams.size = size
}

function setDefaultResolution(resolution: ImageResolution) {
  const size = getImageSize(defaultAspectRatio.value, resolution)
  settingsStore.settings.defaultParams.size = size
  ui.draftParams.size = size
}

function setDefaultQuality(quality: ImageQuality) {
  settingsStore.settings.defaultParams.quality = quality
  ui.draftParams.quality = quality
}

async function clearTrash() {
  const count = gallery.trashed.length
  if (!count) return ui.showToast('回收站已经是空的')
  await gallery.purge(gallery.trashed.map(image => image.id))
  await refreshStorageEstimate()
  ui.showToast(`已清空回收站 · ${count} 张`)
}

async function createBackup() {
  backingUp.value = true
  try {
    await settingsStore.persist()
    await exportBackup({
      settings: settingsStore.settings,
      tasks: tasks.tasks,
      images: gallery.images,
      templates: templateStore.templates,
      promptModules: promptModuleStore.promptModules,
    })
    ui.showToast('完整备份已导出')
  } catch (error) {
    ui.showToast(error instanceof Error ? error.message : String(error))
  } finally {
    backingUp.value = false
  }
}

async function restoreBackup(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  if (tasks.activeCount > 0) {
    ui.showToast('请先等待或取消所有生成任务，再导入备份')
    return
  }
  if (!window.confirm('导入会覆盖当前浏览器中的设置、任务、模板、提示词模块和图库。建议先导出备份。确定继续吗？')) return
  importing.value = true
  try {
    if (saveTimer) {
      clearTimeout(saveTimer)
      saveTimer = undefined
    }
    await settingsStore.waitForSaves()
    const backup = await importBackup(file)
    await replaceAllData(backup)
    window.location.reload()
  } catch (error) {
    ui.showToast(error instanceof Error ? error.message : String(error))
    importing.value = false
  }
}

watch(
  () => settingsStore.settings,
  () => {
    if (saveTimer) clearTimeout(saveTimer)
    saveTimer = setTimeout(() => {
      void settingsStore.persist().catch(error => ui.showToast(`设置保存失败：${error instanceof Error ? error.message : String(error)}`))
    }, 450)
  },
  { deep: true },
)

onMounted(() => void refreshStorageEstimate())
onBeforeUnmount(() => {
  if (saveTimer) {
    clearTimeout(saveTimer)
    void settingsStore.persist().catch(error => ui.showToast(`设置保存失败：${error instanceof Error ? error.message : String(error)}`))
  }
})
</script>

<template>
  <div class="h-full overflow-y-auto px-6 pb-44 pt-5">
    <div class="mx-auto max-w-[760px]">
      <div class="mb-5 flex items-end justify-between gap-4">
        <div>
          <p class="field-label">Studio settings</p>
          <h1 class="display mt-1.5 text-[27px] leading-none">设置</h1>
        </div>
        <span class="font-mono text-[10.5px]" :class="settingsStore.saveError ? 'text-red' : 'text-dim'">
          {{ settingsStore.saveError ? `保存失败：${settingsStore.saveError}` : settingsStore.saving ? '正在保存…' : '设置已自动保存在本机' }}
        </span>
      </div>

      <section class="rise-in mb-5 rounded-2xl border border-line bg-well p-5 shadow-card" style="--stagger: 0">
        <div class="mb-4 flex items-start justify-between gap-4">
          <div>
            <h2 class="mb-1 text-[13.5px] font-semibold">浏览器直连接口</h2>
            <p class="text-[12px] leading-relaxed text-dim">请求由当前浏览器直接发送，不经过任何服务器。接口必须允许跨域请求。</p>
          </div>
          <button class="btn text-[11px]" @click="resetOpenAiPreset">OpenAI 预设</button>
        </div>

        <div class="grid gap-3 sm:grid-cols-2">
          <label class="block sm:col-span-2">
            <span class="field-label mb-1.5 block">API Key（可选）</span>
            <input v-model="settingsStore.settings.api.apiKey" type="password" class="input font-mono" autocomplete="off" placeholder="无鉴权接口可留空" />
          </label>
          <label class="block">
            <span class="field-label mb-1.5 block">模型（可选）</span>
            <input v-model="settingsStore.settings.api.model" class="input font-mono" placeholder="gpt-image-2" />
          </label>
          <label class="block">
            <span class="field-label mb-1.5 block">连接测试 URL</span>
            <input v-model="settingsStore.settings.api.testUrl" class="input font-mono" placeholder="https://api.example.com/v1/models/model-id" />
          </label>
          <label class="block sm:col-span-2">
            <span class="field-label mb-1.5 block">文生图 URL</span>
            <input v-model="settingsStore.settings.api.generation.url" class="input font-mono" placeholder="https://api.example.com/v1/images/generations" />
          </label>
          <label class="block sm:col-span-2">
            <span class="field-label mb-1.5 block">图片编辑 URL</span>
            <input v-model="settingsStore.settings.api.edit.url" class="input font-mono" placeholder="https://api.example.com/v1/images/edits" />
          </label>
        </div>

        <p class="mt-3 rounded-xl border border-red/20 bg-red/4 px-3 py-2 text-[11px] leading-relaxed text-red/85">
          API Key 会始终持久化在此浏览器的 IndexedDB 中，但不会加密。仅应在个人设备使用，不要部署到不受信任的公网页面。
        </p>

        <div class="mt-4 flex flex-wrap items-center gap-2">
          <button class="btn btn-amber text-[12px]" :disabled="settingsStore.testing" @click="testConnection">
            {{ settingsStore.testing ? '正在测试…' : '测试连接' }}
          </button>
          <button class="btn text-[12px]" @click="showAdvanced = !showAdvanced">{{ showAdvanced ? '收起高级配置' : '高级请求与响应配置' }}</button>
          <span class="ml-auto font-mono text-[10.5px]" :class="settingsStore.apiConfigured ? 'text-green' : 'text-red'">
            {{ settingsStore.apiConfigured ? '基本配置完整' : '尚未完成配置' }}
          </span>
        </div>

        <div v-if="showAdvanced" class="mt-5 space-y-5 border-t border-line pt-5">
          <div class="grid gap-3 sm:grid-cols-3">
            <label class="block">
              <span class="field-label mb-1.5 block">鉴权 Header</span>
              <input v-model="settingsStore.settings.api.authHeader" class="input font-mono" placeholder="Authorization" />
            </label>
            <label class="block">
              <span class="field-label mb-1.5 block">Key 前缀</span>
              <input v-model="settingsStore.settings.api.authPrefix" class="input font-mono" placeholder="Bearer " />
            </label>
            <label class="block">
              <span class="field-label mb-1.5 block">超时（毫秒）</span>
              <input v-model.number="settingsStore.settings.api.timeoutMs" type="number" min="1000" class="input font-mono" />
            </label>
            <label class="block">
              <span class="field-label mb-1.5 block">最大并发</span>
              <input v-model.number="settingsStore.settings.api.maxConcurrent" type="number" min="1" max="8" class="input font-mono" />
            </label>
            <label class="block sm:col-span-2">
              <span class="field-label mb-1.5 block">额外 Headers JSON</span>
              <input v-model="settingsStore.settings.api.extraHeaders" class="input font-mono" placeholder='{"X-Client":"VisionMuse"}' />
            </label>
          </div>

          <div v-for="operationName in operationNames" :key="operationName" class="rounded-xl border border-line bg-ink/25 p-3.5">
            <div class="mb-3 flex items-center justify-between">
              <span class="text-[12.5px] font-medium">{{ operationName === 'generation' ? '文生图请求' : '图片编辑请求' }}</span>
              <div class="flex gap-2">
                <select v-model="settingsStore.settings.api[operationName].method" class="input !w-auto !py-1.5 font-mono text-[11px]">
                  <option>POST</option><option>PUT</option><option>PATCH</option>
                </select>
                <select v-model="settingsStore.settings.api[operationName].bodyMode" class="input !w-auto !py-1.5 font-mono text-[11px]">
                  <option value="json">JSON</option><option value="multipart">Multipart</option>
                </select>
              </div>
            </div>
            <textarea v-model="settingsStore.settings.api[operationName].bodyTemplate" rows="10" class="input resize-y font-mono text-[11px] leading-relaxed" spellcheck="false" />
          </div>

          <div>
            <p class="mb-2 text-[11px] leading-relaxed text-dim">
              模板变量：<template v-for="(variable, index) in templateVariables" :key="variable"><code>{{ variable }}</code>{{ index < templateVariables.length - 1 ? '、' : '。' }}</template>
            </p>
            <p class="mb-3 rounded-lg border border-line bg-well px-3 py-2 text-[10.5px] leading-relaxed text-dim">
              不同接口的尺寸字段并不通用。如果接口不接受 <code>size: "4096x2304"</code>，可按服务商文档改用
              <code v-text="'{{width}}'" /> / <code v-text="'{{height}}'" />，或
              <code v-text="'{{aspectRatio}}'" /> / <code v-text="'{{resolution}}'" />。
            </p>
            <div class="grid gap-3 sm:grid-cols-3">
              <label v-for="field in responseFields" :key="field[0]" class="block">
                <span class="field-label mb-1.5 block">{{ field[1] }}</span>
                <input v-model="settingsStore.settings.api.response[field[0]]" class="input font-mono" />
              </label>
            </div>
            <p class="mt-2 text-[10.5px] text-dim">字段路径留空表示禁用；使用 <code>$</code> 表示图片数组中的当前元素本身。</p>
          </div>
        </div>
      </section>

      <section class="rise-in mb-5 rounded-2xl border border-line bg-well p-5 shadow-card" style="--stagger: 2">
        <h2 class="mb-4 text-[13.5px] font-semibold">默认生成参数与预算</h2>
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <div class="field-label mb-1.5">比例</div>
            <div class="seg" role="group" aria-label="默认图片比例">
              <button v-for="option in ASPECT_RATIO_OPTIONS" :key="option.value" :class="{ on: defaultAspectRatio === option.value }" @click="setDefaultAspectRatio(option.value)">{{ option.label }}</button>
            </div>
          </div>
          <div>
            <div class="field-label mb-1.5">分辨率</div>
            <div class="seg" role="group" aria-label="默认图片分辨率">
              <button v-for="option in RESOLUTION_OPTIONS" :key="option.value" :class="{ on: defaultResolution === option.value }" :title="getImageSize(defaultAspectRatio, option.value).replace('x', ' × ')" @click="setDefaultResolution(option.value)">{{ option.label }}</button>
            </div>
          </div>
          <div>
            <div class="field-label mb-1.5">质量</div>
            <div class="seg" role="group" aria-label="默认图片质量">
              <button v-for="option in QUALITY_OPTIONS" :key="option.value" :class="{ on: settingsStore.settings.defaultParams.quality === option.value }" @click="setDefaultQuality(option.value)">{{ option.label }}</button>
            </div>
          </div>
        </div>
        <div class="mt-4 grid gap-3 sm:grid-cols-3">
          <label v-for="quality in costQualities" :key="quality" class="block">
            <span class="field-label mb-1.5 block">{{ quality }} 单张预估成本</span>
            <input v-model.number="settingsStore.settings.estimatedCostByQuality[quality]" type="number" min="0" step="0.01" class="input font-mono" />
          </label>
        </div>
        <div class="mt-4">
          <div class="field-label mb-1.5">每日成本提醒阈值</div>
          <div class="flex items-center gap-3">
            <input v-model.number="settingsStore.settings.budgetDaily" type="range" min="1" max="100" class="flex-1 accent-amber" />
            <span class="w-16 text-right font-mono text-[13px] text-amberhi">${{ settingsStore.settings.budgetDaily }}</span>
          </div>
          <p class="mt-1.5 text-[11.5px] text-dim">今日已完成任务预估 ${{ tasks.todayCost.toFixed(2) }}。超过阈值时，提交前会要求确认。</p>
        </div>
      </section>

      <section class="rise-in mb-5 rounded-2xl border border-line bg-well p-5 shadow-card" style="--stagger: 4">
        <h2 class="mb-4 text-[13.5px] font-semibold">本地存储与备份</h2>
        <div class="mb-4 flex flex-wrap items-end justify-between gap-4">
          <div>
            <div class="font-mono text-[22px] leading-none text-amberhi">{{ storageMB }} <span class="text-[13px] text-fade">MB</span></div>
            <div class="mt-1 text-[11.5px] text-dim">{{ gallery.images.length }} 张图片（回收站 {{ gallery.trashed.length }} 张）· {{ quotaText }}</div>
          </div>
          <div class="flex flex-wrap gap-2">
            <button class="btn text-[12px]" :disabled="backingUp" @click="createBackup">{{ backingUp ? '正在打包…' : '导出完整备份' }}</button>
            <label class="btn cursor-pointer text-[12px]" :class="{ 'pointer-events-none opacity-50': importing }">
              {{ importing ? '正在导入…' : '导入备份' }}
              <input type="file" accept=".zip,application/zip" class="sr-only" @change="restoreBackup" />
            </label>
            <button class="btn btn-danger text-[12px]" @click="clearTrash">清空回收站</button>
          </div>
        </div>
        <label class="flex cursor-pointer items-start gap-2.5 text-[12.5px]">
          <input v-model="settingsStore.settings.autoDownloadOriginals" type="checkbox" class="mt-0.5 h-4 w-4 accent-amber" />
          <span>生成完成后自动下载原图<span class="mt-0.5 block text-[11px] text-dim">原图仍会安全保存在 IndexedDB；浏览器可能要求你允许自动下载多个文件。</span></span>
        </label>
        <p class="mt-3 text-[10.5px] leading-relaxed text-red/75">完整备份包含图片、任务、模板、提示词模块、设置以及 API Key，请像保管密钥一样保管备份文件。</p>
      </section>

      <p class="pb-4 text-center font-mono text-[10.5px] text-dim">VisionMuse · 浏览器直连生产版 · 数据仅保存在当前浏览器</p>
    </div>
  </div>
</template>
