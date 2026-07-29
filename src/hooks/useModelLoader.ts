import { useState, useCallback } from 'react'
import { Box3 } from 'three'
import type { FragmentsEngine } from '@/lib/fragmentsEngine'

export function useModelLoader(engineRef: React.MutableRefObject<FragmentsEngine | null>) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadModel = useCallback(async (fragBytes: ArrayBuffer, modelId: string) => {
    const engine = engineRef.current
    if (!engine) return

    setIsLoading(true)
    setError(null)

    try {
      // Dispose existing model with same ID if present
      const existing = engine.fragments.models.list.get(modelId)
      if (existing) await engine.fragments.disposeModel(modelId)

      const model = await engine.fragments.load(fragBytes, { modelId })
      model.useCamera(engine.world.camera.three)
      engine.world.scene.three.add(model.object)
      await engine.fragments.update(true)

      // Fit camera to model bounds
      try {
        const box = new Box3().setFromObject(model.object)
        if (!box.isEmpty()) {
          await engine.world.camera.controls.fitToBox(box, true)
        }
      } catch {
        // camera fit is optional, don't fail on this
      }
    } catch (err: any) {
      setError(err?.message ?? 'Failed to load model')
    } finally {
      setIsLoading(false)
    }
  }, [])

  return { loadModel, isLoading, error }
}
