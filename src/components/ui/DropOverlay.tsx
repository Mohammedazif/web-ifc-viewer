import { useEffect, useState } from 'react'
import { Icon } from '@/components/ui/Icon'
import { importFiles } from '@/lib/importQueue'

const hasFiles = (e: DragEvent) => !!e.dataTransfer && [...e.dataTransfer.types].includes('Files')

/** Lets files be dropped anywhere in the window, at any time. */
export function DropOverlay() {
  const [active, setActive] = useState(false)

  useEffect(() => {
    // dragenter/dragleave fire for every child element, so count them.
    let depth = 0

    const onEnter = (e: DragEvent) => {
      if (!hasFiles(e)) return
      e.preventDefault()
      depth++
      setActive(true)
    }
    const onOver = (e: DragEvent) => {
      if (!hasFiles(e)) return
      e.preventDefault()
      if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy'
    }
    const onLeave = (e: DragEvent) => {
      if (!hasFiles(e)) return
      depth = Math.max(0, depth - 1)
      if (depth === 0) setActive(false)
    }
    const onDrop = (e: DragEvent) => {
      if (!hasFiles(e)) return
      e.preventDefault()
      depth = 0
      setActive(false)
      if (e.dataTransfer && e.dataTransfer.files.length > 0) importFiles(e.dataTransfer.files)
    }

    window.addEventListener('dragenter', onEnter)
    window.addEventListener('dragover', onOver)
    window.addEventListener('dragleave', onLeave)
    window.addEventListener('drop', onDrop)
    return () => {
      window.removeEventListener('dragenter', onEnter)
      window.removeEventListener('dragover', onOver)
      window.removeEventListener('dragleave', onLeave)
      window.removeEventListener('drop', onDrop)
    }
  }, [])

  if (!active) return null

  return (
    <div className="drop-overlay" aria-hidden="true">
      <div className="drop-overlay-card">
        <Icon name="upload" size={30} />
        <p className="drop-overlay-title">Drop to add to the scene</p>
        <p className="drop-overlay-hint">.ifc and .frag files</p>
      </div>
    </div>
  )
}
