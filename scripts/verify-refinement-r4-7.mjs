import assert from 'node:assert/strict'
import { access, readFile } from 'node:fs/promises'
import { PerspectiveCamera, Scene } from 'three'
import { CakeScene } from '../src/scenes/CakeScene.js'
import {
  CAKE_RESET_REQUEST_EVENT,
  requestCakeReset,
} from '../src/scenes/cakeEvents.js'

const [controlsSource, sceneSource, stylesheet, packageSource] = await Promise.all([
  readFile(new URL('../src/components/CakeControls.jsx', import.meta.url), 'utf8'),
  readFile(new URL('../src/scenes/CakeScene.js', import.meta.url), 'utf8'),
  readFile(new URL('../src/styles/global.css', import.meta.url), 'utf8'),
  readFile(new URL('../package.json', import.meta.url), 'utf8'),
])

for (const removedName of ['CelebrationConfetti', 'CakeFairyCelebration', 'cake-celebration-confetti', 'cake-fairy-celebration']) {
  assert.equal(sceneSource.includes(removedName), false, removedName + ' must leave the Cake dependency graph')
}
assert.equal(controlsSource.includes('cake-celebration-fallback'), false)
assert.equal(stylesheet.includes('cake-celebration-fallback'), false)
assert.equal(stylesheet.includes('fallback-confetti'), false)
assert.equal(stylesheet.includes('fallback-celebration-star'), false)
assert.ok(controlsSource.includes('data-celebrating={wishReleased}'))
assert.ok(controlsSource.includes('requestCakeReset()'))
assert.ok(packageSource.includes('"verify:refinement-r4.7"'))

for (const modulePath of [
  new URL('../src/scenes/CelebrationConfetti.js', import.meta.url),
  new URL('../src/scenes/CakeFairyCelebration.js', import.meta.url),
]) {
  await assert.rejects(access(modulePath))
}

class DetailEvent extends Event {
  constructor(type, init = {}) {
    super(type)
    this.detail = init.detail
  }
}
const originalWindow = globalThis.window
const target = new EventTarget()
target.CustomEvent = DetailEvent
globalThis.window = target

try {
  const viewport = { height: 850, width: 1470 }
  const camera = new PerspectiveCamera(45, viewport.width / viewport.height, 0.1, 100)
  camera.position.z = 5
  camera.updateProjectionMatrix()
  camera.updateMatrixWorld()

  const cake = new CakeScene()
  cake.mount({
    camera,
    qualityMode: 'full',
    reducedMotion: false,
    renderer: {
      domElement: { getBoundingClientRect: () => ({ height: 850, left: 0, top: 0, width: 1470 }) },
      getPixelRatio: () => 2,
    },
    scene: new Scene(),
  })
  cake.resize(viewport)
  cake.setActive(true)
  cake.setRevealProgress(1)
  cake.handleInteractionReady({ detail: { isReady: true } })

  cake.flames.forEach((flame) => {
    flame.visible = false
    flame.userData.isLit = false
    flame.userData.isExtinguishing = false
  })
  cake.cakeStatus = 'complete'
  cake.handleWishRequest({ detail: { wish: 'Bình an và hạnh phúc' } })
  assert.equal(cake.wishConvergence.active, true)
  assert.equal(cake.group.getObjectByName('cake-celebration-confetti'), undefined)
  assert.equal(cake.group.getObjectByName('cake-fairy-celebration'), undefined)

  requestCakeReset(target)
  assert.equal(cake.cakeStatus, 'idle')
  assert.equal(cake.getLitCount(), 5)
  assert.equal(cake.wishConvergence.active, false)
  assert.ok(cake.flames.every((flame) => flame.visible && !flame.userData.isExtinguishing))

  cake.setQualityMode('lite')
  assert.equal(cake.qualityMode, 'lite')
  cake.dispose()
  assert.equal(cake.flameHitAreas.length, 0)
  assert.equal(cake.context, null)
  assert.equal(cake.group.children.length, 0)

  cake.cakeStatus = 'complete'
  target.dispatchEvent(new DetailEvent(CAKE_RESET_REQUEST_EVENT, { detail: { source: 'leak-check' } }))
  assert.equal(cake.cakeStatus, 'complete', 'dispose must remove reset listeners')
} finally {
  if (originalWindow === undefined) delete globalThis.window
  else globalThis.window = originalWindow
}

console.log('R4.7 passed: legacy celebration assets are absent; wish release, reset and lifecycle cleanup remain intact.')
