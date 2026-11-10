import { useEffect, useRef } from 'react'
import { JobCard } from '@/components/model/ModelList'
import { formatCategory } from '@/lib/categories'
import { getEngine } from '@/lib/fragmentsEngine'
import { syncModelsToScene } from '@/lib/viewerActions'
import { useFragmentsEngine } from '@/hooks/useFragmentsEngine'
import { useViewerInteractions } from '@/hooks/useViewerInteractions'
import { useImportStore } from '@/store/useImportStore'
import { useModelStore } from '@/store/useModelStore'
import { useViewerStore } from '@/store/useViewerStore'
import { ContextMenu } from './ContextMenu'
import { PropertiesPanel } from './PropertiesPanel'
import { SectionControl } from './SectionControl'
import { ViewerToolbar } from './ViewerToolbar'
import { WelcomeScreen } from './WelcomeScreen'

/** Frame-rate panel, only created the first time it is switched on. */
function useStatsPanel(hostRef: React.RefObject<HTMLDivElement | null>) {
  const visible = useViewerStore(s => s.statsVisible)
  const ready = useViewerStore(s => s.engineReady)

  useEffect(() => {
    const engine = getEngine()
    const host = hostRef.current
    if (!visible || !ready || !engine || !host) return
    let cancelled = false
    let cleanup = () => {}

    import('stats.js').then(mod => {
      if (cancelled) return
      const stats = new mod.default()
      stats.showPanel(0)
      stats.dom.style.position = 'static'
      host.appendChild(stats.dom)
      const begin = () => stats.begin()
      const end = () => stats.end()
      engine.world.renderer.onBeforeUpdate.add(begin)
      engine.world.renderer.onAfterUpdate.add(end)
      cleanup = () => {
        engine.world.renderer.onBeforeUpdate.remove(begin)
        engine.world.renderer.onAfterUpdate.remove(end)
        stats.dom.remove()
      }
    })

    return () => {
      cancelled = true
      cleanup()
    }
  }, [visible, ready, hostRef])
}

function HoverTooltip({ tooltipRef }: { tooltipRef: React.RefObject<HTMLDivElement | null> }) {
  const hovered = useViewerStore(s => s.hovered)
  return (
    <div ref={tooltipRef} className={`hover-tooltip ${hovered ? 'is-visible' : ''}`} aria-hidden="true">
      {hovered && (
        <>
          <span className="hover-tooltip-name">{hovered.name ?? `#${hovered.localId}`}</span>
          <span className="hover-tooltip-type">{formatCategory(hovered.category)}</span>
        </>
      )}
    </div>
  )
}

export function ViewerCanvas() {
  const containerRef = useRef<HTMLDivElement>(null)
  const tooltipRef = useRef<HTMLDivElement>(null)
  const statsRef = useRef<HTMLDivElement>(null)

  const ready = useViewerStore(s => s.engineReady)
  const engineError = useViewerStore(s => s.engineError)
  const loadingCount = useViewerStore(s => s.loadingCount)
  const hovering = useViewerStore(s => s.hovered !== null)
  const models = useModelStore(s => s.models)
  const jobs = useImportStore(s => s.jobs)

  useFragmentsEngine(containerRef)
  useViewerInteractions(containerRef, tooltipRef, ready && models.length > 0)
  useStatsPanel(statsRef)

  // Hand newly added models to the engine as soon as both exist.
  useEffect(() => {
    if (ready) syncModelsToScene()
  }, [models, ready])

  const hasModels = models.length > 0
  const activeJob = jobs.find(j => j.status !== 'queued' && j.status !== 'error') ?? jobs[0]

  return (
    <div className="viewer-canvas-wrapper">
      {/* Three.js mount */}
      <div ref={containerRef} className={`viewer-canvas-container ${hovering ? 'is-hovering' : ''}`} />

      <div ref={statsRef} className="stats-overlay" />
      <HoverTooltip tooltipRef={tooltipRef} />

      {hasModels && (
        <>
          <PropertiesPanel />
          <SectionControl />
          <ViewerToolbar />
          <ContextMenu />
        </>
      )}

      {hasModels && loadingCount > 0 && (
        <div className="viewer-status" role="status">
          <span className="spinner spinner-sm" />
          Loading model into the scene…
        </div>
      )}

      {!hasModels && !engineError && jobs.length === 0 && <WelcomeScreen />}

      {!hasModels && !engineError && activeJob && (
        <div className="viewer-progress">
          <ul className="viewer-progress-card">
            <JobCard job={activeJob} />
          </ul>
          {jobs.length > 1 && <p className="viewer-progress-more">{jobs.length - 1} more in the queue</p>}
          {activeJob.status === 'converting' && (
            <p className="viewer-progress-note">Large models can take a few minutes. You can keep adding files.</p>
          )}
        </div>
      )}

      {engineError && (
        <div className="viewer-overlay">
          <div className="viewer-overlay-inner error">
            <p className="viewer-overlay-title">The 3D engine could not start</p>
            <p className="error-detail">{engineError}</p>
            <button className="btn btn-secondary" onClick={() => window.location.reload()}>Reload the page</button>
          </div>
        </div>
      )}
    </div>
  )
}
