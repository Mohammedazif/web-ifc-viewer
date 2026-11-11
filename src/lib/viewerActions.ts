import * as THREE from 'three'
import * as FRAGS from '@thatopen/fragments'
import * as OBC from '@thatopen/components'
import type { ItemRef, LoadedModel, SectionState, ViewPreset } from '@/types'
import { getEngine } from './fragmentsEngine'
import { clearInfo, dropModelInfo, fetchInfo, getCachedInfo } from './itemInfo'
import { buildSpatialTree } from './spatialTree'
import { useModelStore } from '@/store/useModelStore'
import { refKey, toast, useViewerStore } from '@/store/useViewerStore'

/**
 * Everything the UI can ask the 3D viewer to do. Components call these
 * functions and read the resulting state from the stores; none of them touch
 * the engine directly.
 */

const SELECT_MATERIAL: FRAGS.MaterialDefinition = {
  color: new THREE.Color('#3d6df2'),
  renderedFaces: FRAGS.RenderedFaces.TWO,
  opacity: 1,
  transparent: false,
}

const HOVER_MATERIAL: FRAGS.MaterialDefinition = {
  color: new THREE.Color('#9db8ff'),
  renderedFaces: FRAGS.RenderedFaces.TWO,
  opacity: 1,
  transparent: false,
}

// A room is a volume. Drawn solid it fills the glass, so it stays hidden until it is the one picked.
const SPACE_MATERIAL: FRAGS.MaterialDefinition = {
  color: new THREE.Color('#3d6df2'),
  renderedFaces: FRAGS.RenderedFaces.TWO,
  opacity: 0.18,
  transparent: true,
  depthWrite: false,
}

const SPACE_HOVER: FRAGS.MaterialDefinition = {
  color: new THREE.Color('#9db8ff'),
  renderedFaces: FRAGS.RenderedFaces.TWO,
  opacity: 0.12,
  transparent: true,
  depthWrite: false,
}

/** Element ids with geometry, per loaded model. */
const geometryIds = new Map<string, Set<number>>()
/** Room volumes, per loaded model. Hidden until one of them is selected. */
const spaceIds = new Map<string, Set<number>>()
/** Models already handed to the engine, so they are only loaded once. */
const requested = new Set<string>()

// Engine mutations (highlight, visibility) are async; run them one at a time
// so a later request can never be overtaken by an earlier one.
let chain: Promise<unknown> = Promise.resolve()
function enqueue<T>(task: () => Promise<T>): Promise<T> {
  const run = chain.then(task)
  chain = run.catch(err => console.warn('[viewer]', err))
  return run
}

const viewer = () => useViewerStore.getState()
const getModel = (modelId: string) => getEngine()?.fragments.models.list.get(modelId) ?? null

function groupByModel(refs: ItemRef[]) {
  const groups = new Map<string, number[]>()
  for (const ref of refs) {
    const ids = groups.get(ref.modelId)
    if (ids) ids.push(ref.localId)
    else groups.set(ref.modelId, [ref.localId])
  }
  return groups
}

/** Called when the engine is torn down so stale bookkeeping doesn't leak into the next one. */
export function resetEngineState() {
  geometryIds.clear()
  spaceIds.clear()
  requested.clear()
  hoverApplied = null
  clearInfo()
  viewer().set({ selection: [], primary: null, hovered: null, hidden: {}, trees: {}, loadingCount: 0 })
}

function isSpace(ref: ItemRef) {
  return spaceIds.get(ref.modelId)?.has(ref.localId) ?? false
}

function materialFor(ref: ItemRef, selected: boolean) {
  if (!isSpace(ref)) return selected ? SELECT_MATERIAL : HOVER_MATERIAL
  return selected ? SPACE_MATERIAL : SPACE_HOVER
}

/** Rooms that are not selected go back into the hidden set, and the selected room comes out. */
function markSpaceHidden(selected: ItemRef[]) {
  if (spaceIds.size === 0) return
  const chosen = new Set(selected.filter(isSpace).map(refKey))
  const state = viewer()
  const hidden = { ...state.hidden }
  for (const [modelId, ids] of spaceIds) {
    const set = new Set(hidden[modelId])
    for (const id of ids) {
      if (chosen.has(refKey({ modelId, localId: id }))) set.delete(id)
      else set.add(id)
    }
    if (set.size > 0) hidden[modelId] = set
    else delete hidden[modelId]
  }
  state.set({ hidden })
}

async function applySpaceVisibility(selected: ItemRef[]) {
  const chosen = new Map<string, Set<number>>()
  for (const ref of selected) {
    if (!isSpace(ref)) continue
    const ids = chosen.get(ref.modelId) ?? new Set<number>()
    ids.add(ref.localId)
    chosen.set(ref.modelId, ids)
  }
  for (const [modelId, ids] of spaceIds) {
    const model = getModel(modelId)
    if (!model) continue
    const show = chosen.get(modelId)
    const showIds: number[] = []
    const hideIds: number[] = []
    for (const id of ids) {
      if (show?.has(id)) showIds.push(id)
      else hideIds.push(id)
    }
    if (showIds.length) await model.setVisible(showIds, true)
    if (hideIds.length) await model.setVisible(hideIds, false)
  }
}

async function mergedBox(refs: ItemRef[]) {
  const box = new THREE.Box3()
  for (const [modelId, ids] of groupByModel(refs)) {
    const model = getModel(modelId)
    if (!model) continue
    try {
      const merged = await model.getMergedBox(ids)
      if (!merged.isEmpty()) box.union(merged)
    } catch (err) {
      console.warn('Could not measure elements', err)
    }
  }
  return box
}

/* ─── Models ─────────────────────────────────────────────────────────────── */

async function loadModelIntoScene(entry: LoadedModel) {
  const engine = getEngine()
  if (!engine) return
  const { modelId } = entry
  viewer().set({ loadingCount: viewer().loadingCount + 1 })

  try {
    const model = await engine.fragments.load(entry.fragBytes, { modelId })
    if (getEngine() !== engine) return

    // The model may have been removed while it was loading.
    if (!useModelStore.getState().models.some(m => m.modelId === modelId)) {
      await engine.fragments.disposeModel(modelId)
      return
    }

    const rooms = Object.values(await model.getItemsOfCategories([/^IFCSPACE$/i])).flat()
    if (rooms.length) {
      spaceIds.set(modelId, new Set(rooms))
      const state = viewer()
      const hidden = { ...state.hidden }
      hidden[modelId] = new Set([...(hidden[modelId] ?? []), ...rooms])
      state.set({ hidden })
      await model.setVisible(rooms, false)
    }

    model.useCamera(engine.world.camera.three)
    model.getClippingPlanesEvent = () => engine.clipPlanes
    engine.world.scene.three.add(model.object)
    await engine.fragments.update(true)

    geometryIds.set(modelId, new Set(await model.getItemsIdsWithGeometry()))
    useModelStore.getState().markModelLoadedInEngine(modelId)

    const isFirst = engine.fragments.models.list.size === 1
    if (isFirst) void setView('iso', false).then(() => fitAll())
    else void fitAll()
    if (viewer().section.active) updateSection({})

    buildSpatialTree(model, modelId, entry.originalFileName, geometryIds.get(modelId)!)
      .then(tree => {
        if (!getModel(modelId)) return
        viewer().set({ trees: { ...viewer().trees, [modelId]: tree } })
      })
      .catch(err => console.warn('Failed to read spatial structure', err))
  } catch (err: any) {
    console.error('Failed to load model', err)
    toast(`Could not display ${entry.originalFileName}: ${err?.message ?? 'unknown error'}`, 'error')
    requested.delete(modelId)
    useModelStore.getState().removeModel(modelId)
  } finally {
    viewer().set({ loadingCount: Math.max(0, viewer().loadingCount - 1) })
  }
}

/** Pushes every model in the store that the engine hasn't seen yet into the scene. */
export function syncModelsToScene() {
  if (!getEngine()) return
  for (const model of useModelStore.getState().models) {
    if (requested.has(model.modelId)) continue
    requested.add(model.modelId)
    void loadModelIntoScene(model)
  }
}

function forgetModel(modelId: string) {
  const state = viewer()
  const hidden = { ...state.hidden }
  delete hidden[modelId]
  const trees = { ...state.trees }
  delete trees[modelId]
  state.set({
    selection: state.selection.filter(r => r.modelId !== modelId),
    primary: state.primary?.modelId === modelId ? null : state.primary,
    hovered: state.hovered?.modelId === modelId ? null : state.hovered,
    hidden,
    trees,
  })
  if (hoverApplied?.modelId === modelId) hoverApplied = null
  geometryIds.delete(modelId)
  spaceIds.delete(modelId)
  requested.delete(modelId)
  dropModelInfo(modelId)
}

export function removeModel(modelId: string) {
  forgetModel(modelId)
  useModelStore.getState().removeModel(modelId)
  void enqueue(async () => {
    const engine = getEngine()
    if (!engine?.fragments.models.list.get(modelId)) return
    await engine.fragments.disposeModel(modelId)
    if (viewer().section.active) updateSection({})
  })
}

export function clearAllModels() {
  for (const model of useModelStore.getState().models) removeModel(model.modelId)
  updateSection({ active: false })
}

export function setModelVisible(modelId: string, visible: boolean) {
  const model = getModel(modelId)
  if (!model) return
  model.object.visible = visible
  useModelStore.getState().setVisibility(modelId, visible)
  if (!visible) {
    const state = viewer()
    if (state.selection.some(r => r.modelId === modelId)) {
      setSelection(state.selection.filter(r => r.modelId !== modelId))
    }
  }
  void getEngine()?.fragments.update(true)
}

/* ─── Picking ────────────────────────────────────────────────────────────── */

/** Finds the element under a screen position, across all visible models. */
export async function pick(clientX: number, clientY: number): Promise<ItemRef | null> {
  const engine = getEngine()
  if (!engine) return null
  const visibility = useModelStore.getState().modelVisibility
  const data = {
    camera: engine.world.camera.three,
    mouse: new THREE.Vector2(clientX, clientY),
    dom: engine.world.renderer.three.domElement,
  }
  const models = [...engine.fragments.models.list.values()].filter(m => visibility[m.modelId] !== false)
  const hits = await Promise.all(models.map(m => m.raycast(data).catch(() => null)))

  let best: FRAGS.RaycastResult | null = null
  for (const hit of hits) {
    if (hit && (!best || hit.distance < best.distance)) best = hit
  }
  return best ? { modelId: best.fragments.modelId, localId: best.localId } : null
}

/* ─── Selection & hover ──────────────────────────────────────────────────── */

let hoverApplied: ItemRef | null = null

async function syncHighlight(prev: ItemRef[], next: ItemRef[]) {
  const engine = getEngine()
  if (!engine) return
  const nextKeys = new Set(next.map(refKey))
  const prevKeys = new Set(prev.map(refKey))
  const removed = prev.filter(r => !nextKeys.has(refKey(r)))
  const added = next.filter(r => !prevKeys.has(refKey(r)))

  for (const [modelId, ids] of groupByModel(removed)) {
    await getModel(modelId)?.resetHighlight(ids)
  }
  for (const [modelId, ids] of groupByModel(added)) {
    const model = getModel(modelId)
    if (!model) continue
    const rooms = ids.filter(id => spaceIds.get(modelId)?.has(id))
    const rest = ids.filter(id => !spaceIds.get(modelId)?.has(id))
    if (rest.length) await model.highlight(rest, SELECT_MATERIAL)
    if (rooms.length) await model.highlight(rooms, SPACE_MATERIAL)
  }
  // An element that was just deselected may still be under the cursor.
  if (hoverApplied && removed.some(r => refKey(r) === refKey(hoverApplied!))) {
    await getModel(hoverApplied.modelId)?.highlight([hoverApplied.localId], materialFor(hoverApplied, false))
  }
  await engine.fragments.update(true)
}

interface SelectOptions {
  /** Element to show in the properties panel. Defaults to the selection when it is a single element. */
  primary?: ItemRef | null
  /** Scroll the structure tree to the primary element. */
  reveal?: boolean
}

export function setSelection(refs: ItemRef[], options: SelectOptions = {}) {
  const state = viewer()
  const prev = state.selection
  const seen = new Set<string>()
  const next = refs.filter(ref => {
    const key = refKey(ref)
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
  const primary = options.primary !== undefined ? options.primary : next.length === 1 ? next[0] : null
  state.set({
    selection: next,
    primary,
    revealNonce: options.reveal ? state.revealNonce + 1 : state.revealNonce,
  })
  const room = primary && isSpace(primary) ? primary : null
  if (spaceIds.size > 0) markSpaceHidden(next)
  void enqueue(async () => {
    if (spaceIds.size > 0) await applySpaceVisibility(room ? [...next, room] : next)
    await syncHighlight(prev, next)
    if (room) await fitBox(await mergedBox([room]), true, 1.4)
  })
}

export function toggleInSelection(ref: ItemRef) {
  const { selection } = viewer()
  const key = refKey(ref)
  const exists = selection.some(r => refKey(r) === key)
  setSelection(exists ? selection.filter(r => refKey(r) !== key) : [...selection, ref], { reveal: !exists })
}

export const clearSelection = () => {
  if (viewer().selection.length > 0 || viewer().primary) setSelection([], { primary: null })
}

export function setHover(ref: ItemRef | null) {
  const prev = hoverApplied
  if ((prev && ref && refKey(prev) === refKey(ref)) || (!prev && !ref)) return
  hoverApplied = ref

  if (!ref) {
    viewer().set({ hovered: null })
  } else {
    const info = getCachedInfo(ref)
    viewer().set({ hovered: { ...ref, name: info?.name ?? null, category: info?.category ?? null } })
    if (!info) {
      void fetchInfo(ref).then(fetched => {
        if (!fetched || !hoverApplied || refKey(hoverApplied) !== refKey(ref)) return
        viewer().set({ hovered: { ...ref, ...fetched } })
      })
    }
  }

  void enqueue(async () => {
    const engine = getEngine()
    if (!engine) return
    const selected = new Set(viewer().selection.map(refKey))
    if (prev && !selected.has(refKey(prev))) {
      await getModel(prev.modelId)?.resetHighlight([prev.localId])
    }
    if (ref && !selected.has(refKey(ref))) {
      await getModel(ref.modelId)?.highlight([ref.localId], materialFor(ref, false))
    }
    await engine.fragments.update(true)
  })
}

/* ─── Element visibility ─────────────────────────────────────────────────── */

export function setItemsVisible(modelId: string, localIds: number[], visible: boolean) {
  if (localIds.length === 0) return
  const state = viewer()
  const set = new Set(state.hidden[modelId])
  for (const id of localIds) {
    if (visible) set.delete(id)
    else set.add(id)
  }
  const hidden = { ...state.hidden }
  if (set.size > 0) hidden[modelId] = set
  else delete hidden[modelId]
  state.set({ hidden })

  if (!visible) {
    const gone = new Set(localIds)
    const remaining = state.selection.filter(r => r.modelId !== modelId || !gone.has(r.localId))
    if (remaining.length !== state.selection.length) setSelection(remaining, { primary: null })
  }

  void enqueue(async () => {
    await getModel(modelId)?.setVisible(localIds, visible)
    await getEngine()?.fragments.update(true)
  })
}

export function hideSelection() {
  const { selection } = viewer()
  if (selection.length === 0) return
  for (const [modelId, ids] of groupByModel(selection)) setItemsVisible(modelId, ids, false)
}

/** Hides everything except the given elements. */
export function isolate(refs: ItemRef[]) {
  const engine = getEngine()
  if (!engine || refs.length === 0) return
  const keep = groupByModel(refs)
  const hidden: Record<string, Set<number>> = {}
  for (const [modelId, all] of geometryIds) {
    const set = new Set(all)
    for (const id of keep.get(modelId) ?? []) set.delete(id)
    if (set.size > 0) hidden[modelId] = set
  }
  viewer().set({ hidden })

  void enqueue(async () => {
    for (const model of engine.fragments.models.list.values()) {
      const ids = keep.get(model.modelId)
      await model.setVisible(undefined, false)
      if (ids?.length) await model.setVisible(ids, true)
    }
    await engine.fragments.update(true)
  })
}

export const isolateSelection = () => isolate(viewer().selection)

export function showAll() {
  const engine = getEngine()
  if (!engine) return
  const selected = viewer().selection
  viewer().set({ hidden: {} })
  markSpaceHidden(selected)
  void enqueue(async () => {
    for (const model of engine.fragments.models.list.values()) await model.resetVisible()
    await applySpaceVisibility(selected)
    await engine.fragments.update(true)
  })
}

/* ─── Camera ─────────────────────────────────────────────────────────────── */

function sceneBox() {
  const box = new THREE.Box3()
  const engine = getEngine()
  if (!engine) return box
  const visibility = useModelStore.getState().modelVisibility
  for (const model of engine.fragments.models.list.values()) {
    if (visibility[model.modelId] === false) continue
    const modelBox = model.box
    if (modelBox && !modelBox.isEmpty()) box.union(modelBox)
  }
  return box
}

async function fitBox(box: THREE.Box3, animate = true, padding = 1) {
  const engine = getEngine()
  if (!engine || box.isEmpty()) return
  const sphere = box.getBoundingSphere(new THREE.Sphere())
  sphere.radius = Math.max(sphere.radius * padding, 0.5)
  await engine.world.camera.controls.fitToSphere(sphere, animate)
}

export const fitAll = (animate = true) => fitBox(sceneBox(), animate)

export async function focusItems(refs: ItemRef[]) {
  if (refs.length === 0) return
  const rooms = refs.filter(isSpace)
  if (rooms.length) {
    const state = viewer()
    const hidden = { ...state.hidden }
    for (const ref of rooms) {
      const set = new Set(hidden[ref.modelId])
      set.delete(ref.localId)
      if (set.size > 0) hidden[ref.modelId] = set
      else delete hidden[ref.modelId]
    }
    state.set({ hidden })
  }
  return enqueue(async () => {
    for (const [modelId, ids] of groupByModel(rooms)) {
      await getModel(modelId)?.setVisible(ids, true)
    }
    await fitBox(await mergedBox(refs), true, 1.4)
    await getEngine()?.fragments.update(true)
  })
}

/** Zooms to the selection, or to the whole scene when nothing is selected. */
export const fitSelectionOrAll = () => {
  const { selection } = viewer()
  return selection.length > 0 ? focusItems(selection) : fitAll()
}

export function focusModel(modelId: string) {
  const box = getModel(modelId)?.box
  if (box) void fitBox(box.clone())
}

const VIEWS: Record<ViewPreset, [azimuth: number, polar: number]> = {
  iso: [Math.PI / 4, Math.PI / 3],
  top: [0, 0],
  front: [0, Math.PI / 2],
  back: [Math.PI, Math.PI / 2],
  left: [-Math.PI / 2, Math.PI / 2],
  right: [Math.PI / 2, Math.PI / 2],
}

export async function setView(preset: ViewPreset, animate = true) {
  const engine = getEngine()
  if (!engine) return
  const controls = engine.world.camera.controls
  const [azimuth, polar] = VIEWS[preset]
  controls.normalizeRotations()
  const box = sceneBox()
  await Promise.all([controls.rotateTo(azimuth, polar, animate), fitBox(box, animate)])
}

export async function toggleProjection() {
  const engine = getEngine()
  if (!engine) return
  await engine.world.camera.projection.toggle()
  viewer().set({ projection: engine.world.camera.projection.current })
}

/* ─── Display ────────────────────────────────────────────────────────────── */

export function setGridVisible(visible: boolean) {
  const engine = getEngine()
  if (!engine) return
  for (const grid of engine.components.get(OBC.Grids).list.values()) grid.visible = visible
  viewer().set({ gridVisible: visible })
}

/** Moves, flips or switches off the section plane that cuts through all models. */
export function updateSection(patch: Partial<SectionState>) {
  const section = { ...viewer().section, ...patch }
  viewer().set({ section })
  const engine = getEngine()
  if (!engine) return

  engine.clipPlanes.length = 0
  const box = sceneBox()
  if (section.active && !box.isEmpty()) {
    const index = { x: 0, y: 1, z: 2 }[section.axis]
    const min = box.min.getComponent(index)
    const max = box.max.getComponent(index)
    const pad = (max - min) * 0.01
    const value = min - pad + (max - min + pad * 2) * section.position
    // A plane keeps the side where normal·p + constant >= 0.
    const normal = new THREE.Vector3().setComponent(index, section.flipped ? 1 : -1)
    engine.clipPlanes.push(new THREE.Plane(normal, section.flipped ? -value : value))
  }
  void engine.fragments.update(true)
}
