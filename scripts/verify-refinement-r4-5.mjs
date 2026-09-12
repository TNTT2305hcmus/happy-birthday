import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { PerspectiveCamera, Scene, Vector3 } from 'three'
import { CakeScene } from '../src/scenes/CakeScene.js'

const [controlsSource, eventsSource, stageSource, sceneSource] = await Promise.all([
  readFile(new URL('../src/components/CakeControls.jsx', import.meta.url), 'utf8'),
  readFile(new URL('../src/scenes/cakeEvents.js', import.meta.url), 'utf8'),
  readFile(new URL('../src/components/CakeVisualStage.jsx', import.meta.url), 'utf8'),
  readFile(new URL('../src/scenes/CakeScene.js', import.meta.url), 'utf8'),
])

assert.equal(controlsSource.includes('cake-blow-button'), false)
assert.equal(controlsSource.includes('handleManualBlow'), false)
assert.ok(controlsSource.includes('requestCakeBlow(window, \'microphone\')'))
assert.ok(eventsSource.includes('CAKE_FLAME_POINTER_EVENT'))
assert.ok(stageSource.includes('onPointerUp={handlePointerUp}'))
assert.ok(sceneSource.includes('new Raycaster()'))
assert.ok(sceneSource.includes('removeEventListener(CAKE_FLAME_POINTER_EVENT'))

const viewport = { height: 850, width: 1470 }
const camera = new PerspectiveCamera(45, viewport.width / viewport.height, 0.1, 100)
camera.position.z = 5
camera.updateProjectionMatrix()
camera.updateMatrixWorld()
const canvas = {
  getBoundingClientRect: () => ({ bottom: 850, height: 850, left: 0, right: 1470, top: 0, width: 1470 }),
}

function createCake() {
  const cake = new CakeScene()
  cake.mount({
    camera,
    qualityMode: 'full',
    reducedMotion: false,
    renderer: { domElement: canvas, getPixelRatio: () => 2 },
    scene: new Scene(),
  })
  cake.resize(viewport)
  cake.setActive(true)
  cake.setRevealProgress(1)
  cake.handleInteractionReady({ detail: { isReady: true } })
  return cake
}

function flameClientPoint(cake, index) {
  cake.group.updateMatrixWorld(true)
  const world = cake.flameHitAreas[index].getWorldPosition(new Vector3())
  const projected = world.project(camera)
  return {
    clientX: (projected.x + 1) * viewport.width / 2,
    clientY: (1 - projected.y) * viewport.height / 2,
  }
}

function finishCurrentExtinguish(cake) {
  for (let frame = 0; frame < 45; frame += 1) cake.update({ delta: 1 / 60, reducedMotion: false })
}

const cake = createCake()
const firstPoint = flameClientPoint(cake, 0)
cake.handleInteractionReady({ detail: { isReady: false } })
assert.equal(cake.handleFlamePointer({ detail: { ...firstPoint, pointerId: 1, timeStamp: 1000 } }), false)
cake.handleInteractionReady({ detail: { isReady: true } })
cake.setRevealProgress(0.8)
assert.equal(cake.handleFlamePointer({ detail: { ...firstPoint, pointerId: 1, timeStamp: 1200 } }), false)
cake.setRevealProgress(1)

assert.equal(cake.handleFlamePointer({ detail: { ...firstPoint, pointerId: 1, timeStamp: 1500 } }), true)
assert.equal(cake.handleFlamePointer({ detail: { ...firstPoint, pointerId: 1, timeStamp: 1501 } }), false)
finishCurrentExtinguish(cake)
assert.equal(cake.getLitCount(), 4)
assert.equal(cake.cakeStatus, 'idle')
assert.equal(cake.handleFlamePointer({ detail: { ...firstPoint, pointerId: 1, timeStamp: 2500 } }), false)

for (let index = 1; index < 5; index += 1) {
  const point = flameClientPoint(cake, index)
  assert.equal(cake.handleFlamePointer({ detail: { ...point, pointerId: index + 1, timeStamp: 3000 + index * 500 } }), true)
  finishCurrentExtinguish(cake)
  assert.equal(cake.getLitCount(), 4 - index)
}
assert.equal(cake.cakeStatus, 'complete')
cake.handleResetRequest()
assert.equal(cake.cakeStatus, 'idle')
assert.equal(cake.getLitCount(), 5)
assert.ok(cake.flames.every((flame) => flame.visible && !flame.userData.isExtinguishing))
cake.dispose()
assert.equal(cake.flameHitAreas.length, 0)

const microphoneCake = createCake()
assert.equal(microphoneCake.extinguishFlame(0), true)
finishCurrentExtinguish(microphoneCake)
assert.equal(microphoneCake.getLitCount(), 4)
microphoneCake.handleBlowRequest({ detail: { source: 'microphone' } })
for (let frame = 0; frame < 140; frame += 1) microphoneCake.update({ delta: 1 / 60, reducedMotion: false })
assert.equal(microphoneCake.getLitCount(), 0)
assert.equal(microphoneCake.cakeStatus, 'complete')
microphoneCake.dispose()

console.log('R4.5 passed: per-flame raycast, gesture debounce, partial state, microphone completion, reset and cleanup.')
