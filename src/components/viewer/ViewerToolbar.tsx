import { useEffect, useRef, useState } from 'react'
import { Icon, type IconName } from '@/components/ui/Icon'
import type { ViewPreset } from '@/types'
import {
  fitSelectionOrAll,
  hideSelection,
  isolateSelection,
  setGridVisible,
  setView,
  showAll,
  toggleProjection,
  updateSection,
} from '@/lib/viewerActions'
import { hiddenCount, useViewerStore } from '@/store/useViewerStore'

const VIEWS: { preset: ViewPreset; label: string; key: string }[] = [
  { preset: 'iso', label: 'Isometric', key: '0' },
  { preset: 'top', label: 'Top', key: '1' },
  { preset: 'front', label: 'Front', key: '2' },
  { preset: 'right', label: 'Right', key: '3' },
  { preset: 'back', label: 'Back', key: '4' },
  { preset: 'left', label: 'Left', key: '5' },
]

interface ToolButtonProps {
  icon: IconName
  label: string
  shortcut?: string
  active?: boolean
  disabled?: boolean
  badge?: number
  onClick: () => void
}

function ToolButton({ icon, label, shortcut, active, disabled, badge, onClick }: ToolButtonProps) {
  return (
    <button
      className={`toolbar-btn ${active ? 'active' : ''}`}
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      aria-pressed={active}
      data-tip={shortcut ? `${label} (${shortcut})` : label}
      data-tip-pos="top"
    >
      <Icon name={icon} size={17} />
      {badge ? <span className="toolbar-badge">{badge > 999 ? '999+' : badge}</span> : null}
    </button>
  )
}

function ViewMenu() {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('pointerdown', onDown)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('pointerdown', onDown)
      window.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div className="toolbar-menu-anchor" ref={ref}>
      <button
        className={`toolbar-btn ${open ? 'active' : ''}`}
        onClick={() => setOpen(!open)}
        aria-label="Standard views"
        aria-haspopup="menu"
        aria-expanded={open}
        data-tip={open ? undefined : 'Standard views'}
        data-tip-pos="top"
      >
        <Icon name="cube" size={17} />
      </button>
      {open && (
        <div className="menu toolbar-menu" role="menu">
          {VIEWS.map(view => (
            <button
              key={view.preset}
              className="menu-item"
              role="menuitem"
              onClick={() => { void setView(view.preset); setOpen(false) }}
            >
              <span>{view.label}</span>
              <kbd className="kbd">{view.key}</kbd>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export function ViewerToolbar() {
  const selectionSize = useViewerStore(s => s.selection.length)
  const hiddenTotal = useViewerStore(s => hiddenCount(s.hidden))
  const gridVisible = useViewerStore(s => s.gridVisible)
  const statsVisible = useViewerStore(s => s.statsVisible)
  const projection = useViewerStore(s => s.projection)
  const sectionActive = useViewerStore(s => s.section.active)
  const set = useViewerStore(s => s.set)

  const hasSelection = selectionSize > 0
  const ortho = projection === 'Orthographic'

  return (
    <div className="viewer-toolbar" role="toolbar" aria-label="Viewer tools">
      <div className="toolbar-group">
        <ToolButton
          icon="fit"
          label={hasSelection ? 'Zoom to selection' : 'Fit to view'}
          shortcut="F"
          onClick={() => void fitSelectionOrAll()}
        />
        <ViewMenu />
        <ToolButton
          icon={ortho ? 'orthographic' : 'perspective'}
          label={ortho ? 'Orthographic: switch to perspective' : 'Perspective: switch to orthographic'}
          shortcut="O"
          active={ortho}
          onClick={() => void toggleProjection()}
        />
      </div>

      <div className="toolbar-group">
        <ToolButton
          icon="isolate"
          label="Isolate selection"
          shortcut="I"
          disabled={!hasSelection}
          onClick={isolateSelection}
        />
        <ToolButton
          icon="eyeOff"
          label="Hide selection"
          shortcut="H"
          disabled={!hasSelection}
          onClick={hideSelection}
        />
        <ToolButton
          icon="eye"
          label="Show everything"
          shortcut="Shift+H"
          disabled={hiddenTotal === 0}
          badge={hiddenTotal}
          onClick={showAll}
        />
      </div>

      <div className="toolbar-group">
        <ToolButton
          icon="section"
          label="Section plane"
          shortcut="X"
          active={sectionActive}
          onClick={() => updateSection({ active: !sectionActive })}
        />
        <ToolButton
          icon="grid"
          label="Grid"
          shortcut="G"
          active={gridVisible}
          onClick={() => setGridVisible(!gridVisible)}
        />
        <ToolButton
          icon="stats"
          label="Performance stats"
          active={statsVisible}
          onClick={() => set({ statsVisible: !statsVisible })}
        />
      </div>
    </div>
  )
}
