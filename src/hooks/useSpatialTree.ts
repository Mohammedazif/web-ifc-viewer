import { useState, useEffect } from 'react'
import type { FragmentsEngine } from '@/lib/fragmentsEngine'
import type { FragmentsModel } from '@thatopen/fragments'

export interface SpatialTreeItem {
  category: string | null
  localId: number | null
  children?: SpatialTreeItem[]
  name?: string
}

export function useSpatialTree(engineRef: React.MutableRefObject<FragmentsEngine | null>, modelId: string | null, isLoadedInEngine: boolean = false) {
  const [treeData, setTreeData] = useState<SpatialTreeItem | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (!engineRef.current || !modelId || !isLoadedInEngine) {
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
              const m = model as any;
              
              if (typeof m.getItem === 'function') {
                const item = m.getItem(node.localId)
                if (item && typeof item.getAttributes === 'function') {
                  const attrs = await item.getAttributes()
                  if (attrs) {
                    if (typeof attrs.get === 'function') {
                      const nameEntry = attrs.get('Name') || attrs.get('LongName')
                      if (nameEntry && nameEntry.value !== undefined && nameEntry.value !== null) {
                        name = String(nameEntry.value)
                      }
                    } else if (attrs.object) {
                      const nameVal = attrs.object.Name || attrs.object.LongName
                      if (nameVal !== undefined && nameVal !== null) name = String(nameVal)
                    }
                  }
                }
              }
              
              if (!name && typeof m.getItems === 'function') {
                const itemsMap: Map<number, any> = await m.getItems([node.localId])
                const rawItem = itemsMap?.get(node.localId)
                if (rawItem?.data) {
                  const nameAttr = rawItem.data['Name'] || rawItem.data['LongName']
                  if (nameAttr?.value !== undefined && nameAttr.value !== null && nameAttr.value !== '') {
                    name = String(nameAttr.value)
                  }
                }
              }
            } catch (e) {
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
  }, [engineRef, modelId, isLoadedInEngine])

  return { treeData, isLoading }
}
