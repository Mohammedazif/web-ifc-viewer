import { useState, useCallback } from 'react'
import { convertIfcToFrag } from '@/lib/ifcConverter'
import { useAppStore } from '@/store/useAppStore'
import { useModelStore } from '@/store/useModelStore'
import { DEFAULT_MODEL_ID } from '@/constants/config'
import type { LoadedModel } from '@/types'

type Status = 'idle' | 'converting' | 'done' | 'error'

export function useIfcConverter() {
  const [status, setStatus] = useState<Status>('idle')
  const [progress, setProgress] = useState(0)
  const [stepLabel, setStepLabel] = useState('')
  const [error, setError] = useState<string | null>(null)

  const { setStep, setProgress: setStoreProgress, setError: setStoreError } = useAppStore()
  const { addModel } = useModelStore()

  const convert = useCallback(
    async (bytes: Uint8Array, fileName: string, fileSizeBytes: number) => {
      setStatus('converting')
      setProgress(0)
      setError(null)
      setStep('converting')

      try {
        const { fragBytes, conversionTimeMs } = await convertIfcToFrag(
          bytes,
          (p, label) => {
            setProgress(p)
            setStepLabel(label)
            setStoreProgress(p, label)
          }
        )

        const model: LoadedModel = {
          modelId: `model-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 9)}`,
          originalFileName: fileName,
          originalFileSizeBytes: fileSizeBytes,
          convertedFileSizeBytes: fragBytes.byteLength,
          conversionTimeMs,
          fragBytes,
        }

        addModel(model)
        setStatus('done')
        setStep('viewing')
      } catch (err: any) {
        const msg = err?.message ?? 'Conversion failed'
        setError(msg)
        setStatus('error')
        setStoreError(msg)
      }
    },
    []
  )

  const reset = useCallback(() => {
    setStatus('idle')
    setProgress(0)
    setStepLabel('')
    setError(null)
  }, [])

  return { convert, status, progress, stepLabel, error, reset }
}
