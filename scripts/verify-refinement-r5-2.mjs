import assert from 'node:assert/strict'
import { access, readFile } from 'node:fs/promises'
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
import {
  WISH_CONVERGENCE_BUDGET,
  WishParticleConvergence,
} from '../src/scenes/WishParticleConvergence.js'

const [cakeSource, componentSource, stylesheet] = await Promise.all([
  readFile(new URL('../src/scenes/CakeScene.js', import.meta.url), 'utf8'),
  readFile(new URL('../src/components/WishInput.jsx', import.meta.url), 'utf8'),
  readFile(new URL('../src/styles/global.css', import.meta.url), 'utf8'),
])
assert.equal(cakeSource.includes('WishStarFlight'), false)
assert.ok(cakeSource.includes('WishParticleConvergence'))
assert.ok(cakeSource.includes('JOURNEY_ANCHOR_IDS.WISH_SOURCE'))
assert.ok(cakeSource.includes('JOURNEY_ANCHOR_IDS.CAKE_TOPPER'))
assert.ok(componentSource.includes('className="wish-dissolve-copy"'))
assert.equal(componentSource.includes('className="wish-flight-copy"'), false)
assert.ok(stylesheet.includes('@keyframes wish-copy-dissolve'))
assert.equal(stylesheet.includes('@keyframes wish-copy-flight'), false)
await assert.rejects(access(new URL('../src/scenes/WishStarFlight.js', import.meta.url)))

const start = new Vector3(1.4, -0.8, 0.2)
const target = new Vector3(-0.35, 1.6, -0.1)
const convergence = new WishParticleConvergence({ pixelRatio: 2, qualityMode: 'full' })
assert.equal(WISH_CONVERGENCE_BUDGET.drawCalls, 1)
assert.equal(convergence.geometry.drawRange.count, WISH_CONVERGENCE_BUDGET.particles.full)
assert.equal(convergence.material.uniforms.uPixelRatio.value, 2)
const geometry = convergence.geometry
const material = convergence.material
assert.equal(convergence.launch({ from: start, to: target, wish: 'Bình an và hạnh phúc' }), true)
assert.equal(convergence.geometry, geometry)
assert.equal(convergence.material, material)

for (let index = 0; index < WISH_CONVERGENCE_BUDGET.particles.full; index += 1) {
  assert.ok(new Vector3().fromBufferAttribute(convergence.geometry.attributes.position, index).distanceTo(start) < 1e-6)
}
convergence.update(0.75, false)
const midpointDistances = []
for (let index = 0; index < WISH_CONVERGENCE_BUDGET.particles.full; index += 1) {
  const point = new Vector3().fromBufferAttribute(convergence.geometry.attributes.position, index)
  midpointDistances.push(point.distanceTo(start))
}
assert.ok(Math.max(...midpointDistances) > 0.5)
assert.ok(new Set(midpointDistances.map((distance) => distance.toFixed(4))).size > 20)

const beforeRetarget = new Vector3().fromBufferAttribute(convergence.geometry.attributes.position, 0)
const retarget = new Vector3(0.8, 1.2, 0.35)
convergence.setAnchors(start, retarget)
convergence.update(1 / 120, false)
const afterRetarget = new Vector3().fromBufferAttribute(convergence.geometry.attributes.position, 0)
assert.ok(afterRetarget.distanceTo(beforeRetarget) < 0.2, 'retarget must be smoothed instead of teleporting')

for (let frame = 0; frame < 150; frame += 1) convergence.update(1 / 60, false)
assert.equal(convergence.active, false)
for (let index = 0; index < WISH_CONVERGENCE_BUDGET.particles.full; index += 1) {
  assert.ok(new Vector3().fromBufferAttribute(convergence.geometry.attributes.position, index).distanceTo(retarget) < 1e-6)
}
convergence.setQualityMode('lite')
assert.equal(convergence.geometry.drawRange.count, WISH_CONVERGENCE_BUDGET.particles.lite)
convergence.launch({ from: start, to: target, wish: 'Ít chuyển động' })
for (let frame = 0; frame < 40; frame += 1) convergence.update(1 / 60, true)
assert.equal(convergence.active, false)
convergence.reset()
assert.equal(convergence.points.visible, false)

let geometryDisposed = false
let materialDisposed = false
geometry.addEventListener('dispose', () => { geometryDisposed = true })
material.addEventListener('dispose', () => { materialDisposed = true })
convergence.dispose()
assert.equal(geometryDisposed, true)
assert.equal(materialDisposed, true)

let canvasRect = { height: 850, left: 0, top: 0, width: 1470 }
let sourceRect = { height: 100, left: 900, top: 330, width: 420 }
const sourceElement = { getBoundingClientRect: () => sourceRect }
const originalDocument = globalThis.document
globalThis.document = {
  querySelector: (selector) => {
    if (selector === '[data-journey-anchor="wish-source"]') return sourceElement
    return null
  },
}

try {
  const canvas = { getBoundingClientRect: () => canvasRect }
  const camera = new PerspectiveCamera(45, canvasRect.width / canvasRect.height, 0.1, 100)
  camera.position.z = 5
  camera.updateProjectionMatrix()
  camera.updateMatrixWorld()
  const registry = new JourneyAnchorRegistry({ camera, canvas })
  const cake = new CakeScene()
  cake.mount({
    camera,
    journeyAnchors: registry,
    qualityMode: 'full',
    reducedMotion: false,
    renderer: { domElement: canvas, getPixelRatio: () => 2 },
    scene: new Scene(),
  })
  cake.resize({ height: canvasRect.height, width: canvasRect.width })
  cake.setActive(true)
  cake.setRevealProgress(1)
  cake.cakeStatus = 'complete'
  cake.handleWishRequest({ detail: { wish: 'Điều ước kiểm thử R5.2' } })
  assert.equal(cake.wishConvergence.active, true)

  const sourceWorld = registry.getWorldPosition(
    JOURNEY_ANCHOR_IDS.WISH_SOURCE,
    new Vector3(),
    { planeZ: registry.getWorldPosition(JOURNEY_ANCHOR_IDS.CAKE_TOPPER, new Vector3()).z },
  )
  const firstWorld = new Vector3().fromBufferAttribute(
    cake.wishConvergence.geometry.attributes.position,
    0,
  )
  assert.ok(firstWorld.distanceTo(sourceWorld) < 1e-5)

  for (let frame = 0; frame < 40; frame += 1) cake.update({ delta: 1 / 60, reducedMotion: false })
  const clientBeforeResize = registry.getClientPosition(JOURNEY_ANCHOR_IDS.CAKE_TOPPER, new Vector2())
  canvasRect = { height: 720, left: 25, top: 60, width: 1280 }
  sourceRect = { height: 90, left: 780, top: 250, width: 360 }
  camera.aspect = canvasRect.width / canvasRect.height
  camera.updateProjectionMatrix()
  cake.resize({ height: canvasRect.height, width: canvasRect.width })
  const clientAfterResize = registry.getClientPosition(JOURNEY_ANCHOR_IDS.CAKE_TOPPER, new Vector2())
  assert.ok(clientAfterResize.distanceTo(clientBeforeResize) > 1)

  for (let frame = 0; frame < 100; frame += 1) {
    cake.update({ delta: 1 / 60, reducedMotion: false })
    if (!cake.wishConvergence.active) break
  }
  assert.equal(cake.wishConvergence.active, false)
  const topperWorld = registry.getWorldPosition(JOURNEY_ANCHOR_IDS.CAKE_TOPPER, new Vector3())
  const finalWorld = new Vector3().fromBufferAttribute(
    cake.wishConvergence.geometry.attributes.position,
    0,
  )
  assert.ok(finalWorld.distanceTo(topperWorld) < 1e-5)

  cake.handleResetRequest()
  assert.equal(cake.wishConvergence.points.visible, false)
  cake.dispose()
  registry.dispose()
} finally {
  if (originalDocument === undefined) delete globalThis.document
  else globalThis.document = originalDocument
}

console.log('R5.2 passed: one-draw-call wish sparkles dissolve from the DOM source and converge on the live Cake topper anchor.')
