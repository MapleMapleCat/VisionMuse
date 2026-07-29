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
  open: [template: PromptTemplate]
}>()

const categoryLabel = computed(() => props.template.categoryId
  ? PROMPT_TEMPLATE_CATEGORY_BY_ID.get(props.template.categoryId)?.label ?? '未分类'
  : '未分类')
const mediumLabel = computed(() => props.template.medium
  ? PROMPT_TEMPLATE_MEDIUM_BY_ID.get(props.template.medium)?.label ?? '媒介未指定'
  : '媒介未指定')
const styleLabels = computed(() => props.template.styleIds
  .map(styleId => PROMPT_TEMPLATE_STYLE_BY_ID.get(styleId)?.label)
  .filter((label): label is string => Boolean(label))
  .slice(0, 3))
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
    class="rise-in group flex min-h-[292px] flex-col overflow-hidden rounded-2xl border border-line bg-well shadow-card transition-all duration-300 hover:-translate-y-1 hover:border-line2 hover:shadow-lift"
    :style="{ '--stagger': staggerIndex }"
  >
    <div class="flex flex-1 flex-col p-4 pb-3.5">
      <div class="flex items-start gap-3">
        <div class="min-w-0 flex-1">
          <div class="flex flex-wrap items-center gap-1.5">
            <span v-if="template.origin === 'user'" class="template-badge template-badge-source">我的</span>
            <span class="template-badge template-badge-category">{{ categoryLabel }}</span>
            <span class="template-badge">{{ mediumLabel }}</span>
          </div>
          <h2 class="mt-2.5 text-[14.5px] font-semibold leading-snug text-paper">{{ template.title }}</h2>
        </div>
        <span class="shrink-0 pt-0.5 font-mono text-[9px] text-dim">{{ template.useCount }} 次</span>
      </div>

      <p class="mt-2 text-[11.5px] leading-relaxed text-fade">{{ template.summary }}</p>

      <div class="mt-3 flex flex-wrap gap-1.5">
        <span v-for="styleLabel in styleLabels" :key="styleLabel" class="template-style-tag">
          {{ styleLabel }}
        </span>
        <span class="template-variable-tag">
          {{ template.variables.length ? `${template.variables.length} 个变量` : '无需填写' }}
        </span>
      </div>

      <p class="template-content-preview mt-3 flex-1 text-[12px] leading-[1.75] text-fade">
        <template v-for="(segment, segmentIndex) in contentSegments" :key="segmentIndex">
          <mark v-if="segment.isVariable" class="rounded bg-amber/8 px-1 py-px font-mono text-[10.5px] text-amberhi">
            {{ segment.text }}
          </mark>
          <template v-else>{{ segment.text }}</template>
        </template>
      </p>
    </div>

    <button class="template-open-button" @click="emit('open', template)">
      <span>{{ template.variables.length ? '填写模板' : '查看模板' }}</span>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
        <path d="m9 6 6 6-6 6" />
      </svg>
    </button>
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
.template-badge-category {
  border-color: color-mix(in srgb, var(--color-accent) 45%, var(--color-line2));
  background: var(--color-accentsoft);
  color: var(--color-accenthi);
}
.template-badge-source {
  border-color: color-mix(in srgb, var(--color-amber) 40%, var(--color-line2));
  background: color-mix(in srgb, var(--color-amber) 9%, transparent);
  color: var(--color-amberhi);
}
.template-style-tag {
  border-radius: 6px;
  background: color-mix(in srgb, var(--color-ink) 50%, transparent);
  padding: 3px 6px;
  font-family: var(--font-mono);
  font-size: 9px;
  color: var(--color-dim);
}
.template-variable-tag {
  border-radius: 6px;
  border: 1px solid var(--color-line);
  padding: 2px 6px;
  font-family: var(--font-mono);
  font-size: 8.5px;
  color: var(--color-dim);
}
.template-content-preview {
  display: -webkit-box;
  overflow: hidden;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 4;
}
.template-open-button {
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-top: 1px solid var(--color-line);
  background: color-mix(in srgb, var(--color-ink) 28%, transparent);
  padding: 10px 16px;
  font-size: 11.5px;
  font-weight: 600;
  color: var(--color-fade);
  transition:
    background var(--motion-fast) ease,
    color var(--motion-fast) ease;
}
.template-open-button:hover,
.template-open-button:focus-visible {
  background: var(--color-accentsoft);
  color: var(--color-accenthi);
}
.template-open-button svg {
  transition: transform var(--motion-fast) var(--ease-out-soft);
}
.template-open-button:hover svg,
.template-open-button:focus-visible svg {
  transform: translateX(2px);
}
</style>
