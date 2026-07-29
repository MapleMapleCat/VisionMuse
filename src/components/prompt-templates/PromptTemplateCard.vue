<script setup lang="ts">
import { computed } from 'vue'
import {
  PROMPT_TEMPLATE_CATEGORY_BY_ID,
  PROMPT_TEMPLATE_MEDIUM_BY_ID,
  PROMPT_TEMPLATE_STYLE_BY_ID,
} from '@/assets/prompt-templates'
import type { PromptTemplate } from '@/types'

const props = defineProps<{
  template: PromptTemplate
  staggerIndex: number
}>()

const emit = defineEmits<{
  use: [template: PromptTemplate]
  copy: [template: PromptTemplate]
}>()

const categoryLabel = computed(() => props.template.categoryId
  ? PROMPT_TEMPLATE_CATEGORY_BY_ID.get(props.template.categoryId)?.label ?? '未分类'
  : '未分类')
const mediumLabel = computed(() => props.template.medium
  ? PROMPT_TEMPLATE_MEDIUM_BY_ID.get(props.template.medium)?.label ?? '媒介未指定'
  : '媒介未指定')
const styleLabels = computed(() => props.template.styleIds
  .map(styleId => PROMPT_TEMPLATE_STYLE_BY_ID.get(styleId)?.label)
  .filter((label): label is string => Boolean(label)))
const contentSegments = computed(() => props.template.content
  .split(/(\{\{[^{}]+\}\})/g)
  .filter(Boolean)
  .map(segment => ({
    text: segment,
    isVariable: /^\{\{[^{}]+\}\}$/.test(segment),
  })))
</script>

<template>
  <article
    class="rise-in group flex min-h-[320px] flex-col rounded-2xl border border-line bg-well p-4 shadow-card transition-all duration-300 hover:-translate-y-1 hover:border-line2 hover:shadow-lift"
    :style="{ '--stagger': staggerIndex }"
  >
    <div class="flex items-start gap-3">
      <div class="min-w-0 flex-1">
        <div class="flex flex-wrap items-center gap-1.5">
          <span v-if="template.origin === 'user'" class="template-badge template-badge-accent">我的</span>
          <span class="template-badge">{{ categoryLabel }}</span>
          <span class="template-badge">{{ mediumLabel }}</span>
        </div>
        <h2 class="mt-2.5 text-[14px] font-semibold leading-snug text-paper">{{ template.title }}</h2>
      </div>
      <span class="shrink-0 font-mono text-[9.5px] text-dim">用过 {{ template.useCount }} 次</span>
    </div>

    <p class="mt-2 text-[11.5px] leading-relaxed text-fade">{{ template.summary }}</p>

    <div class="mt-3 flex flex-wrap gap-1.5">
      <span v-for="styleLabel in styleLabels" :key="styleLabel" class="template-style-tag">
        {{ styleLabel }}
      </span>
      <span v-if="template.variables.length" class="template-style-tag">
        {{ template.variables.length }} 个变量
      </span>
    </div>

    <p class="template-content-preview mt-3 flex-1 text-[12px] leading-[1.75] text-fade">
      <template v-for="(segment, segmentIndex) in contentSegments" :key="segmentIndex">
        <mark v-if="segment.isVariable" class="rounded bg-amber/10 px-1 py-px font-mono text-[10.5px] text-amberhi">
          {{ segment.text }}
        </mark>
        <template v-else>{{ segment.text }}</template>
      </template>
    </p>

    <div class="mt-4 grid grid-cols-[1fr_auto] gap-2">
      <button class="btn btn-primary !py-2 text-[12px]" @click="emit('use', template)">
        {{ template.variables.length ? '填写并使用' : '直接使用' }}
      </button>
      <button class="btn btn-ghost !py-2 text-[12px]" @click="emit('copy', template)">
        {{ template.variables.length ? '填写后复制' : '复制' }}
      </button>
    </div>
  </article>
</template>

<style scoped>
.template-badge {
  border: 1px solid var(--color-line2);
  border-radius: 999px;
  padding: 2px 7px;
  font-size: 9.5px;
  color: var(--color-dim);
}
.template-badge-accent {
  border-color: color-mix(in srgb, var(--color-accent) 45%, var(--color-line2));
  background: var(--color-accentsoft);
  color: var(--color-accenthi);
}
.template-style-tag {
  border-radius: 6px;
  background: color-mix(in srgb, var(--color-ink) 50%, transparent);
  padding: 3px 6px;
  font-family: var(--font-mono);
  font-size: 9px;
  color: var(--color-dim);
}
.template-content-preview {
  display: -webkit-box;
  overflow: hidden;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 6;
}
</style>
