import { Icon } from '@/components/ui/Icon'
import type { SectionAxis } from '@/types'
import { updateSection } from '@/lib/viewerActions'
import { useViewerStore } from '@/store/useViewerStore'

const AXES: { axis: SectionAxis; label: string; hint: string }[] = [
  { axis: 'y', label: 'Height', hint: 'Cut horizontally, like a floor plan' },
  { axis: 'x', label: 'Width', hint: 'Cut along the X axis' },
  { axis: 'z', label: 'Depth', hint: 'Cut along the Z axis' },
]

/** Slider panel for the section plane. Sits just above the toolbar while the tool is on. */
export function SectionControl() {
  const section = useViewerStore(s => s.section)
  if (!section.active) return null

  return (
    <div className="section-control" role="group" aria-label="Section plane">
      <div className="segmented" role="radiogroup" aria-label="Cut direction">
        {AXES.map(({ axis, label, hint }) => (
          <button
            key={axis}
            role="radio"
            aria-checked={section.axis === axis}
            className={`segmented-item ${section.axis === axis ? 'active' : ''}`}
            onClick={() => updateSection({ axis })}
            title={hint}
          >
            {label}
          </button>
        ))}
      </div>

      <input
        className="slider"
        type="range"
        min={0}
        max={1}
        step={0.002}
        value={section.position}
        onChange={e => updateSection({ position: Number(e.target.value) })}
        aria-label="Section position"
      />

      <button
        className={`icon-btn icon-btn-sm ${section.flipped ? 'active' : ''}`}
        onClick={() => updateSection({ flipped: !section.flipped })}
        aria-label="Flip the cut side"
        aria-pressed={section.flipped}
        data-tip="Flip side"
        data-tip-pos="top"
      >
        <Icon name="flip" size={15} />
      </button>
      <button
        className="icon-btn icon-btn-sm"
        onClick={() => updateSection({ active: false })}
        aria-label="Close section plane"
        data-tip="Close (X)"
        data-tip-pos="top"
      >
        <Icon name="close" size={15} />
      </button>
    </div>
  )
}
