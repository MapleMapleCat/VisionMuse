<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import {
  createPromptTemplateExampleValues,
  fillPromptTemplate,
} from '@/services/promptTemplates'
import type { PromptTemplate } from '@/types'

const props = defineProps<{
  template: PromptTemplate | null
}>()

const emit = defineEmits<{
  close: []
  copy: [content: string]
  use: [content: string]
}>()

const variableValues = ref<Record<string, string>>({})
const hasVariables = computed(() => Boolean(props.template?.variables.length))

watch(
  () => props.template,
  (template) => {
    variableValues.value = template
      ? createPromptTemplateExampleValues(template)
      : {}
  },
  { immediate: true },
)

const fillResult = computed(() => props.template
  ? fillPromptTemplate(props.template, variableValues.value)
  : {
      content: '',
      missingRequiredVariableKeys: [],
      unresolvedVariableKeys: [],
      ready: false,
    })

function copyFilledPrompt() {
  if (!fillResult.value.ready) return
  emit('copy', fillResult.value.content)
}

function useFilledPrompt() {
  if (!fillResult.value.ready) return
  emit('use', fillResult.value.content)
}
</script>

<template>
  <Teleport to="body">
    <div v-if="template" class="fixed inset-0 z-50 flex items-center justify-center px-4 py-6">
      <button
        class="fade-in absolute inset-0 cursor-default bg-paper/25 backdrop-blur-[3px]"
        aria-label="关闭模板填写窗口"
        @click="emit('close')"
      />
      <section
        class="pop-in relative flex max-h-[90vh] max-w-full flex-col overflow-hidden rounded-2xl border border-line bg-well shadow-pop"
        :class="hasVariables ? 'w-[760px]' : 'w-[660px]'"
        role="dialog"
        aria-modal="true"
        :aria-labelledby="`template-dialog-${template.id}`"
      >
        <header class="border-b border-line px-5 py-4">
          <div class="flex items-start justify-between gap-4">
            <div>
              <p class="field-label">Complete prompt</p>
              <h3 :id="`template-dialog-${template.id}`" class="mt-1 text-[15px] font-semibold">
                {{ template.title }}
              </h3>
              <p class="mt-1 text-[11.5px] leading-relaxed text-dim">{{ template.summary }}</p>
            </div>
            <button class="dialog-close-button" aria-label="关闭模板窗口" @click="emit('close')">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
                <path d="m6 6 12 12M18 6 6 18" />
              </svg>
            </button>
          </div>
        </header>

        <div
          class="grid min-h-0 flex-1 overflow-y-auto md:overflow-hidden"
          :class="hasVariables ? 'md:grid-cols-[300px_minmax(0,1fr)]' : 'grid-cols-1'"
        >
          <div v-if="hasVariables" class="border-b border-line p-5 md:overflow-y-auto md:border-b-0 md:border-r">
            <p class="field-label">Variables</p>
            <p class="mt-1 text-[11px] leading-relaxed text-dim">
              已用示例内容预填变量，可直接使用或按需修改，最终文本不会保留占位符。
            </p>

            <div class="mt-4 space-y-4">
              <label v-for="variable in template.variables" :key="variable.key" class="block">
                <span class="flex items-center justify-between gap-3 text-[11.5px] font-semibold">
                  {{ variable.label }}
                  <small v-if="variable.required" class="font-mono text-[8.5px] text-amberhi">必填</small>
                </span>
                <input
                  v-model="variableValues[variable.key]"
                  class="input mt-1.5"
                  :placeholder="variable.placeholder"
                  @keydown.ctrl.enter.prevent="useFilledPrompt"
                  @keydown.meta.enter.prevent="useFilledPrompt"
                />
                <span v-if="variable.example" class="mt-1 block text-[9.5px] leading-relaxed text-dim">
                  示例：{{ variable.example }}
                </span>
              </label>
            </div>
          </div>

          <div class="flex min-h-0 flex-col p-5 md:overflow-hidden">
            <div class="flex items-center justify-between gap-3">
              <div>
                <p class="field-label">Live preview</p>
                <h4 class="mt-1 text-[12.5px] font-semibold">最终提示词预览</h4>
              </div>
              <span
                class="rounded-full px-2.5 py-1 font-mono text-[9px]"
                :class="fillResult.ready ? 'bg-accentsoft text-accenthi' : 'bg-amber/10 text-amberhi'"
              >
                {{ fillResult.ready ? '已完成' : `待填 ${fillResult.missingRequiredVariableKeys.length} 项` }}
              </span>
            </div>

            <div class="mt-3 min-h-44 flex-1 rounded-xl border border-line bg-ink/45 p-4 md:overflow-y-auto">
              <p class="whitespace-pre-wrap text-[12px] leading-[1.85] text-fade">{{ fillResult.content }}</p>
            </div>

            <div class="mt-4 grid grid-cols-[auto_1fr] gap-2">
              <button class="btn px-4" :disabled="!fillResult.ready" @click="copyFilledPrompt">
                复制最终提示词
              </button>
              <button class="btn btn-primary" :disabled="!fillResult.ready" @click="useFilledPrompt">
                带入直接创作
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  </Teleport>
</template>

<style scoped>
.dialog-close-button {
  display: grid;
  height: 30px;
  width: 30px;
  flex: 0 0 auto;
  place-items: center;
  border: 1px solid transparent;
  border-radius: 9px;
  color: var(--color-dim);
  transition:
    border-color var(--motion-fast) ease,
    background var(--motion-fast) ease,
    color var(--motion-fast) ease;
}
.dialog-close-button:hover,
.dialog-close-button:focus-visible {
  border-color: var(--color-line2);
  background: color-mix(in srgb, var(--color-ink) 45%, transparent);
  color: var(--color-paper);
}
</style>
