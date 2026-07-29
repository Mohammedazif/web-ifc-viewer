import { useRef, useEffect, useState } from 'react'
import { useFragmentsEngine } from '@/hooks/useFragmentsEngine'
import { useModelLoader } from '@/hooks/useModelLoader'
import { useModelStore } from '@/store/useModelStore'
import { useAppStore } from '@/store/useAppStore'
import { ViewerToolbar } from './ViewerToolbar'
import type { FragmentsEngine } from '@/lib/fragmentsEngine'

interface ViewerCanvasProps {
  onEngineReady?: (engineRef: React.MutableRefObject<FragmentsEngine | null>) => void
}

export function ViewerCanvas({ onEngineReady }: ViewerCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const statsRef = useRef<any>(null)
  const statsContainerRef = useRef<HTMLDivElement>(null)
  const [statsVisible, setStatsVisible] = useState(false)

  const { engineRef, isReady, error } = useFragmentsEngine(containerRef)
  const { loadModel, isLoading } = useModelLoader(engineRef)
  const models = useModelStore(s => s.models)
  const step = useAppStore(s => s.step)

  // Notify parent of engine ref once ready
  useEffect(() => {
    if (isReady && onEngineReady) onEngineReady(engineRef)
  }, [isReady])

  // Load models that haven't been loaded yet
  const loadedIdsRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    if (!isReady) return
    const currentModels = useModelStore.getState().models
    if (currentModels.length === 0) {
      loadedIdsRef.current.clear()
    }
    currentModels.forEach(model => {
      if (model.fragBytes && !loadedIdsRef.current.has(model.modelId)) {
        loadedIdsRef.current.add(model.modelId)
        loadModel(model.fragBytes, model.modelId)
      }
    })
  }, [models, isReady])

  // Stats.js setup
  useEffect(() => {
    if (!isReady || !statsContainerRef.current) return
    let Stats: any
    import('stats.js').then((mod) => {
      Stats = mod.default
      const stats = new Stats()
      stats.showPanel(0)
      stats.dom.style.position = 'absolute'
      stats.dom.style.top = '0'
      stats.dom.style.left = '0'
      // Set initial visibility
      setStatsVisible(prev => {
        stats.dom.style.display = prev ? 'block' : 'none'
        return prev
      })
      statsContainerRef.current?.appendChild(stats.dom)
      statsRef.current = stats

      const engine = engineRef.current
      if (engine) {
        engine.world.renderer.onBeforeUpdate.add(() => stats.begin())
        engine.world.renderer.onAfterUpdate.add(() => stats.end())
      }
    })

    return () => {
      if (statsRef.current?.dom?.parentNode) {
        statsRef.current.dom.parentNode.removeChild(statsRef.current.dom)
      }
    }
  }, [isReady])

  // Toggle stats visibility
  useEffect(() => {
    if (statsRef.current?.dom) {
      statsRef.current.dom.style.display = statsVisible ? 'block' : 'none'
    }
  }, [statsVisible])

  return (
    <div className="viewer-canvas-wrapper">
      {/* Three.js mount */}
      <div ref={containerRef} className="viewer-canvas-container" />

      {/* Stats overlay */}
      <div ref={statsContainerRef} className="stats-overlay" />

      {/* Toolbar */}
      {step === 'viewing' && (
        <ViewerToolbar
          engineRef={engineRef}
          onToggleStats={() => setStatsVisible(v => !v)}
          statsVisible={statsVisible}
        />
      )}

      {/* Loading overlay */}
      {isLoading && (
        <div className="viewer-overlay">
          <div className="viewer-overlay-inner">
            <div className="viewer-spinner" />
            <p>Loading model into scene...</p>
          </div>
        </div>
      )}

      {/* Error overlay */}
      {error && (
        <div className="viewer-overlay">
          <div className="viewer-overlay-inner error">
            <svg viewBox="0 0 24 24" fill="currentColor" width="32" height="32">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
            </svg>
            <p>3D engine error</p>
            <p className="error-detail">{error}</p>
          </div>
        </div>
      )}

      {/* Empty state hint */}
      {step !== 'viewing' && !error && isReady && (
        <div className="viewer-empty">
          <div className="viewer-empty-inner">
            <svg viewBox="0 0 64 64" fill="none" width="64" height="64" opacity="0.15">
              <rect x="8" y="20" width="20" height="28" rx="2" stroke="currentColor" strokeWidth="2"/>
              <rect x="32" y="12" width="20" height="36" rx="2" stroke="currentColor" strokeWidth="2"/>
              <path d="M8 44h44" stroke="currentColor" strokeWidth="2"/>
            </svg>
            <p>Upload an IFC file to begin</p>
          </div>
        </div>
      )}
    </div>
  )
}
