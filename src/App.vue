<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useGalleryStore } from '@/stores/gallery'
import { useUiStore } from '@/stores/ui'
import { useSettingsStore } from '@/stores/settings'
import { useTaskStore } from '@/stores/tasks'
import { useTemplateStore } from '@/stores/templates'
import { usePromptModuleStore } from '@/stores/promptModules'
import SideNav from '@/components/SideNav.vue'
import ImageViewer from '@/components/ImageViewer.vue'
import GenerateDock from '@/components/GenerateDock.vue'

const gallery = useGalleryStore()
const ui = useUiStore()
const settings = useSettingsStore()
const tasks = useTaskStore()
const templates = useTemplateStore()
const promptModules = usePromptModuleStore()
const ready = ref(false)
const startupError = ref('')

onMounted(async () => {
  try {
    await settings.initialize()
    ui.draftParams = { ...settings.settings.defaultParams }
    await Promise.all([gallery.initialize(), templates.initialize(), promptModules.initialize()])
    await tasks.initialize()
    ready.value = true
  } catch (error) {
    startupError.value = error instanceof Error ? error.message : String(error)
  }
})
</script>

<template>
  <div v-if="ready" class="app-shell flex h-full">
    <SideNav />
    <main class="app-main min-w-0 flex-1 overflow-hidden">
      <router-view v-slot="{ Component }">
        <Transition name="page" mode="out-in" :duration="{ enter: 280, leave: 170 }">
          <component :is="Component" />
        </Transition>
      </router-view>
    </main>

    <GenerateDock />
    <ImageViewer />

    <!-- 全局轻提示 -->
    <Transition name="toast">
      <div
        v-if="ui.toast"
        :key="ui.toast.id"
        class="toast-message fixed right-6 top-5 z-[60] rounded-xl border border-line bg-well/95 px-4 py-2.5 text-[12.5px] shadow-pop backdrop-blur"
      >
        {{ ui.toast.text }}
      </div>
    </Transition>
  </div>
  <div v-else class="flex h-full items-center justify-center bg-ink px-6 text-center">
    <div>
      <div v-if="!startupError" class="pulse-soft mx-auto mb-4 h-3 w-3 rounded-full bg-accent" />
      <p class="display text-[22px]">{{ startupError ? '本地数据加载失败' : '正在打开本地工作室' }}</p>
      <p class="mt-2 max-w-lg text-[12px] leading-relaxed" :class="startupError ? 'text-red' : 'text-dim'">
        {{ startupError || '正在恢复设置、图库、提示词构建数据和任务记录…' }}
      </p>
    </div>
  </div>
</template>

<style scoped>
.toast-enter-active { transition: all 0.34s cubic-bezier(0.34, 1.45, 0.5, 1); }
.toast-leave-active { transition: all 0.2s ease; }
.toast-enter-from, .toast-leave-to { opacity: 0; transform: translateY(-10px) scale(0.96); }

@media (max-width: 720px) {
  .app-shell { display: block; padding-top: 60px; }
  .app-main { height: calc(100svh - 60px); }
  .toast-message { top: 70px; right: 12px; left: 12px; text-align: center; }
}
</style>
