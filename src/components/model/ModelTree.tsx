import { useCallback, useDeferredValue, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Icon, type IconName } from '@/components/ui/Icon'
import type { ItemRef, TreeNode } from '@/types'
import { formatCategory, isSpatialCategory } from '@/lib/categories'
import { findNode } from '@/lib/spatialTree'
import { focusItems, focusModel, setItemsVisible, setSelection } from '@/lib/viewerActions'
import { useModelStore } from '@/store/useModelStore'
import { refKey, useViewerStore } from '@/store/useViewerStore'

const ROW_HEIGHT = 28
const OVERSCAN = 8

interface Row {
  node: TreeNode
  depth: number
  expandable: boolean
  expanded: boolean
}

/** Project, site and building open by default so storeys are visible straight away. */
const AUTO_OPEN = new Set(['IFCPROJECT', 'IFCSITE', 'IFCBUILDING'])
const opensByDefault = (node: TreeNode) =>
  node.kind === 'model' || (node.kind === 'item' && !!node.category && AUTO_OPEN.has(node.category.toUpperCase()))

const toRefs = (node: TreeNode): ItemRef[] =>
  node.geomIds.map(localId => ({ modelId: node.modelId, localId }))

function nodeIcon(node: TreeNode): IconName {
  if (node.kind === 'model') return 'cube'
  if (node.kind === 'group') return 'folder'
  return isSpatialCategory(node.category) ? 'layers' : 'box'
}

function matches(node: TreeNode, query: string) {
  if (node.kind === 'model') return false
  return (
    node.label.toLowerCase().includes(query) ||
    formatCategory(node.category).toLowerCase().includes(query) ||
    (node.localId !== null && String(node.localId) === query)
  )
}

export function ModelTree() {
  const models = useModelStore(s => s.models)
  const trees = useViewerStore(s => s.trees)
  const selection = useViewerStore(s => s.selection)
  const primary = useViewerStore(s => s.primary)
  const hidden = useViewerStore(s => s.hidden)
  const revealNonce = useViewerStore(s => s.revealNonce)

  const [query, setQuery] = useState('')
  const deferredQuery = useDeferredValue(query.trim().toLowerCase())
  /** Keys whose open/closed state differs from the default. */
  const [toggled, setToggled] = useState<Set<string>>(() => new Set())
  const [activeKey, setActiveKey] = useState<string | null>(null)
  const [scrollTop, setScrollTop] = useState(0)
  const [viewportHeight, setViewportHeight] = useState(300)
  const scrollRef = useRef<HTMLDivElement>(null)
  const pendingReveal = useRef<string | null>(null)

  const roots = useMemo(
    () => models.map(m => trees[m.modelId]).filter(Boolean) as TreeNode[],
    [models, trees]
  )
  const pendingTrees = models.length - roots.length

  const isOpen = useCallback(
    (node: TreeNode) => opensByDefault(node) !== toggled.has(node.key),
    [toggled]
  )

  const { rows, matchCount } = useMemo(() => {
    const out: Row[] = []
    let found = 0

    if (deferredQuery) {
      // Keep matching rows plus the ancestors needed to reach them.
      const keep = new Set<TreeNode>()
      const visit = (node: TreeNode): boolean => {
        let any = false
        for (const child of node.children) any = visit(child) || any
        const self = matches(node, deferredQuery)
        if (self) found++
        if (self || any) keep.add(node)
        return self || any
      }
      roots.forEach(visit)
      const walk = (node: TreeNode, depth: number) => {
        if (!keep.has(node)) return
        const kids = node.children.filter(child => keep.has(child))
        out.push({ node, depth, expandable: kids.length > 0, expanded: kids.length > 0 })
        kids.forEach(child => walk(child, depth + 1))
      }
      roots.forEach(root => walk(root, 0))
    } else {
      const walk = (node: TreeNode, depth: number) => {
        const expandable = node.children.length > 0
        const expanded = expandable && isOpen(node)
        out.push({ node, depth, expandable, expanded })
        if (expanded) node.children.forEach(child => walk(child, depth + 1))
      }
      roots.forEach(root => walk(root, 0))
    }
    return { rows: out, matchCount: found }
  }, [roots, deferredQuery, isOpen])

  const selectedKeys = useMemo(() => new Set(selection.map(refKey)), [selection])
  const primaryKey = primary ? refKey(primary) : null

  const isHidden = (node: TreeNode) => {
    const set = hidden[node.modelId]
    if (!set || set.size === 0 || node.geomIds.length === 0) return false
    return node.geomIds.every(id => set.has(id))
  }

  const toggle = (node: TreeNode) => {
    if (deferredQuery) return
    setToggled(prev => {
      const next = new Set(prev)
      if (next.has(node.key)) next.delete(node.key)
      else next.add(node.key)
      return next
    })
  }

  const select = (node: TreeNode, additive: boolean) => {
    if (node.kind === 'model') {
      toggle(node)
      return
    }
    const refs = toRefs(node)
    const self = node.localId !== null ? { modelId: node.modelId, localId: node.localId } : null
    if (additive) setSelection([...selection, ...refs], { primary: null })
    else setSelection(refs, { primary: self })
  }

  const zoomTo = (node: TreeNode) => {
    if (node.kind === 'model') focusModel(node.modelId)
    else void focusItems(toRefs(node))
  }

  /* ── Reveal the element picked in the 3D view ── */
  useEffect(() => {
    if (!primary) return
    const root = useViewerStore.getState().trees[primary.modelId]
    if (!root) return
    const target = findNode(root, primary.localId)
    if (!target) return

    const toOpen: TreeNode[] = []
    for (let p = target.parent; p; p = p.parent) toOpen.push(p)
    setToggled(prev => {
      const next = new Set(prev)
      for (const node of toOpen) {
        const open = opensByDefault(node) !== next.has(node.key)
        if (open) continue
        if (next.has(node.key)) next.delete(node.key)
        else next.add(node.key)
      }
      return next
    })
    pendingReveal.current = target.key
    setActiveKey(target.key)
    // Only an explicit reveal request should scroll the tree.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [revealNonce])

  useLayoutEffect(() => {
    const key = pendingReveal.current
    const el = scrollRef.current
    if (!key || !el) return
    const index = rows.findIndex(row => row.node.key === key)
    if (index < 0) return
    pendingReveal.current = null
    const top = index * ROW_HEIGHT
    if (top < el.scrollTop || top + ROW_HEIGHT > el.scrollTop + el.clientHeight) {
      el.scrollTop = Math.max(0, top - el.clientHeight / 2 + ROW_HEIGHT / 2)
    }
  }, [rows])

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const observer = new ResizeObserver(() => setViewportHeight(el.clientHeight))
    observer.observe(el)
    setViewportHeight(el.clientHeight)
    return () => observer.disconnect()
  }, [])

  /* ── Keyboard navigation ── */
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (rows.length === 0) return
    const index = Math.max(0, rows.findIndex(row => row.node.key === activeKey))
    const row = rows[index]
    const move = (to: number) => {
      const clamped = Math.min(rows.length - 1, Math.max(0, to))
      setActiveKey(rows[clamped].node.key)
      const el = scrollRef.current
      if (!el) return
      const top = clamped * ROW_HEIGHT
      if (top < el.scrollTop) el.scrollTop = top
      else if (top + ROW_HEIGHT > el.scrollTop + el.clientHeight) el.scrollTop = top + ROW_HEIGHT - el.clientHeight
    }

    switch (e.key) {
      case 'ArrowDown': move(activeKey === null ? 0 : index + 1); break
      case 'ArrowUp': move(index - 1); break
      case 'Home': move(0); break
      case 'End': move(rows.length - 1); break
      case 'ArrowRight':
        if (row.expandable && !row.expanded) toggle(row.node)
        else move(index + 1)
        break
      case 'ArrowLeft':
        if (row.expanded) toggle(row.node)
        else if (row.node.parent) {
          const parentIndex = rows.findIndex(r => r.node === row.node.parent)
          if (parentIndex >= 0) move(parentIndex)
        }
        break
      case 'Enter':
      case ' ':
        select(row.node, e.shiftKey || e.ctrlKey || e.metaKey)
        break
      default:
        return
    }
    e.preventDefault()
  }

  const start = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - OVERSCAN)
  const end = Math.min(rows.length, Math.ceil((scrollTop + viewportHeight) / ROW_HEIGHT) + OVERSCAN)

  return (
    <section className="tree-panel">
      <div className="panel-heading">
        <h2 className="panel-title">Structure</h2>
        {deferredQuery && (
          <span className="panel-count">{matchCount} {matchCount === 1 ? 'match' : 'matches'}</span>
        )}
      </div>

      <div className="search-field">
        <Icon name="search" size={14} className="search-field-icon" />
        <input
          id="tree-search"
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search by name, type or id"
          aria-label="Search the model structure"
          autoComplete="off"
          spellCheck={false}
        />
        {query ? (
          <button className="icon-btn icon-btn-sm" onClick={() => setQuery('')} aria-label="Clear search">
            <Icon name="close" size={13} />
          </button>
        ) : (
          <kbd className="kbd search-field-hint">/</kbd>
        )}
      </div>

      <div
        ref={scrollRef}
        className="tree-scroll"
        role="tree"
        aria-label="Model structure"
        tabIndex={0}
        onKeyDown={onKeyDown}
        onScroll={e => setScrollTop(e.currentTarget.scrollTop)}
      >
        {rows.length === 0 ? (
          <p className="tree-empty">
            {deferredQuery
              ? `Nothing matches “${query.trim()}”`
              : pendingTrees > 0 ? 'Reading the model structure…' : 'This model has no spatial structure'}
          </p>
        ) : (
          <div style={{ height: rows.length * ROW_HEIGHT, position: 'relative' }}>
            <div style={{ transform: `translateY(${start * ROW_HEIGHT}px)` }}>
              {rows.slice(start, end).map(({ node, depth, expandable, expanded }) => {
                const key = node.localId !== null ? `${node.modelId}:${node.localId}` : null
                const selected = key !== null && (selectedKeys.has(key) || primaryKey === key)
                const rowHidden = isHidden(node)
                const canHide = node.geomIds.length > 0
                return (
                  <div
                    key={node.key}
                    role="treeitem"
                    aria-selected={selected}
                    aria-expanded={expandable ? expanded : undefined}
                    aria-level={depth + 1}
                    className={[
                      'tree-row',
                      `tree-row-${node.kind}`,
                      selected ? 'is-selected' : '',
                      rowHidden ? 'is-hidden' : '',
                      activeKey === node.key ? 'is-active' : '',
                    ].join(' ')}
                    style={{ paddingLeft: 6 + depth * 14, height: ROW_HEIGHT }}
                    onClick={e => {
                      setActiveKey(node.key)
                      select(node, e.shiftKey || e.ctrlKey || e.metaKey)
                    }}
                    onDoubleClick={() => zoomTo(node)}
                    title={node.kind === 'model' ? node.label : `${node.label}: double-click to zoom`}
                  >
                    {expandable ? (
                      <button
                        className="tree-chevron"
                        tabIndex={-1}
                        aria-label={expanded ? 'Collapse' : 'Expand'}
                        onClick={e => { e.stopPropagation(); toggle(node) }}
                        onDoubleClick={e => e.stopPropagation()}
                      >
                        <Icon name={expanded ? 'chevronDown' : 'chevronRight'} size={13} />
                      </button>
                    ) : (
                      <span className="tree-chevron-spacer" />
                    )}
                    <Icon name={nodeIcon(node)} size={14} className="tree-row-icon" />
                    <span className="tree-row-label">{node.label}</span>
                    <span className="tree-row-meta">
                      {node.kind === 'group'
                        ? node.children.length
                        : node.kind === 'item' && node.parent?.kind !== 'group' ? formatCategory(node.category) : ''}
                    </span>
                    {canHide && (
                      <button
                        className="tree-eye"
                        tabIndex={-1}
                        aria-label={rowHidden ? `Show ${node.label}` : `Hide ${node.label}`}
                        onClick={e => { e.stopPropagation(); setItemsVisible(node.modelId, node.geomIds, rowHidden) }}
                        onDoubleClick={e => e.stopPropagation()}
                      >
                        <Icon name={rowHidden ? 'eyeOff' : 'eye'} size={14} />
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
