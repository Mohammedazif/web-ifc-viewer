import type { FragmentsEngine } from './fragmentsEngine'

export async function getFragmentBuffer(engine: FragmentsEngine, modelId: string): Promise<Uint8Array> {
  const model = engine.fragments.models.list.get(modelId)
  if (!model) throw new Error(`Model ${modelId} not found`)
  return await (model as any).getBuffer(false)
}

export async function downloadFragmentFile(
  engine: FragmentsEngine,
  modelId: string,
  fileName: string
): Promise<void> {
  const buffer = await getFragmentBuffer(engine, modelId)
  const baseName = fileName.replace(/\.ifc$/i, '')
  const file = new File([buffer as any], `${baseName}.frag`)
  const url = URL.createObjectURL(file)

  const a = document.createElement('a')
  a.href = url
  a.download = file.name
  a.click()

  URL.revokeObjectURL(url)
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

export function formatDuration(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)}ms`
  return `${(ms / 1000).toFixed(1)}s`
}
