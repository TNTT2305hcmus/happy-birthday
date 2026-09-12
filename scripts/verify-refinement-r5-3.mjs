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
import {
  WISH_CONVERGENCE_BUDGET,
  WishParticleConvergence,
} from '../src/scenes/WishParticleConvergence.js'

const [cakeSource, convergenceSource, managerSource, eventSource] = await Promise.all([
  readFile(new URL('../src/scenes/CakeScene.js', import.meta.url), 'utf8'),
  readFile(new URL('../src/scenes/WishParticleConvergence.js', import.meta.url), 'utf8'),
  readFile(new URL('../src/core/SceneManager.js', import.meta.url), 'utf8'),
  readFile(new URL('../src/scenes/cakeEvents.js', import.meta.url), 'utf8'),
])

assert.ok(cakeSource.includes("this.wishJourneyStage = 'source-to-topper'"))
assert.ok(cakeSource.includes("this.wishJourneyStage = 'topper-to-wand'"))
assert.ok(cakeSource.includes('JOURNEY_ANCHOR_IDS.HERO_WAND_TIP'))
assert.ok(cakeSource.includes('launchContinuation'))
assert.ok(convergenceSource.includes('launchContinuation({ from, to })'))
assert.ok(eventSource.includes('CAKE_WISH_JOURNEY_EVENT'))
assert.equal(managerSource.includes('new WebGLRenderer'), true)
assert.equal((managerSource.match(/new WebGLRenderer/g) ?? []).length, 1)
assert.equal(cakeSource.includes('requestAnimationFrame'), false)

const resource = new WishParticleConvergence({ pixelRatio: 2, qualityMode: 'full' })
const geometry = resource.geometry
const material = resource.material
const firstStart = new Vector3(-1, -0.5, 0)
const join = new Vector3(0, 1, 0)
const finalTarget = new Vector3(1.5, 1.8, 0.2)
assert.equal(resource.launch({ from: firstStart, to: join, wish: 'seed only' }), true)
for (let frame = 0; frame < 120 && resource.active; frame += 1) resource.update(1 / 60, false)
assert.equal(resource.active, false)
assert.equal(resource.launchContinuation({ from: join, to: finalTarget }), true)
assert.equal(resource.geometry, geometry)
assert.equal(resource.material, material)
assert.equal(resource.geometry.drawRange.count, WISH_CONVERGENCE_BUDGET.particles.full)
for (let index = 0; index < WISH_CONVERGENCE_BUDGET.particles.full; index += 1) {
  assert.ok(new Vector3().fromBufferAttribute(resource.geometry.attributes.position, index).distanceTo(join) < 1e-6)
}
resource.dispose()

let canvasRect = { height: 850, left: 0, top: 0, width: 1470 }
let sourceRect = { height: 100, left: 900, top: 330, width: 420 }
const sourceElement = { getBoundingClientRect: () => sourceRect }
const originalDocument = globalThis.document
globalThis.document = {
  hidden: false,
  querySelector: (selector) => {
    if (selector === '[data-journey-anchor="wish-source"]') return sourceElement
    return null
  },
}

function createContext(qualityMode = 'full', reducedMotion = false) {
  const canvas = { getBoundingClientRect: () => canvasRect }
  const camera = new PerspectiveCamera(45, canvasRect.width / canvasRect.height, 0.1, 100)
  camera.position.z = 5
  camera.updateProjectionMatrix()
  camera.updateMatrixWorld()
  const registry = new JourneyAnchorRegistry({ camera, canvas })
  const scene = new Scene()
  return {
    canvas,
    context: {
      camera,
      journeyAnchors: registry,
      qualityMode,
      reducedMotion,
      renderer: { domElement: canvas, getPixelRatio: () => qualityMode === 'lite' ? 1 : 2 },
      scene,
    },
    registry,
  }
}

function pointWorld(cake, index = 0) {
  return new Vector3().fromBufferAttribute(
    cake.wishConvergence.geometry.attributes.position,
    index,
  )
}

function runJourney({ qualityMode = 'full', reducedMotion = false } = {}) {
  const { context, registry } = createContext(qualityMode, reducedMotion)
  const hero = new HeroScene()
  const cake = new CakeScene()
  hero.mount(context)
  cake.mount(context)
  hero.setActive(false)
  cake.setActive(true)
  cake.setRevealProgress(1)
  cake.cakeStatus = 'complete'

  const geometryBefore = cake.wishConvergence.geometry
  const materialBefore = cake.wishConvergence.material
  cake.handleWishRequest({ detail: { wish: 'Điều ước kiểm thử R5.3' } })
  assert.equal(cake.wishJourneyStage, 'source-to-topper')

  let transitionFrame = -1
  for (let frame = 0; frame < 180; frame += 1) {
    cake.update({ delta: 1 / 60, reducedMotion })
    if (cake.wishJourneyStage === 'topper-to-wand') {
      transitionFrame = frame
      break
    }
  }
  assert.ok(transitionFrame >= 0, 'the topper-to-wand leg must begin')
  assert.equal(cake.wishConvergence.geometry, geometryBefore)
  assert.equal(cake.wishConvergence.material, materialBefore)
  assert.equal(cake.wishConvergence.active, true)

  const topperAtJoin = registry.getWorldPosition(JOURNEY_ANCHOR_IDS.CAKE_TOPPER, new Vector3())
  for (let index = 0; index < cake.wishConvergence.geometry.drawRange.count; index += 1) {
    assert.ok(pointWorld(cake, index).distanceTo(topperAtJoin) < 1e-5, 'all particles must join continuously at the topper')
  }

  for (let frame = 0; frame < (reducedMotion ? 6 : 30); frame += 1) {
    cake.update({ delta: 1 / 60, reducedMotion })
  }
  const beforeRetarget = pointWorld(cake)
  const wandBefore = registry.getClientPosition(JOURNEY_ANCHOR_IDS.HERO_WAND_TIP, new Vector2())
  canvasRect = { height: 720, left: 25, top: 60, width: 1280 }
  sourceRect = { height: 90, left: 780, top: 250, width: 360 }
  context.camera.aspect = canvasRect.width / canvasRect.height
  context.camera.updateProjectionMatrix()
  hero.resize({ height: canvasRect.height, width: canvasRect.width })
  cake.resize({ height: canvasRect.height, width: canvasRect.width })
  const wandAfter = registry.getClientPosition(JOURNEY_ANCHOR_IDS.HERO_WAND_TIP, new Vector2())
  assert.ok(wandAfter.distanceTo(wandBefore) > 1)

  cake.update({ delta: 1 / 120, reducedMotion })
  const afterRetarget = pointWorld(cake)
  assert.ok(afterRetarget.distanceTo(beforeRetarget) < 0.35, 'live retarget must be smooth')

  for (let frame = 0; frame < 240 && cake.wishJourneyStage !== 'complete'; frame += 1) {
    cake.update({ delta: 1 / 60, reducedMotion })
  }
  assert.equal(cake.wishJourneyStage, 'complete')
  assert.equal(cake.wishConvergence.active, false)
  const wandWorld = registry.getWorldPosition(JOURNEY_ANCHOR_IDS.HERO_WAND_TIP, new Vector3())
  for (let index = 0; index < cake.wishConvergence.geometry.drawRange.count; index += 1) {
    assert.ok(pointWorld(cake, index).distanceTo(wandWorld) < 1e-5, 'final endpoint must be the live wand anchor')
  }

  cake.handleResetRequest()
  assert.equal(cake.wishJourneyStage, 'idle')
  assert.equal(cake.wishConvergence.points.visible, false)

  let geometryDisposed = false
  let materialDisposed = false
  geometryBefore.addEventListener('dispose', () => { geometryDisposed = true })
  materialBefore.addEventListener('dispose', () => { materialDisposed = true })
  cake.dispose()
  hero.dispose()
  registry.dispose()
  assert.equal(geometryDisposed, true)
  assert.equal(materialDisposed, true)
  return transitionFrame
}

try {
  const fullTransitionFrame = runJourney()
  canvasRect = { height: 850, left: 0, top: 0, width: 1470 }
  sourceRect = { height: 100, left: 900, top: 330, width: 420 }
  const reducedTransitionFrame = runJourney({ qualityMode: 'lite', reducedMotion: true })
  assert.ok(reducedTransitionFrame < fullTransitionFrame)
} finally {
  if (originalDocument === undefined) delete globalThis.document
  else globalThis.document = originalDocument
}

console.log('R5.3 passed: one reusable draw call continues from the Cake topper to the live Hero wand anchor.')
