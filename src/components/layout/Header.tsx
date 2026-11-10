import { Icon } from '@/components/ui/Icon'
import { openFilePicker } from '@/lib/filePicker'
import { useModelStore } from '@/store/useModelStore'
import { useImportStore } from '@/store/useImportStore'
import { useViewerStore } from '@/store/useViewerStore'

export function Header() {
  const hasModels = useModelStore(s => s.models.length > 0)
  const hasJobs = useImportStore(s => s.jobs.length > 0)
  const hasContent = hasModels || hasJobs
  const sidebarOpen = useViewerStore(s => s.sidebarOpen)
  const setSidebarOpen = useViewerStore(s => s.setSidebarOpen)
  const theme = useViewerStore(s => s.theme)
  const setTheme = useViewerStore(s => s.setTheme)
  const set = useViewerStore(s => s.set)

  return (
    <header className="header">
      <div className="header-brand">
        {hasContent && (
          <button
            className={`icon-btn ${sidebarOpen ? 'active' : ''}`}
            onClick={() => setSidebarOpen(!sidebarOpen)}
            aria-label={sidebarOpen ? 'Hide sidebar' : 'Show sidebar'}
            aria-pressed={sidebarOpen}
            data-tip={sidebarOpen ? 'Hide sidebar (B)' : 'Show sidebar (B)'}
            data-tip-pos="bottom-start"
          >
            <Icon name="sidebar" />
          </button>
        )}
        <div>
          <h1 className="header-title">Converie</h1>
          <p className="header-subtitle">From one format to another</p>
        </div>
      </div>

      <div className="header-actions">
        {hasContent && (
          <button className="btn btn-primary" onClick={openFilePicker}>
            <Icon name="plus" size={14} />
            Add model
          </button>
        )}
        <button
          className="icon-btn"
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
          data-tip={theme === 'dark' ? 'Light theme (T)' : 'Dark theme (T)'}
          data-tip-pos="bottom-end"
        >
          <Icon name={theme === 'dark' ? 'sun' : 'moon'} />
        </button>
        <button
          className="icon-btn"
          onClick={() => set({ helpOpen: true })}
          aria-label="Keyboard shortcuts"
          data-tip="Shortcuts (?)"
          data-tip-pos="bottom-end"
        >
          <Icon name="help" />
        </button>
      </div>
    </header>
  )
}
