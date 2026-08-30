import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { Scene, Vector3 } from 'three'
import { CakeFairyCelebration } from '../src/scenes/CakeFairyCelebration.js'
import { CakeScene } from '../src/scenes/CakeScene.js'
import { CelebrationConfetti } from '../src/scenes/CelebrationConfetti.js'
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
assert.ok(componentSource.includes('cake-celebration-fallback'))
assert.ok(configSource.includes("resetButtonLabel: 'Thử lại nghi thức'"))
assert.ok(stylesheet.includes('@keyframes fallback-confetti'))

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

const confetti = new CelebrationConfetti({ qualityMode: 'full' })
assert.equal(confetti.mesh.count, 180)
confetti.burst(new Vector3(0, 1, 0))
assert.equal(confetti.mesh.visible, true)
assert.equal(confetti.lives[0], 0)
confetti.update(1 / 60, false)
assert.ok(confetti.positions[1] > 1)
confetti.setQualityMode('lite')
assert.equal(confetti.mesh.count, 72)
confetti.reset()
assert.equal(confetti.mesh.visible, false)
confetti.dispose()

const celebration = new CakeFairyCelebration()
celebration.celebrate()
assert.equal(celebration.active, true)
assert.equal(celebration.group.visible, true)
celebration.update(0.5, false)
assert.ok(celebration.group.scale.x > 0)
assert.notEqual(
  celebration.fairy.parts.wandArm.rotation.z,
  celebration.wandRestRotation,
  'Fairy should wave her wand during celebration',
)
celebration.reset()
assert.equal(celebration.group.visible, false)
celebration.dispose()

const scene = new Scene()
const cake = new CakeScene()
cake.mount({
  qualityMode: 'full',
  reducedMotion: false,
  renderer: { getPixelRatio: () => 1 },
  scene,
})
cake.setActive(true)
cake.cakeStatus = 'complete'
cake.flames.forEach((flame) => {
  flame.visible = false
  flame.userData.isLit = false
})
cake.handleWishRequest({ detail: { wish: 'Bình an' } })
assert.equal(cake.confetti.mesh.visible, true)
assert.equal(cake.fairyCelebration.active, true)
assert.equal(cake.wishStar.active, true)

cake.handleResetRequest()
assert.equal(cake.cakeStatus, 'idle')
assert.equal(cake.getLitCount(), 5)
assert.ok(cake.flames.every((flame) => flame.visible))
assert.equal(cake.confetti.mesh.visible, false)
assert.equal(cake.fairyCelebration.group.visible, false)
assert.equal(cake.wishStar.group.visible, false)
cake.dispose()

console.log('Phase 3.6 verification passed:', {
  confettiDrawCalls: 1,
  fairyCelebration: true,
  fullParticles: 180,
  liteParticles: 72,
  ritualReset: true,
})
