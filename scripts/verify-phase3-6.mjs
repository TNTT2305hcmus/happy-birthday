import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { Scene } from 'three'
import { CakeScene } from '../src/scenes/CakeScene.js'
import {
  CAKE_RESET_REQUEST_EVENT,
  requestCakeReset,
} from '../src/scenes/cakeEvents.js'

const [componentSource, configSource, stylesheet] = await Promise.all([
  readFile(new URL('../src/components/CakeControls.jsx', import.meta.url), 'utf8'),
  readFile(new URL('../src/content/config.js', import.meta.url), 'utf8'),
  readFile(new URL('../src/styles/global.css', import.meta.url), 'utf8'),
])

assert.ok(componentSource.includes('requestCakeReset()'))
assert.ok(componentSource.includes('className="cake-reset-button"'))
assert.equal(componentSource.includes('cake-celebration-fallback'), false)
assert.ok(configSource.includes("resetButtonLabel: 'Thử lại nghi thức'"))
assert.equal(stylesheet.includes('@keyframes fallback-confetti'), false)

class TestCustomEvent {
  constructor(type, options) {
    this.type = type
    this.detail = options.detail
  }
}
const events = []
const eventTarget = {
  CustomEvent: TestCustomEvent,
  dispatchEvent: (event) => events.push(event),
}
requestCakeReset(eventTarget)
assert.equal(events[0].type, CAKE_RESET_REQUEST_EVENT)
assert.equal(events[0].detail.source, 'demo-reset')

const cake = new CakeScene()
cake.mount({
  qualityMode: 'full',
  reducedMotion: false,
  renderer: { getPixelRatio: () => 1 },
  scene: new Scene(),
})
cake.setActive(true)
cake.cakeStatus = 'complete'
cake.flames.forEach((flame) => {
  flame.visible = false
  flame.userData.isLit = false
})
cake.handleWishRequest({ detail: { wish: 'Bình an' } })
assert.equal(cake.wishConvergence.active, true)
assert.equal(cake.group.getObjectByName('cake-celebration-confetti'), undefined)
assert.equal(cake.group.getObjectByName('cake-fairy-celebration'), undefined)

cake.handleResetRequest()
assert.equal(cake.cakeStatus, 'idle')
assert.equal(cake.getLitCount(), 5)
assert.ok(cake.flames.every((flame) => flame.visible))
assert.equal(cake.wishConvergence.points.visible, false)
cake.dispose()

console.log('Phase 3.6 regression passed with R4.7 refinement:', {
  legacyCelebrationRemoved: true,
  ritualReset: true,
  wishRelease: true,
})
