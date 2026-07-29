import { useEffect, useRef, useState } from 'react'
import { initFragmentsEngine, FragmentsEngine } from '@/lib/fragmentsEngine'

export function useFragmentsEngine(containerRef: React.RefObject<HTMLDivElement | null>) {
  const engineRef = useRef<FragmentsEngine | null>(null)
  const [isReady, setIsReady] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!containerRef.current) return
    let cancelled = false

    const init = async () => {
      try {
        const engine = await initFragmentsEngine(containerRef.current!)
        if (cancelled) {
          await engine.dispose()
          return
        }
        engineRef.current = engine
        setIsReady(true)
      } catch (err: any) {
        if (!cancelled) setError(err?.message ?? 'Failed to initialize 3D engine')
      }
    }

    init()

    return () => {
      cancelled = true
      if (engineRef.current) {
        engineRef.current.dispose()
        engineRef.current = null
        setIsReady(false)
      }
    }
  }, [])

  return { engineRef, isReady, error }
}
