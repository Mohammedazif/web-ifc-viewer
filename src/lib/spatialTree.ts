import type { FragmentsModel, SpatialTreeItem } from '@thatopen/fragments'
import type { TreeNode } from '@/types'
import { formatCategory, isSpatialCategory, pluralCategory } from './categories'
import { getCachedInfo, loadNames, primeInfo } from './itemInfo'

/** Array.push(...big) overflows the stack on large models, so append by loop. */
function append(target: number[], source: number[]) {
  for (let i = 0; i < source.length; i++) target.push(source[i])
}

/**
 * Several IFC classes share one readable name (IfcWall and
 * IfcWallStandardCase are both "Walls"); show them as a single group.
 */
function mergeGroups(nodes: TreeNode[]): TreeNode[] {
  const byLabel = new Map<string, TreeNode>()
  const out: TreeNode[] = []
  for (const node of nodes) {
    const first = node.kind === 'group' ? byLabel.get(node.label) : undefined
    if (!first) {
      if (node.kind === 'group') byLabel.set(node.label, node)
      out.push(node)
      continue
    }
    for (const child of node.children) {
      child.parent = first
      first.children.push(child)
    }
    append(first.geomIds, node.geomIds)
  }
  return out
}

function collectIds(raw: SpatialTreeItem, out: number[]) {
  if (raw.localId !== null && raw.localId !== undefined) out.push(raw.localId)
  raw.children?.forEach(child => collectIds(child, out))
}

/**
 * Turns the raw spatial structure into the tree shown in the sidebar.
 *
 * The raw structure alternates between category nodes (no id) and element
 * nodes (no category). Spatial containers and categories holding a single
 * element are folded into one row ("Level 1 · Storey"); any other category
 * becomes a group row ("Walls · 120") so storeys with thousands of elements
 * stay browsable.
 */
export async function buildSpatialTree(
  model: FragmentsModel,
  modelId: string,
  fileName: string,
  geometryIds: Set<number>
): Promise<TreeNode> {
  const raw = await model.getSpatialStructure()

  const ids: number[] = []
  collectIds(raw, ids)
  try {
    await loadNames(model, modelId, ids)
  } catch (err) {
    console.warn('Could not read element names', err)
  }

  let serial = 0
  const nextKey = () => `${modelId}/${serial++}`

  const convert = (node: SpatialTreeItem, inherited: string | null, parent: TreeNode): TreeNode[] => {
    const hasId = node.localId !== null && node.localId !== undefined
    const children = node.children ?? []

    if (hasId) {
      const localId = node.localId as number
      const known = getCachedInfo({ modelId, localId })
      const category = node.category ?? inherited ?? known?.category ?? null
      primeInfo(modelId, localId, { name: known?.name ?? null, category })
      const item: TreeNode = {
        key: nextKey(),
        modelId,
        kind: 'item',
        localId,
        label: known?.name ?? `${formatCategory(category)} #${localId}`,
        category,
        children: [],
        parent,
        geomIds: geometryIds.has(localId) ? [localId] : [],
      }
      for (const child of children) item.children.push(...convert(child, null, item))
      item.children = mergeGroups(item.children)
      for (const child of item.children) append(item.geomIds, child.geomIds)
      return [item]
    }

    if (node.category) {
      const group: TreeNode = {
        key: nextKey(),
        modelId,
        kind: 'group',
        localId: null,
        label: pluralCategory(node.category),
        category: node.category,
        children: [],
        parent,
        geomIds: [],
      }
      for (const child of children) group.children.push(...convert(child, node.category, group))
      // Single elements and spatial containers (storeys…) are listed directly.
      if (group.children.length === 1 || isSpatialCategory(node.category)) {
        for (const child of group.children) child.parent = parent
        return group.children
      }
      for (const child of group.children) append(group.geomIds, child.geomIds)
      return group.children.length > 0 ? [group] : []
    }

    // Anonymous wrapper: pass its children straight through.
    return children.flatMap(child => convert(child, inherited, parent))
  }

  const root: TreeNode = {
    key: nextKey(),
    modelId,
    kind: 'model',
    localId: null,
    label: fileName,
    category: null,
    children: [],
    parent: null,
    geomIds: [],
  }
  root.children = convert(raw, null, root)
  for (const child of root.children) append(root.geomIds, child.geomIds)
  return root
}

/** Finds the tree row that represents an element. */
export function findNode(root: TreeNode, localId: number): TreeNode | null {
  const stack = [root]
  while (stack.length > 0) {
    const node = stack.pop()!
    if (node.localId === localId) return node
    for (const child of node.children) stack.push(child)
  }
  return null
}
