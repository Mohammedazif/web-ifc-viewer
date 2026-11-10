import { useEffect, useMemo, useState } from 'react'
import { Icon } from '@/components/ui/Icon'
import { formatCategory } from '@/lib/categories'
import { fetchItemProperties, type ItemProperties, type PropertyGroup } from '@/lib/properties'
import { clearSelection, focusItems, hideSelection, isolateSelection } from '@/lib/viewerActions'
import { toast, useViewerStore } from '@/store/useViewerStore'

function Group({ group, forceOpen }: { group: PropertyGroup; forceOpen: boolean }) {
  const [open, setOpen] = useState(true)
  const shown = open || forceOpen

  return (
    <section className="prop-group">
      <button className="prop-group-header" onClick={() => setOpen(!open)} aria-expanded={shown}>
        <Icon name={shown ? 'chevronDown' : 'chevronRight'} size={13} />
        <span className="prop-group-title">{group.title}</span>
        <span className="prop-group-count">{group.rows.length}</span>
      </button>
      {shown && (
        <dl className="prop-rows">
          {group.rows.map((row, i) => (
            <div className="prop-row" key={`${row.name}-${i}`}>
              <dt title={row.name}>{row.name}</dt>
              <dd title={row.value}>{row.value}</dd>
            </div>
          ))}
        </dl>
      )}
    </section>
  )
}

/** Floating panel describing the current selection, with the actions that apply to it. */
export function PropertiesPanel() {
  const primary = useViewerStore(s => s.primary)
  const selection = useViewerStore(s => s.selection)
  const [loaded, setLoaded] = useState<{ key: string; props: ItemProperties | null } | null>(null)
  const [filter, setFilter] = useState('')

  const primaryKey = primary ? `${primary.modelId}:${primary.localId}` : null

  useEffect(() => {
    if (!primary) return
    let cancelled = false
    const key = `${primary.modelId}:${primary.localId}`
    fetchItemProperties(primary)
      .then(props => { if (!cancelled) setLoaded({ key, props }) })
      .catch(err => {
        console.warn('Could not read properties', err)
        if (!cancelled) setLoaded({ key, props: null })
      })
    return () => { cancelled = true }
    // primaryKey captures the identity of `primary`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [primaryKey])

  const props = loaded && loaded.key === primaryKey ? loaded.props : null
  const loading = !!primary && (!loaded || loaded.key !== primaryKey)

  const groups = useMemo(() => {
    if (!props) return []
    const all: PropertyGroup[] = []
    const base = [...props.attributes]
    if (props.guid) base.unshift({ name: 'GUID', value: props.guid })
    if (base.length > 0) all.push({ title: 'Attributes', rows: base })
    all.push(...props.groups)

    const q = filter.trim().toLowerCase()
    if (!q) return all
    return all
      .map(group => ({
        ...group,
        rows: group.rows.filter(r => r.name.toLowerCase().includes(q) || r.value.toLowerCase().includes(q)),
      }))
      .filter(group => group.rows.length > 0)
  }, [props, filter])

  if (!primary && selection.length === 0) return null

  const count = selection.length
  const title = primary
    ? props?.name ?? (loading ? 'Loading…' : formatCategory(props?.category ?? null))
    : `${count} elements selected`
  const subtitleParts: string[] = []
  if (primary) {
    if (props?.category) subtitleParts.push(formatCategory(props.category))
    subtitleParts.push(`#${primary.localId}`)
    if (count > 1) subtitleParts.push(`${count} elements`)
  }

  const copyGuid = async () => {
    if (!props?.guid) return
    try {
      await navigator.clipboard.writeText(props.guid)
      toast('GUID copied', 'success')
    } catch {
      toast('Could not copy to the clipboard', 'error')
    }
  }

  const totalRows = props ? props.attributes.length + props.groups.reduce((n, g) => n + g.rows.length, 0) : 0

  return (
    <aside className="properties-panel" aria-label="Selection details">
      <header className="properties-header">
        <div className="properties-heading">
          <h2 className="properties-title" title={title}>{title}</h2>
          {subtitleParts.length > 0 && <p className="properties-subtitle">{subtitleParts.join(' · ')}</p>}
        </div>
        <button
          className="icon-btn icon-btn-sm"
          onClick={clearSelection}
          aria-label="Clear selection"
          data-tip="Clear selection (Esc)"
          data-tip-pos="bottom-end"
        >
          <Icon name="close" size={15} />
        </button>
      </header>

      <div className="properties-actions">
        <button className="btn btn-secondary btn-sm" onClick={() => void focusItems(selection)} disabled={count === 0}>
          <Icon name="target" size={14} /> Zoom
        </button>
        <button className="btn btn-secondary btn-sm" onClick={isolateSelection} disabled={count === 0}>
          <Icon name="isolate" size={14} /> Isolate
        </button>
        <button className="btn btn-secondary btn-sm" onClick={hideSelection} disabled={count === 0}>
          <Icon name="eyeOff" size={14} /> Hide
        </button>
        {props?.guid && (
          <button
            className="icon-btn icon-btn-sm properties-copy"
            onClick={copyGuid}
            aria-label="Copy GUID"
            data-tip="Copy GUID"
            data-tip-pos="bottom-end"
          >
            <Icon name="copy" size={14} />
          </button>
        )}
      </div>

      {primary ? (
        <div className="properties-body">
          {loading && (
            <div className="properties-state"><span className="spinner spinner-sm" /> Reading properties…</div>
          )}
          {!loading && !props && <div className="properties-state">No properties available for this element.</div>}
          {props && totalRows > 8 && (
            <div className="search-field search-field-sm">
              <Icon name="search" size={13} className="search-field-icon" />
              <input
                type="text"
                value={filter}
                onChange={e => setFilter(e.target.value)}
                placeholder="Filter properties"
                aria-label="Filter properties"
                autoComplete="off"
                spellCheck={false}
              />
              {filter && (
                <button className="icon-btn icon-btn-sm" onClick={() => setFilter('')} aria-label="Clear filter">
                  <Icon name="close" size={12} />
                </button>
              )}
            </div>
          )}
          {groups.map((group, i) => (
            <Group key={`${group.title}-${i}`} group={group} forceOpen={!!filter.trim()} />
          ))}
          {props && groups.length === 0 && filter.trim() && (
            <div className="properties-state">No property matches “{filter.trim()}”.</div>
          )}
        </div>
      ) : (
        <p className="properties-hint">
          Shift-click elements to add or remove them. Use the actions above on the whole selection.
        </p>
      )}
    </aside>
  )
}
