import { isProxy, toRaw } from 'vue'

export function cloneForStorage<T>(value: T): T {
  return cloneValue(value, new WeakMap<object, unknown>()) as T
}

function cloneValue(value: unknown, seen: WeakMap<object, unknown>): unknown {
  if (value === null || typeof value !== 'object') return value

  const rawValue = isProxy(value) ? toRaw(value) : value
  if (rawValue instanceof Blob) return rawValue
  if (rawValue instanceof Date) return new Date(rawValue.getTime())
  if (rawValue instanceof ArrayBuffer) return rawValue.slice(0)
  if (ArrayBuffer.isView(rawValue)) return rawValue

  const existingClone = seen.get(rawValue)
  if (existingClone) return existingClone

  if (Array.isArray(rawValue)) {
    const clonedArray: unknown[] = []
    seen.set(rawValue, clonedArray)
    for (const item of rawValue) clonedArray.push(cloneValue(item, seen))
    return clonedArray
  }

  const clonedObject: Record<string, unknown> = {}
  seen.set(rawValue, clonedObject)
  for (const [key, nestedValue] of Object.entries(rawValue)) {
    clonedObject[key] = cloneValue(nestedValue, seen)
  }
  return clonedObject
}
