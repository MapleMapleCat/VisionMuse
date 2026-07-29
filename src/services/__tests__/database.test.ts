import 'fake-indexeddb/auto'
import { describe, expect, it } from 'vitest'
import { reactive } from 'vue'
import { PROMPT_TEMPLATE_SCHEMA_VERSION } from '@/assets/prompt-templates'
import { cloneDefaultSettings } from '@/defaults/settings'
import {
  loadPromptModules,
  loadSettings,
  loadTemplates,
  savePromptModules,
  saveSettings,
  saveTemplates,
} from '@/services/database'

describe('IndexedDB repositories', () => {
  it('persists settings including the browser-local API key', async () => {
    const settings = reactive(cloneDefaultSettings())
    settings.api.apiKey = 'local-test-key'
    settings.api.generation.url = 'https://images.example.test/generate'

    await saveSettings(settings)

    const restoredSettings = await loadSettings()
    expect(restoredSettings?.api.apiKey).toBe('local-test-key')
    expect(restoredSettings?.api.generation.url).toBe('https://images.example.test/generate')
  })

  it('persists prompt templates and usage counts', async () => {
    const promptTemplate = {
      id: 'template-test',
      title: 'Test',
      summary: 'Template persistence test.',
      content: 'A {{subject}}',
      categoryId: 'people-characters' as const,
      medium: 'illustration' as const,
      styleIds: ['editorial' as const],
      variables: [{
        key: 'subject',
        label: 'Subject',
        placeholder: 'Describe the subject',
        required: true,
      }],
      origin: 'user' as const,
      useCount: 4,
      schemaVersion: PROMPT_TEMPLATE_SCHEMA_VERSION,
    }
    await saveTemplates([promptTemplate])

    const templates = await loadTemplates()
    expect(templates).toContainEqual(promptTemplate)
  })

  it('persists functional prompt modules independently from full templates', async () => {
    await savePromptModules([
      {
        id: 'module-test',
        title: 'Soft light',
        content: '柔和自然窗光',
        category: 'lighting',
        useCount: 3,
        sortOrder: 20,
      },
    ])

    const promptModules = await loadPromptModules()
    expect(promptModules).toContainEqual({
      id: 'module-test',
      title: 'Soft light',
      content: '柔和自然窗光',
      category: 'lighting',
      useCount: 3,
      sortOrder: 20,
    })
  })
})
