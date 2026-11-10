import { useEffect } from 'react'
import type { ViewPreset } from '@/types'
import { openFilePicker } from '@/lib/filePicker'
import {
  clearSelection,
  fitSelectionOrAll,
  hideSelection,
  isolateSelection,
  setGridVisible,
  setView,
  showAll,
  toggleProjection,
  updateSection,
} from '@/lib/viewerActions'
import { useModelStore } from '@/store/useModelStore'
import { useViewerStore } from '@/store/useViewerStore'

const VIEW_KEYS: Record<string, ViewPreset> = {
  '0': 'iso',
  '1': 'top',
  '2': 'front',
  '3': 'right',
  '4': 'back',
  '5': 'left',
}

const TEXT_INPUTS = new Set(['text', 'search', 'email', 'number', 'password', 'tel', 'url'])

/** True while the user is typing somewhere; sliders and buttons don't count. */
const isTyping = (target: EventTarget | null) => {
  const el = target as HTMLElement | null
  if (!el) return false
  if (el.tagName === 'INPUT') return TEXT_INPUTS.has((el as HTMLInputElement).type)
  return el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable
}

export function useKeyboardShortcuts() {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const state = useViewerStore.getState()

      if (e.key === 'Escape') {
        if (state.contextMenu) state.set({ contextMenu: null })
        else if (state.helpOpen) state.set({ helpOpen: false })
        else if (isTyping(e.target)) (e.target as HTMLElement).blur()
        else clearSelection()
        return
      }

      if (isTyping(e.target) || e.ctrlKey || e.metaKey || e.altKey) return

      const hasModels = useModelStore.getState().models.length > 0
      const key = e.key.length === 1 ? e.key.toLowerCase() : e.key

      // Shortcuts that work with or without a model.
      switch (key) {
        case '?':
          state.set({ helpOpen: !state.helpOpen })
          return
        case 'u':
          openFilePicker()
          return
        case 't':
          state.setTheme(state.theme === 'dark' ? 'light' : 'dark')
          return
        case 'b':
          state.setSidebarOpen(!state.sidebarOpen)
          return
      }

      if (!hasModels || state.helpOpen) return

      if (VIEW_KEYS[key]) {
        void setView(VIEW_KEYS[key])
        return
      }

      switch (key) {
        case 'f':
          void fitSelectionOrAll()
          break
        case 'i':
          isolateSelection()
          break
        case 'h':
          if (e.shiftKey) showAll()
          else hideSelection()
          break
        case 'o':
          void toggleProjection()
          break
        case 'g':
          setGridVisible(!state.gridVisible)
          break
        case 'x':
          updateSection({ active: !state.section.active })
          break
        case '/':
          e.preventDefault()
          if (!state.sidebarOpen) state.setSidebarOpen(true)
          // The sidebar may have just been opened; focus once it is on screen.
          requestAnimationFrame(() => document.getElementById('tree-search')?.focus())
          break
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])
}
