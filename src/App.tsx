import { useEffect } from 'react'
import { Header } from '@/components/layout/Header'
import { Sidebar } from '@/components/layout/Sidebar'
import { DropOverlay } from '@/components/ui/DropOverlay'
import { ShortcutsDialog } from '@/components/ui/ShortcutsDialog'
import { Toasts } from '@/components/ui/Toasts'
import { ViewerCanvas } from '@/components/viewer/ViewerCanvas'
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts'
import { useImportStore } from '@/store/useImportStore'
import { useModelStore } from '@/store/useModelStore'
import { useViewerStore } from '@/store/useViewerStore'

export default function App() {
  const hasModels = useModelStore(s => s.models.length > 0)
  const hasJobs = useImportStore(s => s.jobs.length > 0)
  const sidebarOpen = useViewerStore(s => s.sidebarOpen)
  const theme = useViewerStore(s => s.theme)

  useKeyboardShortcuts()

  useEffect(() => {
    document.documentElement.dataset.theme = theme
  }, [theme])

  // The sidebar only has something to show once a file has been added.
  const hasContent = hasModels || hasJobs

  return (
    <div className="app-layout">
      <Header />
      <div className="app-body">
        {hasContent && <Sidebar hidden={!sidebarOpen} />}
        <main className="app-main">
          <ViewerCanvas />
        </main>
      </div>
      <DropOverlay />
      <ShortcutsDialog />
      <Toasts />
    </div>
  )
}
