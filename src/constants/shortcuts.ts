export interface ShortcutInfo {
  keys: string[]
  label: string
}

export interface ShortcutGroup {
  title: string
  items: ShortcutInfo[]
}

/** Shown in the shortcuts dialog. The handlers live in useKeyboardShortcuts. */
export const SHORTCUT_GROUPS: ShortcutGroup[] = [
  {
    title: 'Mouse',
    items: [
      { keys: ['Click'], label: 'Select an element' },
      { keys: ['Shift', 'Click'], label: 'Add to or remove from the selection' },
      { keys: ['Double-click'], label: 'Zoom to an element' },
      { keys: ['Right-click'], label: 'Open the actions menu' },
      { keys: ['Drag'], label: 'Orbit' },
      { keys: ['Right-drag'], label: 'Pan' },
      { keys: ['Scroll'], label: 'Zoom towards the cursor' },
    ],
  },
  {
    title: 'Selection',
    items: [
      { keys: ['F'], label: 'Zoom to the selection, or fit everything' },
      { keys: ['I'], label: 'Isolate the selection' },
      { keys: ['H'], label: 'Hide the selection' },
      { keys: ['Shift', 'H'], label: 'Show everything again' },
      { keys: ['Esc'], label: 'Clear the selection' },
    ],
  },
  {
    title: 'View',
    items: [
      { keys: ['0'], label: 'Isometric view' },
      { keys: ['1'], label: 'Top view' },
      { keys: ['2'], label: 'Front view' },
      { keys: ['3'], label: 'Right view' },
      { keys: ['4'], label: 'Back view' },
      { keys: ['5'], label: 'Left view' },
      { keys: ['O'], label: 'Switch perspective / orthographic' },
      { keys: ['G'], label: 'Toggle the grid' },
      { keys: ['X'], label: 'Toggle the section plane' },
    ],
  },
  {
    title: 'App',
    items: [
      { keys: ['U'], label: 'Add models' },
      { keys: ['B'], label: 'Show or hide the sidebar' },
      { keys: ['/'], label: 'Search the model structure' },
      { keys: ['T'], label: 'Switch light / dark theme' },
      { keys: ['?'], label: 'Show this list' },
    ],
  },
]
