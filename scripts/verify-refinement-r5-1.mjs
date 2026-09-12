import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import {
  PerspectiveCamera,
  Scene,
  Vector2,
  Vector3,
} from 'three'
import {
  JOURNEY_ANCHOR_IDS,
  JourneyAnchorRegistry,
} from '../src/core/JourneyAnchorRegistry.js'
import { CakeScene } from '../src/scenes/CakeScene.js'
import { HeroScene } from '../src/scenes/HeroScene.js'

const [managerSource, wishSource] = await Promise.all([
  readFile(new URL('../src/core/SceneManager.js', import.meta.url), 'utf8'),
  readFile(new URL('../src/components/WishInput.jsx', import.meta.url), 'utf8'),
])
assert.ok(managerSource.includes('new JourneyAnchorRegistry'))
assert.ok(managerSource.includes('journeyAnchors: this.journeyAnchors'))
assert.ok(managerSource.includes('this.journeyAnchors.dispose()'))
assert.ok(wishSource.includes('data-journey-anchor="wish-source"'))

let canvasRect = { height: 600, left: 100, top: 50, width: 800 }
const canvas = { getBoundingClientRect: () => canvasRect }
const camera = new PerspectiveCamera(45, canvasRect.width / canvasRect.height, 0.1, 100)
camera.position.set(0, 0, 5)
camera.updateProjectionMatrix()
camera.updateMatrixWorld()

const registry = new JourneyAnchorRegistry({ camera, canvas })
const centerWorld = new Vector3(0, 0, 0)
registry.registerWorldAnchor('center', (target) => target.copy(centerWorld))
assert.deepEqual(registry.getClientPosition('center', new Vector2()).toArray(), [500, 350])
assert.deepEqual(registry.clientToNdc(new Vector2(500, 350), new Vector2()).toArray(), [0, 0])
assert.deepEqual(registry.ndcToClient(new Vector2(0, 0), new Vector2()).toArray(), [500, 350])

const projected = registry.worldToClient(new Vector3(0.7, -0.45, 0), new Vector2())
const roundTrip = registry.clientToWorld(projected, new Vector3(), { planeZ: 0 })
assert.ok(roundTrip.distanceTo(new Vector3(0.7, -0.45, 0)) < 1e-9)

let sourceRect = { height: 90, left: 240, top: 180, width: 320 }
const sourceElement = { getBoundingClientRect: () => sourceRect }
const staleCleanup = registry.registerDomAnchor('replaceable', sourceElement)
const liveCleanup = registry.registerDomAnchor('replaceable', () => sourceElement)
staleCleanup()
assert.equal(registry.has('replaceable'), true)
liveCleanup()
assert.equal(registry.has('replaceable'), false)

const cakeBeforeMount = new CakeScene()
const heroBeforeMount = new HeroScene()
assert.equal(cakeBeforeMount.getTopperWorldPosition(new Vector3()), null)
assert.equal(heroBeforeMount.getWandWorldPosition(new Vector3()), null)

const originalDocument = globalThis.document
globalThis.document = {
  querySelector: (selector) => selector === '[data-journey-anchor="wish-source"]' ? sourceElement : null,
}

try {
  const scene = new Scene()
  const renderer = {
    domElement: canvas,
    getPixelRatio: () => 2,
  }
  const context = {
    camera,
    journeyAnchors: registry,
    qualityMode: 'full',
    reducedMotion: false,
    renderer,
    scene,
  }
  const cake = new CakeScene()
  const hero = new HeroScene()
  cake.mount(context)
  hero.mount(context)
  cake.resize({ height: 600, width: 800 })
  hero.resize({ height: 600, width: 800 })

  for (const id of Object.values(JOURNEY_ANCHOR_IDS)) assert.equal(registry.has(id), true)

  const sourceClient = registry.getClientPosition(JOURNEY_ANCHOR_IDS.WISH_SOURCE, new Vector2())
  assert.deepEqual(sourceClient.toArray(), [400, 225])
  const sourceWorld = registry.getWorldPosition(
    JOURNEY_ANCHOR_IDS.WISH_SOURCE,
    new Vector3(),
    { planeZ: 0.25 },
  )
  assert.ok(sourceWorld && Math.abs(sourceWorld.z - 0.25) < 1e-9)
  assert.ok(registry.worldToClient(sourceWorld, new Vector2()).distanceTo(sourceClient) < 1e-8)

  cake.setActive(false)
  hero.setActive(false)
  const topperWorld = registry.getWorldPosition(JOURNEY_ANCHOR_IDS.CAKE_TOPPER, new Vector3())
  const wandWorld = registry.getWorldPosition(JOURNEY_ANCHOR_IDS.HERO_WAND_TIP, new Vector3())
  assert.ok(topperWorld && wandWorld)
  assert.ok(registry.getClientPosition(JOURNEY_ANCHOR_IDS.CAKE_TOPPER, new Vector2()))
  assert.ok(registry.getClientPosition(JOURNEY_ANCHOR_IDS.HERO_WAND_TIP, new Vector2()))

  const wandBefore = wandWorld.clone()
  hero.mascot.group.position.x += 0.37
  const wandAfter = registry.getWorldPosition(JOURNEY_ANCHOR_IDS.HERO_WAND_TIP, new Vector3())
  assert.ok(wandAfter.distanceTo(wandBefore) > 0.3)

  canvasRect = { height: 720, left: 37, top: 91, width: 1280 }
  camera.aspect = canvasRect.width / canvasRect.height
  camera.updateProjectionMatrix()
  cake.resize({ height: 720, width: 1280 })
  hero.resize({ height: 720, width: 1280 })
  sourceRect = { height: 120, left: 760, top: 260, width: 410 }

  const resizedSourceClient = registry.getClientPosition(JOURNEY_ANCHOR_IDS.WISH_SOURCE, new Vector2())
  assert.deepEqual(resizedSourceClient.toArray(), [965, 320])
  for (const id of [JOURNEY_ANCHOR_IDS.CAKE_TOPPER, JOURNEY_ANCHOR_IDS.HERO_WAND_TIP]) {
    const world = registry.getWorldPosition(id, new Vector3())
    const client = registry.getClientPosition(id, new Vector2())
    const restored = registry.clientToWorld(client, new Vector3(), { planeZ: world.z })
    assert.ok(restored.distanceTo(world) < 1e-8)
  }

  cake.dispose()
  assert.equal(registry.has(JOURNEY_ANCHOR_IDS.WISH_SOURCE), false)
  assert.equal(registry.has(JOURNEY_ANCHOR_IDS.CAKE_TOPPER), false)
  assert.equal(cake.getTopperWorldPosition(new Vector3()), null)
  assert.equal(registry.has(JOURNEY_ANCHOR_IDS.HERO_WAND_TIP), true)

  hero.dispose()
  assert.equal(registry.has(JOURNEY_ANCHOR_IDS.HERO_WAND_TIP), false)
  assert.equal(hero.getWandWorldPosition(new Vector3()), null)
} finally {
  if (originalDocument === undefined) delete globalThis.document
  else globalThis.document = originalDocument
}

registry.dispose()
assert.equal(registry.has('center'), false)
assert.equal(registry.camera, null)
assert.equal(registry.canvas, null)

console.log('R5.1 passed: three lifecycle-safe anchors and client/NDC/world conversions remain exact across resize and canvas offsets.')
