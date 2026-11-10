import { create } from 'zustand'
import type { ItemRef, SectionState, Toast, ToastKind, TreeNode } from '@/types'
import { SIDEBAR_WIDTH_PX } from '@/constants/config'

export type Theme = 'light' | 'dark'
export type Projection = 'Perspective' | 'Orthographic'

export interface HoverInfo extends ItemRef {
  name: string | null
  category: string | null
}

export interface ContextMenuState {
  x: number
  y: number
  /** True when the menu was opened on top of an element. */
  onItem: boolean
}

const SIDEBAR_MIN = 260
const SIDEBAR_MAX = 560

function readPref<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(`ifc-viewer:${key}`)
    return raw === null ? fallback : (JSON.parse(raw) as T)
  } catch {
    return fallback
  }
}

function writePref(key: string, value: unknown) {
  try {
    localStorage.setItem(`ifc-viewer:${key}`, JSON.stringify(value))
  } catch {
    // Storage can be unavailable (private mode); the preference just won't persist.
  }
}

function initialTheme(): Theme {
  const saved = readPref<Theme | null>('theme', null)
  if (saved === 'light' || saved === 'dark') return saved
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

interface ViewerState {
  engineReady: boolean
  engineError: string | null
  /** Number of models currently being pushed into the scene. */
  loadingCount: number

  selection: ItemRef[]
  /** The element whose properties are shown; may be a container without geometry. */
  primary: ItemRef | null
  /** Bumped when the tree should scroll the primary item into view. */
  revealNonce: number
  hovered: HoverInfo | null
  /** Per-model set of hidden element ids. */
  hidden: Record<string, Set<number>>
  trees: Record<string, TreeNode>

  sidebarOpen: boolean
  sidebarWidth: number
  theme: Theme
  gridVisible: boolean
  statsVisible: boolean
  projection: Projection
  section: SectionState
  helpOpen: boolean
  contextMenu: ContextMenuState | null
  toasts: Toast[]

  set: (patch: Partial<ViewerState>) => void
  setSidebarOpen: (open: boolean) => void
  setSidebarWidth: (width: number) => void
  setTheme: (theme: Theme) => void
  pushToast: (message: string, kind?: ToastKind) => void
  dismissToast: (id: number) => void
}

let toastId = 0

export const useViewerStore = create<ViewerState>((set, get) => ({
  engineReady: false,
  engineError: null,
  loadingCount: 0,

  selection: [],
  primary: null,
  revealNonce: 0,
  hovered: null,
  hidden: {},
  trees: {},

  sidebarOpen: readPref('sidebarOpen', true),
  sidebarWidth: readPref('sidebarWidth', SIDEBAR_WIDTH_PX),
  theme: initialTheme(),
  gridVisible: true,
  statsVisible: false,
  projection: 'Perspective',
  section: { active: false, axis: 'y', position: 0.5, flipped: false },
  helpOpen: false,
  contextMenu: null,
  toasts: [],

  set: (patch) => set(patch),
  setSidebarOpen: (open) => {
    writePref('sidebarOpen', open)
    set({ sidebarOpen: open })
  },
  setSidebarWidth: (width) => {
    const clamped = Math.round(Math.min(SIDEBAR_MAX, Math.max(SIDEBAR_MIN, width)))
    writePref('sidebarWidth', clamped)
    set({ sidebarWidth: clamped })
  },
  setTheme: (theme) => {
    writePref('theme', theme)
    set({ theme })
  },
  pushToast: (message, kind = 'info') => {
    const id = ++toastId
    set((s) => ({ toasts: [...s.toasts.slice(-3), { id, kind, message }] }))
    window.setTimeout(() => get().dismissToast(id), kind === 'error' ? 7000 : 4000)
  },
  dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter(t => t.id !== id) })),
}))

export const toast = (message: string, kind: ToastKind = 'info') =>
  useViewerStore.getState().pushToast(message, kind)

export const refKey = (ref: ItemRef) => `${ref.modelId}:${ref.localId}`

export function hiddenCount(hidden: Record<string, Set<number>>) {
  let n = 0
  for (const set of Object.values(hidden)) n += set.size
  return n
}
