export interface LoadedModel {
  modelId: string
  originalFileName: string
  originalFileSizeBytes: number
  convertedFileSizeBytes: number
  conversionTimeMs: number
  fragBytes: ArrayBuffer
  source: 'ifc' | 'frag'
}

export type ImportStatus = 'queued' | 'reading' | 'converting' | 'error'

export interface ImportJob {
  id: string
  fileName: string
  sizeBytes: number
  status: ImportStatus
  progress: number
  label: string
  error?: string
}

/** Points at a single element of a loaded model. */
export interface ItemRef {
  modelId: string
  localId: number
}

export type ToastKind = 'info' | 'success' | 'error'

export interface Toast {
  id: number
  kind: ToastKind
  message: string
}

export type ViewPreset = 'iso' | 'top' | 'front' | 'back' | 'left' | 'right'

export type SectionAxis = 'x' | 'y' | 'z'

export interface SectionState {
  active: boolean
  axis: SectionAxis
  /** 0..1 along the model bounds on the chosen axis */
  position: number
  flipped: boolean
}

export type TreeNodeKind = 'model' | 'item' | 'group'

export interface TreeNode {
  key: string
  modelId: string
  kind: TreeNodeKind
  /** Element id. Null for model roots and category groups. */
  localId: number | null
  label: string
  /** Raw IFC category, e.g. IFCWALL */
  category: string | null
  children: TreeNode[]
  parent: TreeNode | null
  /** Every element with geometry in this subtree, including the node itself. */
  geomIds: number[]
}
