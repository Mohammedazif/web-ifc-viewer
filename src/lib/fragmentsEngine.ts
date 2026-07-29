import * as FRAGS from '@thatopen/fragments'
import * as OBC from '@thatopen/components'

export interface FragmentsEngine {
  fragments: FRAGS.FragmentsModels
  world: any
  components: OBC.Components
  dispose: () => Promise<void>
}

export async function initFragmentsEngine(
  container: HTMLDivElement
): Promise<FragmentsEngine> {
  const components = new OBC.Components()
  const worlds = components.get(OBC.Worlds)

  const world = worlds.create<
    OBC.SimpleScene,
    OBC.SimpleCamera,
    OBC.SimpleRenderer
  >()

  world.scene = new OBC.SimpleScene(components)
  world.scene.setup()
  world.scene.three.background = null

  world.renderer = new OBC.SimpleRenderer(components, container)
  world.camera = new OBC.SimpleCamera(components)
  world.camera.controls.setLookAt(50, 30, 50, 0, 0, 0)

  components.init()

  const grids = components.get(OBC.Grids)
  grids.create(world)

  const workerUrl = await FRAGS.FragmentsModels.getWorker()
  const fragments = new FRAGS.FragmentsModels(workerUrl)

  world.camera.controls.addEventListener('update', () => fragments.update())

  // Fix z-fighting between overlapping faces
  fragments.models.materials.list.onItemSet.add(({ value: material }: any) => {
    if (!('isLodMaterial' in material && material.isLodMaterial)) {
      material.polygonOffset = true
      material.polygonOffsetUnits = 1
      material.polygonOffsetFactor = Math.random()
    }
  })

  const dispose = async () => {
    const ids = [...fragments.models.list.values()].map((m: any) => m.modelId)
    await Promise.all(ids.map((id: string) => fragments.disposeModel(id)))
    components.dispose()
  }

  return { fragments, world, components, dispose }
}
