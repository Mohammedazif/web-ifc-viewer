import { useEffect, useRef } from 'react'
import { Icon } from '@/components/ui/Icon'
import { SHORTCUT_GROUPS } from '@/constants/shortcuts'
import { useViewerStore } from '@/store/useViewerStore'

export function ShortcutsDialog() {
  const open = useViewerStore(s => s.helpOpen)
  const set = useViewerStore(s => s.set)
  const closeRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return
    const previous = document.activeElement as HTMLElement | null
    closeRef.current?.focus()
    return () => previous?.focus?.()
  }, [open])

  if (!open) return null
  const close = () => set({ helpOpen: false })

  return (
    <div className="dialog-backdrop" onPointerDown={e => { if (e.target === e.currentTarget) close() }}>
      <div className="dialog" role="dialog" aria-modal="true" aria-labelledby="shortcuts-title">
        <header className="dialog-header">
          <h2 id="shortcuts-title" className="dialog-title">Mouse &amp; keyboard</h2>
          <button ref={closeRef} className="icon-btn" onClick={close} aria-label="Close">
            <Icon name="close" />
          </button>
        </header>
        <div className="dialog-body shortcuts-grid">
          {SHORTCUT_GROUPS.map(group => (
            <section key={group.title}>
              <h3 className="shortcuts-group-title">{group.title}</h3>
              <ul className="shortcuts-list">
                {group.items.map(item => (
                  <li key={item.label}>
                    <span>{item.label}</span>
                    <span className="shortcuts-keys">
                      {item.keys.map(key => <kbd className="kbd" key={key}>{key}</kbd>)}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </div>
    </div>
  )
}
