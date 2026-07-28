import { defineStore } from 'pinia'
import { ref } from 'vue'
import { DEFAULT_TEMPLATES } from '@/defaults/templates'
import { loadTemplates, saveTemplate, saveTemplates } from '@/services/database'
import type { PromptTemplate } from '@/types'
import { createId } from '@/utils/ids'
import { cloneForStorage } from '@/services/clone'

export const useTemplateStore = defineStore('templates', () => {
  const templates = ref<PromptTemplate[]>([])
  const initialized = ref(false)

  async function initialize() {
    if (initialized.value) return
    const storedTemplates = await loadTemplates()
    if (storedTemplates.length) {
      templates.value = storedTemplates
    } else {
      templates.value = cloneForStorage(DEFAULT_TEMPLATES)
      await saveTemplates(templates.value)
    }
    initialized.value = true
  }

  async function recordUse(template: PromptTemplate) {
    template.useCount++
    await saveTemplate(template)
  }

  async function createFromPrompt(prompt: string) {
    const template: PromptTemplate = {
      id: createId('tpl'),
      title: prompt.slice(0, 12) + (prompt.length > 12 ? '…' : ''),
      content: prompt,
      category: '我的',
      useCount: 0,
    }
    templates.value.unshift(template)
    await saveTemplate(template)
    return template
  }

  return { templates, initialized, initialize, recordUse, createFromPrompt }
})
