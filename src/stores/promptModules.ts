import { defineStore } from 'pinia'
import { ref } from 'vue'
import { DEFAULT_PROMPT_MODULES } from '@/assets/prompt-modules'
import { cloneForStorage } from '@/services/clone'
import { loadPromptModules, savePromptModule, savePromptModules } from '@/services/database'
import type { PromptModule } from '@/types'

export const usePromptModuleStore = defineStore('promptModules', () => {
  const promptModules = ref<PromptModule[]>([])
  const initialized = ref(false)

  async function initialize() {
    if (initialized.value) return
    const storedPromptModules = await loadPromptModules()
    if (storedPromptModules.length) {
      const storedPromptModulesById = new Map(
        storedPromptModules.map(promptModule => [promptModule.id, promptModule]),
      )
      const synchronizedDefaults = DEFAULT_PROMPT_MODULES.map(defaultPromptModule => ({
        ...defaultPromptModule,
        useCount: storedPromptModulesById.get(defaultPromptModule.id)?.useCount ?? 0,
      }))
      promptModules.value = synchronizedDefaults
      await savePromptModules(promptModules.value)
    } else {
      promptModules.value = cloneForStorage(DEFAULT_PROMPT_MODULES)
      await savePromptModules(promptModules.value)
    }
    initialized.value = true
  }

  async function recordUses(selectedPromptModules: PromptModule[]) {
    await Promise.all(selectedPromptModules.map(async selectedPromptModule => {
      const storedPromptModule = promptModules.value.find(promptModule => (
        promptModule.id === selectedPromptModule.id
      ))
      if (!storedPromptModule) return
      storedPromptModule.useCount += 1
      await savePromptModule(storedPromptModule)
    }))
  }

  return { promptModules, initialized, initialize, recordUses }
})
