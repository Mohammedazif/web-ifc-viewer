import type { FragmentsModel } from '@thatopen/fragments'
import type { ItemRef } from '@/types'
import { getEngine } from './fragmentsEngine'

export interface ItemInfo {
  name: string | null
  category: string | null
}

/** Names and categories already known per model, filled by the tree and by hover lookups. */
const cache = new Map<string, Map<number, ItemInfo>>()

const NAME_ONLY = {
  attributesDefault: false,
  attributes: ['Name', 'LongName'],
  relationsDefault: { attributes: false, relations: false },
}

const attr = (data: any, key: string): string | null => {
  const value = data?.[key]?.value
  return value === undefined || value === null || value === '' ? null : String(value)
}

export function primeInfo(modelId: string, localId: number, info: ItemInfo) {
  let perModel = cache.get(modelId)
  if (!perModel) cache.set(modelId, (perModel = new Map()))
  perModel.set(localId, info)
}

export const getCachedInfo = (ref: ItemRef) => cache.get(ref.modelId)?.get(ref.localId) ?? null

export const dropModelInfo = (modelId: string) => { cache.delete(modelId) }
export const clearInfo = () => { cache.clear() }

/** Reads Name/LongName for many items at once and stores them in the cache. */
export async function loadNames(model: FragmentsModel, modelId: string, localIds: number[]) {
  const CHUNK = 4000
  for (let i = 0; i < localIds.length; i += CHUNK) {
    const ids = localIds.slice(i, i + CHUNK)
    const items = await model.getItemsData(ids, NAME_ONLY)
    items.forEach((data: any, index) => {
      const localId = typeof data?._localId?.value === 'number' ? data._localId.value : ids[index]
      primeInfo(modelId, localId, {
        name: attr(data, 'Name') ?? attr(data, 'LongName'),
        category: attr(data, '_category'),
      })
    })
  }
}

export async function fetchInfo(ref: ItemRef): Promise<ItemInfo | null> {
  const cached = getCachedInfo(ref)
  if (cached) return cached
  const model = getEngine()?.fragments.models.list.get(ref.modelId)
  if (!model) return null
  try {
    await loadNames(model, ref.modelId, [ref.localId])
  } catch {
    return null
  }
  return getCachedInfo(ref)
}
