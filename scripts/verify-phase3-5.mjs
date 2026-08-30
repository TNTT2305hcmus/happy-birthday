import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { Scene } from 'three'
import { CakeScene } from '../src/scenes/CakeScene.js'
import { WishStarFlight } from '../src/scenes/WishStarFlight.js'
import {
  CAKE_WISH_SUBMIT_EVENT,
  requestCakeWish,
} from '../src/scenes/cakeEvents.js'
import { loadWish, normalizeWish, saveWish } from '../src/core/wishStorage.js'

const [componentSource, controlsSource, configSource, stylesheet] = await Promise.all([
  readFile(new URL('../src/components/WishInput.jsx', import.meta.url), 'utf8'),
  readFile(new URL('../src/components/CakeControls.jsx', import.meta.url), 'utf8'),
  readFile(new URL('../src/content/config.js', import.meta.url), 'utf8'),
  readFile(new URL('../src/styles/global.css', import.meta.url), 'utf8'),
])

assert.ok(componentSource.includes('maxLength={copy.maxLength}'))
assert.ok(componentSource.includes('onReady(normalizedWish, wasSaved)'))
assert.ok(controlsSource.includes('requestCakeWish(preparedWishRef.current)'))
assert.ok(controlsSource.indexOf('<WishInput') < controlsSource.indexOf('<div className="cake-status"'))
assert.ok(componentSource.includes('role="status"'))
assert.ok(configSource.includes("storageKey: 'twinkle-birthday:wish'"))
assert.ok(configSource.includes('maxLength: 180'))
assert.ok(stylesheet.includes('@keyframes wish-copy-flight'))

assert.equal(normalizeWish('  Một   điều\nước đẹp  ', 180), 'Một điều ước đẹp')
assert.equal(normalizeWish('123456', 4), '1234')

const storedValues = new Map()
const storage = {
  getItem: (key) => storedValues.get(key) ?? null,
  setItem: (key, value) => storedValues.set(key, value),
}
assert.equal(saveWish({ key: 'wish', storage, value: 'Bình an' }), true)
assert.equal(loadWish({ key: 'wish', storage }), 'Bình an')
assert.equal(saveWish({ key: 'wish', storage: { setItem: () => { throw new Error('blocked') } }, value: 'x' }), false)

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
requestCakeWish('Luôn hạnh phúc', eventTarget)
assert.equal(dispatchedEvents[0].type, CAKE_WISH_SUBMIT_EVENT)
assert.equal(dispatchedEvents[0].detail.wish, 'Luôn hạnh phúc')

const flight = new WishStarFlight()
flight.launch('Một điều ước')
assert.equal(flight.active, true)
assert.equal(flight.group.visible, true)
const launchHeight = flight.group.position.y
flight.update(0.5, false)
assert.ok(flight.group.position.y > launchHeight)
for (let frame = 0; frame < 150; frame += 1) flight.update(1 / 60, false)
assert.equal(flight.active, false)
assert.equal(flight.group.visible, false)
flight.dispose()

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
cake.handleWishRequest({ detail: { wish: 'Cùng nhau thật lâu' } })
assert.equal(cake.wishStar.active, true)
assert.equal(cake.wishStar.wish, 'Cùng nhau thật lâu')
cake.dispose()

console.log('Phase 3.5 verification passed:', {
  localStorage: true,
  normalizedInput: true,
  wishEvent: true,
  wishStarFlight: true,
})
