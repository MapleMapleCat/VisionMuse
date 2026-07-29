import { defineStore } from 'pinia'
import { ref } from 'vue'
import { DEFAULT_TEMPLATES } from '@/defaults/templates'
import { loadTemplates, saveTemplate, saveTemplates } from '@/services/database'
import {
  createUserPromptTemplate,
  synchronizePromptTemplates,
} from '@/services/promptTemplates'
import type { PromptTemplate } from '@/types'
import { createId } from '@/utils/ids'

export const useTemplateStore = defineStore('templates', () => {
  const templates = ref<PromptTemplate[]>([])
  const initialized = ref(false)

  async function initialize() {
    if (initialized.value) return
    const storedTemplates = await loadTemplates()
    templates.value = synchronizePromptTemplates(storedTemplates, DEFAULT_TEMPLATES)
    await saveTemplates(templates.value)
    initialized.value = true
  }

  async function recordUse(template: PromptTemplate) {
    template.useCount += 1
    await saveTemplate(template)
  }

  async function createFromPrompt(prompt: string) {
    const template = createUserPromptTemplate(prompt, createId('tpl'))
    templates.value.unshift(template)
    await saveTemplate(template)
    return template
  }

  return { templates, initialized, initialize, recordUse, createFromPrompt }
})
