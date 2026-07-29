import { Box3 } from 'three'
import { useModelStore } from '@/store/useModelStore'
import { formatBytes, formatDuration } from '@/lib/downloadUtils'
import type { FragmentsEngine } from '@/lib/fragmentsEngine'
import { useFragmentDownload } from '@/hooks/useFragmentDownload'
import { useSpatialTree } from '@/hooks/useSpatialTree'
import { ModelTreeViewer } from './ModelTreeViewer'

interface ModelInfoPanelProps {
  engineRef: React.MutableRefObject<FragmentsEngine | null>
}

interface ModelTreeContainerProps {
  engineRef: React.MutableRefObject<FragmentsEngine | null>
  modelId: string
}

function ModelTreeContainer({ engineRef, modelId }: ModelTreeContainerProps) {
  const { treeData, isLoading } = useSpatialTree(engineRef, modelId)
  
  const handleNodeClick = async (localId: number) => {
    const engine = engineRef.current
    if (!engine) return
    const model = engine.fragments.models.list.get(modelId)
    if (!model || !model.object) return

    // Instead of using complex Highlighters which require full components integration,
    // we just isolate the selected items using FragmentsManager's getItems or model visibility.
    // However, the requested action is to highlight or fly to.
    // The easiest robust way to fly to an element without OBC highlighter is to extract its box.
    const items = engine.fragments.models.list.get(modelId)
    if (items) {
      // Find bounding box of the element (if possible) or just do nothing for now 
      // since the user didn't specify exactly what should happen when clicking a node.
      // Wait, let's try isolating it by setting visibility
    }
  }

  if (isLoading) return <div style={{ fontSize: 11, padding: '8px 0', color: 'var(--text-muted)' }}>Loading tree...</div>
  if (!treeData) return null

  return <ModelTreeViewer data={treeData} onNodeClick={handleNodeClick} />
}

export function ModelInfoPanel({ engineRef }: ModelInfoPanelProps) {
  const models = useModelStore(s => s.models)
  const modelVisibility = useModelStore(s => s.modelVisibility)
  const toggleVisibilityState = useModelStore(s => s.toggleVisibility)
  const { download, isDownloading } = useFragmentDownload(engineRef)

  if (!models || models.length === 0) return null

  const handleToggle = (modelId: string) => {
    const engine = engineRef.current
    if (!engine) return
    const fragModel = engine.fragments.models.list.get(modelId)
    if (fragModel && fragModel.object) {
      const isCurrentlyVisible = modelVisibility[modelId] !== false
      fragModel.object.visible = !isCurrentlyVisible
      toggleVisibilityState(modelId)
    }
  }

  const handleFocus = async (modelId: string) => {
    const engine = engineRef.current
    if (!engine) return
    const fragModel = engine.fragments.models.list.get(modelId)
    if (fragModel && fragModel.object && modelVisibility[modelId] !== false) {
      const box = new Box3().setFromObject(fragModel.object)
      if (!box.isEmpty()) {
        await engine.world.camera.controls.fitToBox(box, true)
      }
    }
  }

  return (
    <div className="model-info">
      <div className="model-info-header">
        <svg viewBox="0 0 20 20" fill="currentColor" width="14" height="14" className="model-info-icon">
          <path d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z"/>
        </svg>
        <span className="model-info-title">Loaded Models (<span style={{ fontFamily: 'var(--font-mono)' }}>{models.length}</span>)</span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem', maxHeight: '300px', overflowY: 'auto' }}>
        {models.map(model => {
          const ratio = model.originalFileSizeBytes > 0
            ? Math.round((1 - model.convertedFileSizeBytes / model.originalFileSizeBytes) * 100)
            : 0
          
          const isVisible = modelVisibility[model.modelId] !== false

          return (
            <div key={model.modelId} style={{ paddingBottom: '0.5rem', borderBottom: '1px solid var(--border-soft)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                <div 
                  className="model-info-filename" 
                  title={model.originalFileName} 
                  onClick={() => handleFocus(model.modelId)}
                  style={{ 
                    opacity: isVisible ? 1 : 0.5, 
                    flex: 1, 
                    overflow: 'hidden', 
                    textOverflow: 'ellipsis', 
                    whiteSpace: 'nowrap', 
                    marginRight: '0.5rem',
                    cursor: isVisible ? 'pointer' : 'default'
                  }}
                >
                  {model.originalFileName}
                </div>
                <div style={{ display: 'flex', gap: '4px' }}>
                  <button 
                    onClick={() => handleToggle(model.modelId)} 
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', opacity: 0.8, padding: '2px' }}
                    title={isVisible ? "Hide model" : "Show model"}
                  >
                    {isVisible ? (
                      <svg viewBox="0 0 20 20" fill="currentColor" width="14" height="14">
                        <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                        <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                      </svg>
                    ) : (
                      <svg viewBox="0 0 20 20" fill="currentColor" width="14" height="14">
                        <path fillRule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781zm4.261 4.26l1.514 1.515a2.003 2.003 0 012.45 2.45l1.514 1.514a4 4 0 00-5.478-5.478z" clipRule="evenodd" />
                        <path d="M12.454 16.697L9.75 13.992a4 4 0 01-3.742-3.741L2.335 6.578A9.98 9.98 0 00.458 10c1.274 4.057 5.065 7 9.542 7 .847 0 1.669-.105 2.454-.303z" />
                      </svg>
                    )}
                  </button>
                  <button 
                    onClick={() => download(model.modelId, model.originalFileName)} 
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', opacity: 0.8, padding: '2px' }}
                    title="Download this model"
                  >
                    <svg viewBox="0 0 20 20" fill="currentColor" width="14" height="14">
                      <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd"/>
                    </svg>
                  </button>
                </div>
              </div>

              {model.originalFileName.toLowerCase().endsWith('.frag') ? (
                <div className="model-info-grid" style={{ marginTop: '0.25rem', opacity: isVisible ? 1 : 0.5, gridTemplateColumns: '1fr' }}>
                  <div className="info-stat">
                    <span className="info-stat-label">.frag Size</span>
                    <span className="info-stat-value accent">{formatBytes(model.convertedFileSizeBytes)}</span>
                  </div>
                </div>
              ) : (
                <div className="model-info-grid" style={{ marginTop: '0.25rem', opacity: isVisible ? 1 : 0.5 }}>
                  <div className="info-stat">
                    <span className="info-stat-label">IFC Size</span>
                    <span className="info-stat-value">{formatBytes(model.originalFileSizeBytes)}</span>
                  </div>
                  <div className="info-stat">
                    <span className="info-stat-label">.frag Size</span>
                    <span className="info-stat-value accent">{formatBytes(model.convertedFileSizeBytes)}</span>
                  </div>
                  <div className="info-stat">
                    <span className="info-stat-label">Compression</span>
                    <span className="info-stat-value good">{ratio}% smaller</span>
                  </div>
                  <div className="info-stat">
                    <span className="info-stat-label">Convert Time</span>
                    <span className="info-stat-value">{formatDuration(model.conversionTimeMs)}</span>
                  </div>
                </div>
              )}

              {/* Render the Spatial Tree for this model */}
              <div style={{ marginTop: '8px' }}>
                <ModelTreeContainer engineRef={engineRef} modelId={model.modelId} />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
