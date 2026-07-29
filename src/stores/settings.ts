import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { LEGACY_OPENAI_EDIT_BODY, cloneDefaultSettings } from '@/defaults/settings'
import { loadSettings, saveSettings } from '@/services/database'
import { testApiConnection } from '@/services/imageApi'
import type { AppSettings } from '@/types'
import { cloneForStorage } from '@/services/clone'

function mergeSettings(savedSettings?: AppSettings): AppSettings {
  const defaults = cloneDefaultSettings()
  if (!savedSettings) return defaults
  const savedEditSettings = { ...defaults.api.edit, ...savedSettings.api?.edit }
  if (savedEditSettings.bodyTemplate === LEGACY_OPENAI_EDIT_BODY) {
    savedEditSettings.bodyTemplate = defaults.api.edit.bodyTemplate
  }

  return {
    ...defaults,
    ...savedSettings,
    api: {
      ...defaults.api,
      ...savedSettings.api,
      generation: { ...defaults.api.generation, ...savedSettings.api?.generation },
      edit: savedEditSettings,
      response: { ...defaults.api.response, ...savedSettings.api?.response },
    },
    defaultParams: { ...defaults.defaultParams, ...savedSettings.defaultParams },
    estimatedCostByQuality: { ...defaults.estimatedCostByQuality, ...savedSettings.estimatedCostByQuality },
  }
}

export const useSettingsStore = defineStore('settings', () => {
  const settings = ref<AppSettings>(cloneDefaultSettings())
  const initialized = ref(false)
  const saving = ref(false)
  const testing = ref(false)
  const saveError = ref('')
  let pendingSaves = 0
  let saveQueue: Promise<void> = Promise.resolve()

  const apiConfigured = computed(() => Boolean(
    settings.value.api.generation.url.trim(),
  ))

  async function initialize() {
    if (initialized.value) return
    settings.value = mergeSettings(await loadSettings())
    initialized.value = true
  }

  async function persist() {
    const snapshot = cloneForStorage(settings.value)
    pendingSaves++
    saving.value = true
    const operation = saveQueue.then(() => saveSettings(snapshot))
    saveQueue = operation.catch(() => undefined)
    try {
      await operation
      saveError.value = ''
    } catch (error) {
      saveError.value = error instanceof Error ? error.message : String(error)
      throw error
    } finally {
      pendingSaves--
      saving.value = pendingSaves > 0
    }
  }

  async function waitForSaves() {
    await saveQueue
  }

  async function resetToOpenAiDefaults() {
    const apiKey = settings.value.api.apiKey
    settings.value = cloneDefaultSettings()
    settings.value.api.apiKey = apiKey
    await persist()
  }

  async function testConnection() {
    testing.value = true
    try {
      await testApiConnection(settings.value.api)
    } finally {
      testing.value = false
    }
  }

  return {
    settings, initialized, saving, testing, saveError, apiConfigured,
    initialize, persist, waitForSaves, resetToOpenAiDefaults, testConnection,
  }
})
