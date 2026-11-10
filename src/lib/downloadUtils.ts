import JSZip from 'jszip'
import type { LoadedModel } from '@/types'
import { getEngine } from './fragmentsEngine'
import { toast } from '@/store/useViewerStore'

const fragName = (fileName: string) => `${fileName.replace(/\.(ifc|frag)$/i, '')}.frag`

async function getFragmentBuffer(modelId: string): Promise<ArrayBuffer> {
  const model = getEngine()?.fragments.models.list.get(modelId)
  if (!model) throw new Error('The model is not loaded in the viewer yet')
  return model.getBuffer(false)
}

function saveBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  a.click()
  // Give the browser a moment to start the download before releasing the blob.
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export async function downloadModel(model: LoadedModel) {
  try {
    const buffer = await getFragmentBuffer(model.modelId)
    const name = fragName(model.originalFileName)
    saveBlob(new Blob([buffer]), name)
    toast(`Saved ${name}`, 'success')
  } catch (err: any) {
    console.error('Download failed:', err)
    toast(`Download failed: ${err?.message ?? 'unknown error'}`, 'error')
  }
}

export async function downloadAllAsZip(models: LoadedModel[]) {
  if (models.length === 0) return
  try {
    const zip = new JSZip()
    const used = new Set<string>()
    for (const model of models) {
      let name = fragName(model.originalFileName)
      // Two uploads can share a file name; keep both in the archive.
      for (let n = 2; used.has(name); n++) {
        name = fragName(model.originalFileName).replace(/\.frag$/, ` (${n}).frag`)
      }
      used.add(name)
      zip.file(name, await getFragmentBuffer(model.modelId))
    }
    saveBlob(await zip.generateAsync({ type: 'blob' }), 'models.zip')
    toast(`Saved ${models.length} models as models.zip`, 'success')
  } catch (err: any) {
    console.error('Download all failed:', err)
    toast(`Download failed: ${err?.message ?? 'unknown error'}`, 'error')
  }
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
