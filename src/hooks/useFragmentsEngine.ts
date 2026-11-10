import { useEffect } from 'react'
import { getEngine, initFragmentsEngine, setEngine } from '@/lib/fragmentsEngine'
import { resetEngineState } from '@/lib/viewerActions'
import { useViewerStore } from '@/store/useViewerStore'

/** Starts the 3D engine inside the given container and tears it down on unmount. */
export function useFragmentsEngine(containerRef: React.RefObject<HTMLDivElement | null>) {
  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    let cancelled = false
    const { set } = useViewerStore.getState()

    initFragmentsEngine(container)
      .then(async engine => {
        if (cancelled) {
          await engine.dispose()
          return
        }
        setEngine(engine)
        set({ engineReady: true, engineError: null })
      })
      .catch(err => {
        if (!cancelled) set({ engineError: err?.message ?? 'Failed to initialize 3D engine' })
      })

    return () => {
      cancelled = true
      const engine = getEngine()
      if (engine) {
        setEngine(null)
        resetEngineState()
        set({ engineReady: false })
        void engine.dispose()
      }
    }
  }, [containerRef])
}
