import * as THREE from 'three'
import * as FRAGS from '@thatopen/fragments'
import * as OBC from '@thatopen/components'

export type ViewerWorld = OBC.SimpleWorld<
  OBC.SimpleScene,
  OBC.OrthoPerspectiveCamera,
  OBC.SimpleRenderer
>

export interface FragmentsEngine {
  fragments: FRAGS.FragmentsModels
  world: ViewerWorld
  components: OBC.Components
  container: HTMLDivElement
  /**
   * Clipping planes shared by every model material. Mutate in place so the
   * materials (which hold a reference to this array) pick the change up.
   */
  clipPlanes: THREE.Plane[]
  dispose: () => Promise<void>
}

let current: FragmentsEngine | null = null

/** The live engine, or null while it is still starting up. */
export const getEngine = () => current
export const setEngine = (engine: FragmentsEngine | null) => { current = engine }

export async function initFragmentsEngine(
  container: HTMLDivElement
): Promise<FragmentsEngine> {
  const components = new OBC.Components()
  const worlds = components.get(OBC.Worlds)

  const world = worlds.create<
    OBC.SimpleScene,
    OBC.OrthoPerspectiveCamera,
    OBC.SimpleRenderer
  >()

  world.scene = new OBC.SimpleScene(components)
  world.scene.setup()
  world.scene.three.background = null

  world.renderer = new OBC.SimpleRenderer(components, container)
  world.renderer.three.localClippingEnabled = true

  world.camera = new OBC.OrthoPerspectiveCamera(components)
  world.camera.controls.setLookAt(50, 30, 50, 0, 0, 0)
  world.camera.controls.dollyToCursor = true

  components.init()

  const grids = components.get(OBC.Grids)
  grids.create(world)

  const workerUrl = await FRAGS.FragmentsModels.getWorker()
  const fragments = new FRAGS.FragmentsModels(workerUrl)

  const controls = world.camera.controls
  const onCameraUpdate = () => { fragments.update() }
  const onCameraRest = () => { fragments.update(true) }
  controls.addEventListener('update', onCameraUpdate)
  controls.addEventListener('rest', onCameraRest)

  // Switching between perspective and orthographic swaps the underlying
  // three.js camera, so every model has to be pointed at the new one.
  world.camera.projection.onChanged.add(() => {
    for (const model of fragments.models.list.values()) {
      model.useCamera(world.camera.three)
    }
    fragments.update(true)
  })

  const clipPlanes: THREE.Plane[] = []

  fragments.models.materials.list.onItemSet.add(({ value: material }: any) => {
    material.clippingPlanes = clipPlanes
    // Fix z-fighting between overlapping faces
    if (!('isLodMaterial' in material && material.isLodMaterial)) {
      material.polygonOffset = true
      material.polygonOffsetUnits = 1
      material.polygonOffsetFactor = Math.random()
    }
  })

  const dispose = async () => {
    controls.removeEventListener('update', onCameraUpdate)
    controls.removeEventListener('rest', onCameraRest)
    const ids = [...fragments.models.list.values()].map((m: any) => m.modelId)
    await Promise.all(ids.map((id: string) => fragments.disposeModel(id)))
    components.dispose()
  }

  return { fragments, world, components, container, clipPlanes, dispose }
}
