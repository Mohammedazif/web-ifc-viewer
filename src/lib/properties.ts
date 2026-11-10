import type { ItemRef } from '@/types'
import { getEngine } from './fragmentsEngine'

export interface PropertyRow {
  name: string
  value: string
}

export interface PropertyGroup {
  title: string
  rows: PropertyRow[]
}

export interface ItemProperties {
  name: string | null
  category: string | null
  guid: string | null
  localId: number
  attributes: PropertyRow[]
  groups: PropertyGroup[]
}

const CONFIG = {
  attributesDefault: true,
  relations: {
    IsDefinedBy: { attributes: true, relations: true },
    DefinesOcurrence: { attributes: false, relations: false },
  },
  relationsDefault: { attributes: false, relations: false },
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined || value === '') return '-'
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  if (typeof value === 'number') {
    return Number.isInteger(value) ? String(value) : String(Math.round(value * 1000) / 1000)
  }
  if (Array.isArray(value)) return value.map(formatValue).join(', ')
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

const splitWords = (key: string) => key.replace(/([a-z0-9])([A-Z])/g, '$1 $2')

const isAttr = (entry: unknown): entry is { value: unknown } =>
  !!entry && typeof entry === 'object' && !Array.isArray(entry) && 'value' in (entry as object)

/** Rows for one property set / quantity set coming through IsDefinedBy. */
function rowsOfSet(set: any): PropertyRow[] {
  const rows: PropertyRow[] = []
  for (const [key, entry] of Object.entries(set)) {
    if (!Array.isArray(entry)) continue
    for (const prop of entry as any[]) {
      const name = prop?.Name?.value
      if (name === undefined || name === null) continue
      // Properties carry NominalValue; quantities carry LengthValue, AreaValue, …
      const valueKey = Object.keys(prop).find(k => k === 'NominalValue' || /Value$/.test(k))
      const value = valueKey && isAttr(prop[valueKey]) ? prop[valueKey].value : undefined
      rows.push({ name: String(name), value: formatValue(value) })
    }
    if (rows.length > 0 && (key === 'HasProperties' || key === 'Quantities')) break
  }
  return rows
}

export async function fetchItemProperties(ref: ItemRef): Promise<ItemProperties | null> {
  const model = getEngine()?.fragments.models.list.get(ref.modelId)
  if (!model) return null

  const [data] = (await model.getItemsData([ref.localId], CONFIG)) as any[]
  if (!data) return null

  const result: ItemProperties = {
    name: null,
    category: null,
    guid: null,
    localId: ref.localId,
    attributes: [],
    groups: [],
  }

  for (const [key, entry] of Object.entries(data)) {
    if (Array.isArray(entry)) {
      if (key !== 'IsDefinedBy') continue
      for (const set of entry as any[]) {
        const rows = rowsOfSet(set)
        if (rows.length === 0) continue
        result.groups.push({ title: formatValue(set?.Name?.value ?? 'Properties'), rows })
      }
      continue
    }
    if (!isAttr(entry)) continue
    if (key === '_category') result.category = formatValue(entry.value)
    else if (key === '_guid') result.guid = formatValue(entry.value)
    else if (key === '_localId') continue
    else if (key === 'Name') {
      if (entry.value !== null && entry.value !== '') result.name = String(entry.value)
    } else if (entry.value !== null && entry.value !== undefined && entry.value !== '') {
      result.attributes.push({ name: splitWords(key), value: formatValue(entry.value) })
    }
  }

  result.groups.sort((a, b) => a.title.localeCompare(b.title))
  return result
}
