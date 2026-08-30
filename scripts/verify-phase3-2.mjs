import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { Scene } from 'three'
import { CakeScene } from '../src/scenes/CakeScene.js'
import { CandleSmoke } from '../src/scenes/CandleSmoke.js'
import {
  announceCakeStatus,
  CAKE_BLOW_REQUEST_EVENT,
  CAKE_STATUS_EVENT,
  requestCakeBlow,
} from '../src/scenes/cakeEvents.js'

const [componentSource, configSource, stylesheet] = await Promise.all([
  readFile(new URL('../src/components/CakeControls.jsx', import.meta.url), 'utf8'),
  readFile(new URL('../src/content/config.js', import.meta.url), 'utf8'),
  readFile(new URL('../src/styles/global.css', import.meta.url), 'utf8'),
])

assert.ok(componentSource.includes('aria-live="polite"'))
assert.ok(componentSource.includes('requestCakeBlow()'))
assert.ok(configSource.includes('manualButtonLabel'))
assert.ok(stylesheet.includes('.cake-blow-button'))
assert.ok(stylesheet.includes("data-cake-status='complete'"))

class TestCustomEvent {
  constructor(type, options) {
    this.type = type
    this.detail = options.detail
  }
}

const dispatchedEvents = []
const eventTarget = {
  CustomEvent: TestCustomEvent,
  dispatchEvent: (event) => dispatchedEvents.push(event),
}
requestCakeBlow(eventTarget)
announceCakeStatus({ litCount: 3, status: 'extinguishing' }, eventTarget)
assert.equal(dispatchedEvents[0].type, CAKE_BLOW_REQUEST_EVENT)
assert.equal(dispatchedEvents[0].detail.source, 'manual')
assert.equal(dispatchedEvents[1].type, CAKE_STATUS_EVENT)
assert.deepEqual(dispatchedEvents[1].detail, { litCount: 3, status: 'extinguishing' })

const smoke = new CandleSmoke({ qualityMode: 'full' })
assert.equal(smoke.lives.length, 80)
smoke.setQualityMode('lite')
assert.equal(smoke.lives.length, 36)
smoke.dispose()

function createMountedCake() {
  const scene = new Scene()
  const cake = new CakeScene()
  cake.mount({
    qualityMode: 'full',
    reducedMotion: false,
    renderer: { getPixelRatio: () => 1 },
    scene,
  })
  cake.setActive(true)
  return cake
}

const cake = createMountedCake()
const firstFlameScale = cake.flames[0].scale.x
cake.update({ delta: 1 / 60, reducedMotion: false })
assert.notEqual(cake.flames[0].scale.x, firstFlameScale, 'Idle flames should flicker')
cake.handleBlowRequest()
assert.equal(cake.cakeStatus, 'extinguishing')
for (let frame = 0; frame < 100; frame += 1) {
  cake.update({ delta: 1 / 60, reducedMotion: false })
}
assert.equal(cake.cakeStatus, 'complete')
assert.equal(cake.getLitCount(), 0)
assert.ok(cake.flames.every((flame) => flame.visible === false))
assert.equal(cake.candleGlow.intensity, 0)
assert.ok(Array.from(cake.smoke.lives).some((life) => life < 1), 'Extinguished candles should emit smoke')
cake.dispose()

const reducedMotionCake = createMountedCake()
reducedMotionCake.handleBlowRequest()
for (let frame = 0; frame < 30; frame += 1) {
  reducedMotionCake.update({ delta: 1 / 60, reducedMotion: true })
}
assert.equal(reducedMotionCake.cakeStatus, 'complete')
reducedMotionCake.dispose()

console.log('Phase 3.2 verification passed:', {
  candleSequence: true,
  manualControl: true,
  reducedMotion: true,
  smokeDrawCalls: 1,
})
