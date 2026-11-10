import { useEffect, useRef, useState } from 'react'
import { Icon } from '@/components/ui/Icon'
import { ModelList } from '@/components/model/ModelList'
import { ModelTree } from '@/components/model/ModelTree'
import { SIDEBAR_WIDTH_PX } from '@/constants/config'
import { downloadAllAsZip } from '@/lib/downloadUtils'
import { openFilePicker } from '@/lib/filePicker'
import { clearAllModels } from '@/lib/viewerActions'
import { useModelStore } from '@/store/useModelStore'
import { useViewerStore } from '@/store/useViewerStore'

/** Asks for a second click before doing something that can't be undone. */
function ConfirmButton({ onConfirm, children }: { onConfirm: () => void; children: React.ReactNode }) {
  const [armed, setArmed] = useState(false)

  useEffect(() => {
    if (!armed) return
    const timer = window.setTimeout(() => setArmed(false), 3000)
    return () => window.clearTimeout(timer)
  }, [armed])

  return (
    <button
      className={`btn btn-ghost ${armed ? 'btn-danger' : ''}`}
      onClick={() => {
        if (armed) onConfirm()
        setArmed(!armed)
      }}
      onBlur={() => setArmed(false)}
    >
      {armed ? 'Click again to remove all' : children}
    </button>
  )
}

/** Stays mounted while hidden so the tree keeps its scroll position and open rows. */
export function Sidebar({ hidden }: { hidden: boolean }) {
  const models = useModelStore(s => s.models)
  const allLoaded = useModelStore(s => s.models.every(m => s.modelsLoadedInEngine[m.modelId]))
  const width = useViewerStore(s => s.sidebarWidth)
  const setWidth = useViewerStore(s => s.setSidebarWidth)
  const [resizing, setResizing] = useState(false)
  const [zipping, setZipping] = useState(false)
  const asideRef = useRef<HTMLElement>(null)

  const onResizeStart = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault()
    const handle = e.currentTarget
    handle.setPointerCapture(e.pointerId)
    setResizing(true)
    const left = asideRef.current?.getBoundingClientRect().left ?? 0

    const onMove = (ev: PointerEvent) => setWidth(ev.clientX - left)
    const onUp = () => {
      setResizing(false)
      handle.removeEventListener('pointermove', onMove)
      handle.removeEventListener('pointerup', onUp)
      handle.removeEventListener('pointercancel', onUp)
    }
    handle.addEventListener('pointermove', onMove)
    handle.addEventListener('pointerup', onUp)
    handle.addEventListener('pointercancel', onUp)
  }

  const onResizeKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft') setWidth(width - 16)
    else if (e.key === 'ArrowRight') setWidth(width + 16)
    else return
    e.preventDefault()
  }

  const downloadAll = async () => {
    setZipping(true)
    await downloadAllAsZip(models)
    setZipping(false)
  }

  return (
    <aside ref={asideRef} className={`sidebar ${resizing ? 'is-resizing' : ''}`} style={{ width }} hidden={hidden}>
      <section className="models-panel">
        <div className="panel-heading">
          <h2 className="panel-title">Models</h2>
          <span className="panel-count">{models.length}</span>
          <button
            className="icon-btn icon-btn-sm panel-heading-action"
            onClick={openFilePicker}
            aria-label="Add models"
            data-tip="Add models (U)"
            data-tip-pos="bottom-end"
          >
            <Icon name="plus" size={15} />
          </button>
        </div>
        <ModelList />
      </section>

      {models.length > 0 && <ModelTree />}

      {models.length > 0 && (
        <footer className="sidebar-footer">
          <button className="btn btn-secondary" onClick={downloadAll} disabled={zipping || !allLoaded}>
            {zipping ? <span className="spinner spinner-sm" /> : <Icon name="download" size={14} />}
            {zipping ? 'Preparing…' : models.length > 1 ? 'Download all (.zip)' : 'Download .zip'}
          </button>
          <ConfirmButton onConfirm={clearAllModels}>Remove all</ConfirmButton>
        </footer>
      )}

      <div
        className="sidebar-resizer"
        role="separator"
        aria-orientation="vertical"
        aria-label="Resize sidebar"
        aria-valuenow={width}
        tabIndex={0}
        onPointerDown={onResizeStart}
        onDoubleClick={() => setWidth(SIDEBAR_WIDTH_PX)}
        onKeyDown={onResizeKey}
      />
    </aside>
  )
}
