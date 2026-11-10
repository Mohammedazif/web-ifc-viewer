import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Icon, type IconName } from '@/components/ui/Icon'
import {
  clearSelection,
  fitAll,
  focusItems,
  hideSelection,
  isolateSelection,
  showAll,
} from '@/lib/viewerActions'
import { hiddenCount, useViewerStore } from '@/store/useViewerStore'

interface Entry {
  icon: IconName
  label: string
  shortcut?: string
  disabled?: boolean
  run: () => void
}

/** Right-click menu for the 3D view. */
export function ContextMenu() {
  const menu = useViewerStore(s => s.contextMenu)
  const selection = useViewerStore(s => s.selection)
  const hiddenTotal = useViewerStore(s => hiddenCount(s.hidden))
  const set = useViewerStore(s => s.set)
  const ref = useRef<HTMLDivElement>(null)
  const [position, setPosition] = useState<{ left: number; top: number } | null>(null)

  // Keep the menu inside the window.
  useLayoutEffect(() => {
    if (!menu || !ref.current) {
      setPosition(null)
      return
    }
    const { offsetWidth: w, offsetHeight: h } = ref.current
    setPosition({
      left: Math.max(8, Math.min(menu.x, window.innerWidth - w - 8)),
      top: Math.max(8, Math.min(menu.y, window.innerHeight - h - 8)),
    })
    ref.current.querySelector<HTMLButtonElement>('button:not(:disabled)')?.focus()
  }, [menu])

  useEffect(() => {
    if (!menu) return
    const close = () => set({ contextMenu: null })
    const onDown = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) close()
    }
    window.addEventListener('pointerdown', onDown, true)
    window.addEventListener('resize', close)
    window.addEventListener('blur', close)
    window.addEventListener('wheel', close, { passive: true })
    return () => {
      window.removeEventListener('pointerdown', onDown, true)
      window.removeEventListener('resize', close)
      window.removeEventListener('blur', close)
      window.removeEventListener('wheel', close)
    }
  }, [menu, set])

  if (!menu) return null

  const count = selection.length
  const what = count > 1 ? `${count} elements` : 'element'
  const groups: Entry[][] = []

  if (menu.onItem && count > 0) {
    groups.push([
      { icon: 'target', label: `Zoom to ${what}`, shortcut: 'F', run: () => void focusItems(selection) },
      { icon: 'isolate', label: `Isolate ${what}`, shortcut: 'I', run: isolateSelection },
      { icon: 'eyeOff', label: `Hide ${what}`, shortcut: 'H', run: hideSelection },
    ])
  }
  groups.push([
    { icon: 'eye', label: 'Show everything', shortcut: '⇧H', disabled: hiddenTotal === 0, run: showAll },
    { icon: 'fit', label: 'Fit model to view', run: () => void fitAll() },
    { icon: 'close', label: 'Clear selection', shortcut: 'Esc', disabled: count === 0, run: clearSelection },
  ])

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return
    e.preventDefault()
    const buttons = [...(ref.current?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)') ?? [])]
    const index = buttons.indexOf(document.activeElement as HTMLButtonElement)
    const next = e.key === 'ArrowDown' ? index + 1 : index - 1
    buttons[(next + buttons.length) % buttons.length]?.focus()
  }

  return (
    <div
      ref={ref}
      className="menu context-menu"
      role="menu"
      style={{
        left: position?.left ?? menu.x,
        top: position?.top ?? menu.y,
        visibility: position ? 'visible' : 'hidden',
      }}
      onKeyDown={onKeyDown}
      onContextMenu={e => e.preventDefault()}
    >
      {groups.map((entries, i) => (
        <div className="menu-group" key={i}>
          {entries.map(entry => (
            <button
              key={entry.label}
              className="menu-item"
              role="menuitem"
              disabled={entry.disabled}
              onClick={() => { entry.run(); set({ contextMenu: null }) }}
            >
              <Icon name={entry.icon} size={14} />
              <span>{entry.label}</span>
              {entry.shortcut && <kbd className="kbd">{entry.shortcut}</kbd>}
            </button>
          ))}
        </div>
      ))}
    </div>
  )
}
