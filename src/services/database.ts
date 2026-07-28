import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import type {
  AppSettings,
  PromptTemplate,
  StoredGenerationTask,
  StoredImageRecord,
} from '@/types'
import { cloneForStorage } from './clone'

interface VisionMuseDatabase extends DBSchema {
  settings: {
    key: 'app'
    value: AppSettings
  }
  tasks: {
    key: string
    value: StoredGenerationTask
    indexes: { 'by-created-at': number }
  }
  images: {
    key: string
    value: StoredImageRecord
    indexes: { 'by-created-at': number; 'by-deleted-at': number }
  }
  templates: {
    key: string
    value: PromptTemplate
  }
}

let databasePromise: Promise<IDBPDatabase<VisionMuseDatabase>> | undefined

export function getDatabase(): Promise<IDBPDatabase<VisionMuseDatabase>> {
  if (!databasePromise) {
    databasePromise = openDB<VisionMuseDatabase>('vision-muse', 1, {
      upgrade(database) {
        database.createObjectStore('settings')

        const taskStore = database.createObjectStore('tasks', { keyPath: 'id' })
        taskStore.createIndex('by-created-at', 'createdAt')

        const imageStore = database.createObjectStore('images', { keyPath: 'id' })
        imageStore.createIndex('by-created-at', 'createdAt')
        imageStore.createIndex('by-deleted-at', 'deletedAt')

        database.createObjectStore('templates', { keyPath: 'id' })
      },
    })
  }
  return databasePromise
}

export async function loadSettings(): Promise<AppSettings | undefined> {
  return (await getDatabase()).get('settings', 'app')
}

export async function saveSettings(settings: AppSettings): Promise<void> {
  await (await getDatabase()).put('settings', cloneForStorage(settings), 'app')
}

export async function loadTasks(): Promise<StoredGenerationTask[]> {
  return (await getDatabase()).getAllFromIndex('tasks', 'by-created-at')
}

export async function saveTask(task: StoredGenerationTask): Promise<void> {
  await (await getDatabase()).put('tasks', cloneForStorage(task))
}

export async function deleteTask(taskId: string): Promise<void> {
  await (await getDatabase()).delete('tasks', taskId)
}

export async function loadImages(): Promise<StoredImageRecord[]> {
  return (await getDatabase()).getAllFromIndex('images', 'by-created-at')
}

export async function saveImage(image: StoredImageRecord): Promise<void> {
  await (await getDatabase()).put('images', cloneForStorage(image))
}

export async function saveImages(images: StoredImageRecord[]): Promise<void> {
  const database = await getDatabase()
  const transaction = database.transaction('images', 'readwrite')
  await Promise.all([...images.map(image => transaction.store.put(cloneForStorage(image))), transaction.done])
}

export async function deleteImages(imageIds: string[]): Promise<void> {
  const database = await getDatabase()
  const transaction = database.transaction('images', 'readwrite')
  await Promise.all([...imageIds.map(imageId => transaction.store.delete(imageId)), transaction.done])
}

export async function loadTemplates(): Promise<PromptTemplate[]> {
  return (await getDatabase()).getAll('templates')
}

export async function saveTemplate(template: PromptTemplate): Promise<void> {
  await (await getDatabase()).put('templates', cloneForStorage(template))
}

export async function saveTemplates(templates: PromptTemplate[]): Promise<void> {
  const database = await getDatabase()
  const transaction = database.transaction('templates', 'readwrite')
  await Promise.all([...templates.map(template => transaction.store.put(cloneForStorage(template))), transaction.done])
}

export async function deleteTemplate(templateId: string): Promise<void> {
  await (await getDatabase()).delete('templates', templateId)
}

export async function replaceAllData(data: {
  settings: AppSettings
  tasks: StoredGenerationTask[]
  images: StoredImageRecord[]
  templates: PromptTemplate[]
}): Promise<void> {
  const database = await getDatabase()
  const transaction = database.transaction(['settings', 'tasks', 'images', 'templates'], 'readwrite')
  await Promise.all([
    transaction.objectStore('settings').clear(),
    transaction.objectStore('tasks').clear(),
    transaction.objectStore('images').clear(),
    transaction.objectStore('templates').clear(),
  ])
  await transaction.objectStore('settings').put(cloneForStorage(data.settings), 'app')
  await Promise.all(data.tasks.map(task => transaction.objectStore('tasks').put(cloneForStorage(task))))
  await Promise.all(data.images.map(image => transaction.objectStore('images').put(cloneForStorage(image))))
  await Promise.all(data.templates.map(template => transaction.objectStore('templates').put(cloneForStorage(template))))
  await transaction.done
}
