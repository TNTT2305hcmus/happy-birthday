import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { PerspectiveCamera, Scene } from 'three'
import { CakeScene } from '../src/scenes/CakeScene.js'
import {
  CAKE_FLAME_ACTIVATE_EVENT,
  requestCakeFlameActivation,
} from '../src/scenes/cakeEvents.js'

const [controlsSource, eventsSource, stageSource, sceneSource, configSource, styleSource] = await Promise.all([
  readFile(new URL('../src/components/CakeControls.jsx', import.meta.url), 'utf8'),
  readFile(new URL('../src/scenes/cakeEvents.js', import.meta.url), 'utf8'),
  readFile(new URL('../src/components/CakeVisualStage.jsx', import.meta.url), 'utf8'),
  readFile(new URL('../src/scenes/CakeScene.js', import.meta.url), 'utf8'),
  readFile(new URL('../src/content/config.js', import.meta.url), 'utf8'),
  readFile(new URL('../src/styles/cake-r41.css', import.meta.url), 'utf8'),
])

assert.ok(eventsSource.includes('CAKE_FLAME_ACTIVATE_EVENT'))
assert.ok(stageSource.includes('type="button"'))
assert.ok(stageSource.includes('disabled={controlsLocked || !isLit}'))
assert.ok(stageSource.includes("requestCakeFlameActivation(index"))
assert.equal(stageSource.includes('aria-hidden="true"\n      data-candle-interaction'), false)
assert.ok(sceneSource.includes('handleFlameActivation'))
assert.ok(sceneSource.includes('removeEventListener(CAKE_FLAME_ACTIVATE_EVENT'))
assert.ok(configSource.includes('candleLitLabel'))
assert.ok(configSource.includes('candleOutLabel'))
assert.ok(configSource.includes('micFallbackInteractionHint'))
assert.ok(controlsSource.includes('copy.micFallbackInteractionHint'))
assert.ok(styleSource.includes('.cake-keyboard-candle:focus-visible'))
assert.ok(styleSource.includes("html[data-webgl='unavailable'] .cake-keyboard-candles"))

class DetailEvent extends Event {
  constructor(type, init) {
    super(type)
    this.detail = init.detail
  }
}
const target = new EventTarget()
target.CustomEvent = DetailEvent
let activation = null
target.addEventListener(CAKE_FLAME_ACTIVATE_EVENT, ({ detail }) => { activation = detail })
requestCakeFlameActivation(3, 'keyboard', target)
assert.deepEqual(activation, { index: 3, source: 'keyboard' })

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

assert.equal(cake.handleFlameActivation({ detail: { index: 2, source: 'keyboard' } }), false)
cake.handleInteractionReady({ detail: { isReady: true } })
cake.setRevealProgress(0.9)
assert.equal(cake.handleFlameActivation({ detail: { index: 2, source: 'keyboard' } }), false)
cake.setRevealProgress(1)
assert.equal(cake.handleFlameActivation({ detail: { index: -1, source: 'keyboard' } }), false)
assert.equal(cake.handleFlameActivation({ detail: { index: 5, source: 'keyboard' } }), false)
assert.equal(cake.handleFlameActivation({ detail: { index: 2, source: 'keyboard' } }), true)
assert.equal(cake.handleFlameActivation({ detail: { index: 2, source: 'keyboard' } }), false)
for (let frame = 0; frame < 45; frame += 1) cake.update({ delta: 1 / 60, reducedMotion: false })
assert.equal(cake.getLitCount(), 4)
assert.equal(cake.flames[2].userData.extinguishSource, 'keyboard')

for (const index of [4, 0, 3, 1]) {
  assert.equal(cake.handleFlameActivation({ detail: { index, source: 'keyboard' } }), true)
  for (let frame = 0; frame < 45; frame += 1) cake.update({ delta: 1 / 60, reducedMotion: false })
}
assert.equal(cake.cakeStatus, 'complete')
assert.equal(cake.getLitCount(), 0)
cake.handleResetRequest()
assert.equal(cake.cakeStatus, 'idle')
assert.equal(cake.getLitCount(), 5)
cake.dispose()
assert.equal(cake.flameHitAreas.length, 0)

console.log('R4.6 passed: indexed activation, keyboard semantics, fallback controls, mic guidance, reset and cleanup.')
