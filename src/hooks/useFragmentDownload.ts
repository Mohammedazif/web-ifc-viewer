import { useState, useCallback } from 'react'
import { downloadFragmentFile, getFragmentBuffer } from '@/lib/downloadUtils'
import type { FragmentsEngine } from '@/lib/fragmentsEngine'
import type { LoadedModel } from '@/types'
import JSZip from 'jszip'

export function useFragmentDownload(engineRef: React.MutableRefObject<FragmentsEngine | null>) {
  const [isDownloading, setIsDownloading] = useState(false)

  const download = useCallback(async (modelId: string, fileName: string) => {
    const engine = engineRef.current
    if (!engine) return

    setIsDownloading(true)
    try {
      await downloadFragmentFile(engine, modelId, fileName)
    } catch (err) {
      console.error('Download failed:', err)
    } finally {
      setIsDownloading(false)
    }
  }, [])

  const downloadAllAsZip = useCallback(async (models: LoadedModel[]) => {
    const engine = engineRef.current
    if (!engine || models.length === 0) return

    setIsDownloading(true)
    try {
      const zip = new JSZip()
      
      for (const model of models) {
        const buffer = await getFragmentBuffer(engine, model.modelId)
        const baseName = model.originalFileName.replace(/\.ifc$/i, '')
        zip.file(`${baseName}.frag`, buffer)
      }
      
      const content = await zip.generateAsync({ type: 'blob' })
      const url = URL.createObjectURL(content)
      const a = document.createElement('a')
      a.href = url
      a.download = 'models.zip'
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Download all failed:', err)
    } finally {
      setIsDownloading(false)
    }
  }, [])

  return { download, downloadAllAsZip, isDownloading }
}
