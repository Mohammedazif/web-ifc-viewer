import { useState, useEffect } from 'react'
import type { FragmentsEngine } from '@/lib/fragmentsEngine'
import type { FragmentsModel } from '@thatopen/fragments'

export interface SpatialTreeItem {
  category: string | null
  localId: number | null
  children?: SpatialTreeItem[]
  name?: string
}

export function useSpatialTree(engineRef: React.MutableRefObject<FragmentsEngine | null>, modelId: string | null) {
  const [treeData, setTreeData] = useState<SpatialTreeItem | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (!engineRef.current || !modelId) {
      setTreeData(null)
      return
    }

    const loadTree = async () => {
      setIsLoading(true)
      try {
        const engine = engineRef.current
        if (!engine) return
        const model = engine.fragments.models.list.get(modelId) as FragmentsModel
        if (!model) return

        const structure = await model.getSpatialStructure()
        
        // Helper to recursively get item names if available
        const enrichNode = async (node: SpatialTreeItem): Promise<SpatialTreeItem> => {
          let name: string | undefined = undefined
          if (node.localId !== null) {
            try {
              const item = await model.getItem(node.localId)
              if (item && typeof item === 'object') {
                // Typical IFC property objects might have a Name property
                const nameAttr = (item as any).Name
                if (nameAttr && typeof nameAttr === 'object' && nameAttr.value) {
                  name = nameAttr.value
                } else if (typeof nameAttr === 'string') {
                  name = nameAttr
                }
              }
            } catch (e) {
              // Ignore if we can't get item data
            }
          }
          
          let children: SpatialTreeItem[] | undefined
          if (node.children && node.children.length > 0) {
            children = await Promise.all(node.children.map(enrichNode))
          }
          
          return {
            ...node,
            name,
            children
          }
        }
        
        const enrichedStructure = await enrichNode(structure)
        setTreeData(enrichedStructure)
      } catch (err) {
        console.error('Failed to load spatial tree', err)
      } finally {
        setIsLoading(false)
      }
    }

    loadTree()
  }, [engineRef, modelId])

  return { treeData, isLoading }
}
