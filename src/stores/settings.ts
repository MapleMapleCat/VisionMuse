import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { LEGACY_OPENAI_EDIT_BODY, cloneDefaultSettings } from '@/defaults/settings'
import { loadSettings, saveSettings } from '@/services/database'
import { testApiConnection } from '@/services/imageApi'
import type { AppSettings } from '@/types'
import { cloneForStorage } from '@/services/clone'
import { normalizeAppSettings, parseAppSettings, parseApiSettings } from '@/services/settingsValidation'

function mergeSettings(savedSettings?: AppSettings): AppSettings {
  const normalizedSettings = normalizeAppSettings(savedSettings)
  if (normalizedSettings.api.edit.bodyTemplate === LEGACY_OPENAI_EDIT_BODY) {
    normalizedSettings.api.edit.bodyTemplate = cloneDefaultSettings().api.edit.bodyTemplate
  }
  return normalizedSettings
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
    let snapshot: AppSettings
    try {
      snapshot = cloneForStorage(parseAppSettings(settings.value))
    } catch (error) {
      saveError.value = error instanceof Error ? error.message : String(error)
      throw error
    }
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
      await testApiConnection(parseApiSettings(settings.value.api))
    } finally {
      testing.value = false
    }
  }

  return {
    settings, saving, testing, saveError, apiConfigured,
    initialize, persist, waitForSaves, resetToOpenAiDefaults, testConnection,
  }
})
