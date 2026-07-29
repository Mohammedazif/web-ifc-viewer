import type { FragmentsEngine } from '@/lib/fragmentsEngine'
import * as OBC from '@thatopen/components'
import * as THREE from 'three'

interface ViewerToolbarProps {
  engineRef: React.MutableRefObject<FragmentsEngine | null>
  onToggleStats: () => void
  statsVisible: boolean
}

import { useState, useEffect } from 'react'

export function ViewerToolbar({ engineRef, onToggleStats, statsVisible }: ViewerToolbarProps) {
  const engine = engineRef.current
  const [gridActive, setGridActive] = useState(true)

  // Initialize grid state on mount
  useEffect(() => {
    if (!engine) return
    const grids = engine.components.get(OBC.Grids)
    if (grids) {
      let isVisible = false
      for (const grid of grids.list.values()) {
        if (typeof grid.visible === 'boolean') isVisible = grid.visible
        else if (grid.three) isVisible = grid.three.visible
      }
      setGridActive(isVisible)
    }
  }, [engine])

  const fitView = async () => {
    if (!engine) return
    try {
      const box = new THREE.Box3()
      engine.world.scene.three.traverse((obj: THREE.Object3D) => {
        if ((obj as THREE.Mesh).isMesh) box.expandByObject(obj)
      })
      if (!box.isEmpty()) {
        await engine.world.camera.controls.fitToBox(box, true)
      }
    } catch (e) { console.warn('fitView error', e) }
  }

  const toggleGrid = () => {
    if (!engine) return
    const grids = engine.components.get(OBC.Grids)
    let newState = !gridActive
    for (const grid of grids.list.values()) {
      if (typeof grid.visible === 'boolean') {
        grid.visible = newState
      } else if (grid.three) {
        grid.three.visible = newState
      }
    }
    setGridActive(newState)
  }

  const resetCamera = () => {
    if (!engine) return
    engine.world.camera.controls.setLookAt(50, 30, 50, 0, 0, 0, true)
  }

  const tools = [
    {
      title: 'Fit View',
      action: fitView,
      icon: (
        <svg viewBox="0 0 20 20" fill="currentColor" width="15" height="15">
          <path d="M3 4a1 1 0 011-1h4a1 1 0 010 2H5.414l3.293 3.293a1 1 0 01-1.414 1.414L4 6.414V8a1 1 0 01-2 0V4zm13 0a1 1 0 00-1-1h-4a1 1 0 000 2h2.586l-3.293 3.293a1 1 0 001.414 1.414L15 6.414V8a1 1 0 002 0V4zm-13 9a1 1 0 011 1v1.586l3.293-3.293a1 1 0 011.414 1.414L5.414 17H8a1 1 0 010 2H4a1 1 0 01-1-1v-4a1 1 0 011-1zm13 0a1 1 0 00-1 1v1.586l-3.293-3.293a1 1 0 00-1.414 1.414L14.586 17H12a1 1 0 000 2h4a1 1 0 001-1v-4a1 1 0 00-1-1z"/>
        </svg>
      ),
    },
    {
      title: 'Toggle Grid',
      action: toggleGrid,
      active: gridActive,
      icon: (
        <svg viewBox="0 0 20 20" fill="currentColor" width="15" height="15">
          <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM11 13a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"/>
        </svg>
      ),
    },
    {
      title: 'Reset Camera',
      action: resetCamera,
      icon: (
        <svg viewBox="0 0 20 20" fill="currentColor" width="15" height="15">
          <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z"/>
        </svg>
      ),
    },
    {
      title: statsVisible ? 'Hide Stats' : 'Show Stats',
      action: onToggleStats,
      active: statsVisible,
      icon: (
        <svg viewBox="0 0 20 20" fill="currentColor" width="15" height="15">
          <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z"/>
        </svg>
      ),
    },
  ]

  return (
    <div className="viewer-toolbar">
      {tools.map((tool) => (
        <button
          key={tool.title}
          className={`toolbar-btn ${tool.active ? 'active' : ''}`}
          onClick={tool.action}
          title={tool.title}
        >
          {tool.icon}
        </button>
      ))}
    </div>
  )
}
