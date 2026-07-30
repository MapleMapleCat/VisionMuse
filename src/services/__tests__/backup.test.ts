import { strToU8, zipSync } from 'fflate'
import { describe, expect, it } from 'vitest'
import { DEFAULT_PROMPT_MODULES } from '@/assets/prompt-modules'
import { cloneDefaultSettings } from '@/defaults/settings'
import { importBackup } from '@/services/backup'

describe('backup compatibility', () => {
  it('restores default prompt modules when importing a version 1 backup', async () => {
    const versionOneManifest = {
      format: 'vision-muse-backup',
      version: 1,
      exportedAt: '2026-07-28T00:00:00.000Z',
      settings: cloneDefaultSettings(),
      tasks: [],
      images: [],
      templates: [],
    }
    const archive = zipSync({
      'manifest.json': strToU8(JSON.stringify(versionOneManifest)),
    })
    const backupFile = new File([archive], 'vision-muse-v1.zip', { type: 'application/zip' })

    const restoredBackup = await importBackup(backupFile)

    expect(restoredBackup.promptModules).toEqual(DEFAULT_PROMPT_MODULES)
  })

  it('normalizes legacy prompt templates while importing old backups', async () => {
    const versionOneManifest = {
      format: 'vision-muse-backup',
      version: 1,
      exportedAt: '2026-07-28T00:00:00.000Z',
      settings: cloneDefaultSettings(),
      tasks: [],
      images: [],
      templates: [{
        id: 'legacy-template',
        title: 'Legacy template',
        content: 'Create {{subject}} in soft light',
        category: '我的',
        useCount: 7,
      }],
    }
    const archive = zipSync({
      'manifest.json': strToU8(JSON.stringify(versionOneManifest)),
    })
    const backupFile = new File([archive], 'vision-muse-legacy-template.zip', {
      type: 'application/zip',
    })

    const restoredBackup = await importBackup(backupFile)

    expect(restoredBackup.templates).toContainEqual(expect.objectContaining({
      id: 'legacy-template',
      categoryId: null,
      medium: null,
      origin: 'user',
      useCount: 7,
      variables: [expect.objectContaining({ key: 'subject', required: true })],
    }))
  })

  it('rejects invalid runtime settings before they can replace local data', async () => {
    const invalidSettings = cloneDefaultSettings()
    invalidSettings.api.maxConcurrent = 0
    const invalidManifest = {
      format: 'vision-muse-backup',
      version: 1,
      exportedAt: '2026-07-28T00:00:00.000Z',
      settings: invalidSettings,
      tasks: [],
      images: [],
      templates: [],
    }
    const archive = zipSync({
      'manifest.json': strToU8(JSON.stringify(invalidManifest)),
    })
    const backupFile = new File([archive], 'vision-muse-invalid-settings.zip', {
      type: 'application/zip',
    })

    await expect(importBackup(backupFile)).rejects.toThrow('maxConcurrent')
  })

  it('fills missing settings groups in partial legacy backups', async () => {
    const partialManifest = {
      format: 'vision-muse-backup',
      version: 1,
      exportedAt: '2026-07-28T00:00:00.000Z',
      settings: {},
      tasks: [],
      images: [],
      templates: [],
    }
    const archive = zipSync({
      'manifest.json': strToU8(JSON.stringify(partialManifest)),
    })
    const backupFile = new File([archive], 'vision-muse-partial-settings.zip', {
      type: 'application/zip',
    })

    const restoredBackup = await importBackup(backupFile)

    expect(restoredBackup.settings).toEqual(cloneDefaultSettings())
  })
})
