import { useEffect } from 'react'
import {
  clearSelection,
  focusItems,
  pick,
  setHover,
  setSelection,
  toggleInSelection,
} from '@/lib/viewerActions'
import { refKey, useViewerStore } from '@/store/useViewerStore'

/** How far the pointer may travel between press and release and still count as a click. */
const CLICK_SLOP_PX = 5

/**
 * Makes the 3D canvas respond to the pointer: hover highlight with a tooltip,
 * click to select (Shift/Ctrl adds), double-click to zoom, right-click for
 * the context menu. Dragging is left to the camera controls.
 */
export function useViewerInteractions(
  containerRef: React.RefObject<HTMLDivElement | null>,
  tooltipRef: React.RefObject<HTMLDivElement | null>,
  enabled: boolean
) {
  useEffect(() => {
    const container = containerRef.current
    if (!container || !enabled) return

    let press: { x: number; y: number; button: number } | null = null
    let dragging = false
    let hoverBusy = false
    let hoverNext: { x: number; y: number } | null = null
    let disposed = false

    const movedFar = (x: number, y: number) =>
      !!press && Math.hypot(x - press.x, y - press.y) > CLICK_SLOP_PX

    const placeTooltip = (x: number, y: number) => {
      const tip = tooltipRef.current
      if (!tip) return
      const rect = container.getBoundingClientRect()
      tip.style.transform = `translate(${x - rect.left + 14}px, ${y - rect.top + 16}px)`
    }

    // Only one hover raycast runs at a time; the latest pointer position wins.
    const runHover = async (x: number, y: number) => {
      hoverBusy = true
      try {
        const hit = await pick(x, y)
        if (!disposed && !press) setHover(hit)
      } finally {
        hoverBusy = false
        if (hoverNext && !disposed) {
          const next = hoverNext
          hoverNext = null
          void runHover(next.x, next.y)
        }
      }
    }

    const onPointerMove = (e: PointerEvent) => {
      placeTooltip(e.clientX, e.clientY)
      if (press) {
        if (!dragging && movedFar(e.clientX, e.clientY)) {
          dragging = true
          setHover(null)
        }
        return
      }
      if (e.pointerType === 'touch') return
      if (hoverBusy) hoverNext = { x: e.clientX, y: e.clientY }
      else void runHover(e.clientX, e.clientY)
    }

    const onPointerDown = (e: PointerEvent) => {
      press = { x: e.clientX, y: e.clientY, button: e.button }
      dragging = false
      hoverNext = null
      useViewerStore.getState().set({ contextMenu: null })
    }

    const openContextMenu = async (x: number, y: number) => {
      const hit = await pick(x, y)
      if (disposed) return
      const { selection, set } = useViewerStore.getState()
      if (hit && !selection.some(r => refKey(r) === refKey(hit))) {
        setSelection([hit], { reveal: true })
      }
      set({ contextMenu: { x, y, onItem: !!hit } })
    }

    // Listens on window: the camera controls keep a drag alive outside the canvas.
    const onPointerUp = async (e: PointerEvent) => {
      const start = press
      if (!start) return
      const wasDrag = dragging || movedFar(e.clientX, e.clientY)
      press = null
      dragging = false
      if (wasDrag || !container.contains(e.target as Node)) return

      // A still right-click opens the menu; a right-drag pans the camera.
      if (start.button === 2) {
        void openContextMenu(e.clientX, e.clientY)
        return
      }
      if (start.button !== 0) return

      const additive = e.shiftKey || e.ctrlKey || e.metaKey
      const hit = await pick(e.clientX, e.clientY)
      if (disposed) return
      if (!hit) {
        if (!additive) clearSelection()
      } else if (additive) {
        toggleInSelection(hit)
      } else {
        setSelection([hit], { reveal: true })
      }
    }

    const onPointerCancel = () => {
      press = null
      dragging = false
    }

    const onDoubleClick = async (e: MouseEvent) => {
      const hit = await pick(e.clientX, e.clientY)
      if (hit && !disposed) void focusItems([hit])
    }

    const onContextMenu = (e: MouseEvent) => e.preventDefault()

    const onPointerLeave = () => {
      hoverNext = null
      if (!press) setHover(null)
    }

    container.addEventListener('pointerdown', onPointerDown)
    container.addEventListener('pointermove', onPointerMove)
    container.addEventListener('pointerleave', onPointerLeave)
    container.addEventListener('dblclick', onDoubleClick)
    container.addEventListener('contextmenu', onContextMenu)
    window.addEventListener('pointerup', onPointerUp)
    window.addEventListener('pointercancel', onPointerCancel)

    return () => {
      disposed = true
      setHover(null)
      container.removeEventListener('pointerdown', onPointerDown)
      container.removeEventListener('pointermove', onPointerMove)
      container.removeEventListener('pointerleave', onPointerLeave)
      container.removeEventListener('dblclick', onDoubleClick)
      container.removeEventListener('contextmenu', onContextMenu)
      window.removeEventListener('pointerup', onPointerUp)
      window.removeEventListener('pointercancel', onPointerCancel)
    }
  }, [containerRef, tooltipRef, enabled])
}
