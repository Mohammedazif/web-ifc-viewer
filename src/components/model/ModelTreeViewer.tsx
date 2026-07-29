import { useState } from 'react'
import type { SpatialTreeItem } from '@/hooks/useSpatialTree'

interface ModelTreeViewerProps {
  data: SpatialTreeItem
  onNodeClick: (localId: number, category: string | null) => void
}

const formatCategory = (category: string | null) => {
  if (!category) return 'Unknown'
  return category.replace('Ifc', '')
}

function TreeNode({ node, onNodeClick, level = 0 }: { node: SpatialTreeItem, onNodeClick: (localId: number, category: string | null) => void, level?: number }) {
  const [expanded, setExpanded] = useState(level < 2) // Auto-expand first two levels (e.g. Project -> Site -> Building)
  const hasChildren = node.children && node.children.length > 0

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation()
    setExpanded(!expanded)
  }

  const handleClick = () => {
    if (node.localId !== null) {
      onNodeClick(node.localId, node.category)
    }
    if (hasChildren) {
      setExpanded(!expanded)
    }
  }

  const label = node.name || formatCategory(node.category)

  return (
    <div className="tree-node-container" style={{ paddingLeft: `${level === 0 ? 0 : 16}px` }}>
      <div 
        className={`tree-node ${hasChildren ? 'has-children' : ''}`}
        onClick={handleClick}
      >
        <div className="tree-node-content">
          {hasChildren ? (
            <button className="tree-toggle" onClick={handleToggle}>
              <svg 
                viewBox="0 0 20 20" 
                fill="currentColor" 
                width="14" 
                height="14"
                style={{ transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}
              >
                <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd"/>
              </svg>
            </button>
          ) : (
            <div className="tree-toggle-placeholder" />
          )}
          <span className="tree-node-icon">
            {hasChildren ? '📁' : '🧊'}
          </span>
          <span className="tree-node-label">{label}</span>
          {node.localId !== null && (
            <span className="tree-node-id">#{node.localId}</span>
          )}
        </div>
      </div>
      
      {expanded && hasChildren && (
        <div className="tree-children">
          {node.children!.map((child, i) => (
            <TreeNode 
              key={`${child.localId}-${i}`} 
              node={child} 
              onNodeClick={onNodeClick} 
              level={level + 1} 
            />
          ))}
        </div>
      )}
    </div>
  )
}

export function ModelTreeViewer({ data, onNodeClick }: ModelTreeViewerProps) {
  return (
    <div className="model-tree-viewer">
      <TreeNode node={data} onNodeClick={onNodeClick} level={0} />
    </div>
  )
}
