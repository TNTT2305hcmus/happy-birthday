import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import {
  PerspectiveCamera,
  Scene,
  Vector3,
} from 'three'
import {
  JOURNEY_ANCHOR_IDS,
  JourneyAnchorRegistry,
} from '../src/core/JourneyAnchorRegistry.js'
import { CakeScene } from '../src/scenes/CakeScene.js'
import { HeroScene } from '../src/scenes/HeroScene.js'
import {
  announceCakeWishJourney,
  CAKE_WISH_JOURNEY_EVENT,
} from '../src/scenes/cakeEvents.js'
import {
  WISH_CONVERGENCE_BUDGET,
  WISH_CONVERGENCE_TIMING,
} from '../src/scenes/WishParticleConvergence.js'

const [appSource, cakeSource, managerSource, sectionManagerSource] = await Promise.all([
  readFile(new URL('../src/App.jsx', import.meta.url), 'utf8'),
  readFile(new URL('../src/scenes/CakeScene.js', import.meta.url), 'utf8'),
  readFile(new URL('../src/core/SceneManager.js', import.meta.url), 'utf8'),
  readFile(new URL('../src/core/SectionManager.jsx', import.meta.url), 'utf8'),
])

assert.ok(appSource.includes('CAKE_WISH_JOURNEY_EVENT'))
assert.ok(appSource.includes("detail?.stage === 'topper-to-wand'"))
assert.ok(appSource.includes("startAutoScrollToSection('hero'"))
assert.ok(sectionManagerSource.includes('const startAutoScrollToSection = useCallback'))
assert.ok(sectionManagerSource.includes('layout.center - window.innerHeight * 0.5'))
assert.ok(sectionManagerSource.includes("root.dataset.journeyScroll = 'running'"))
assert.ok(sectionManagerSource.includes("root.dataset.journeyScroll = 'complete'"))
assert.ok(sectionManagerSource.includes("root.style.scrollBehavior = 'auto'"))
assert.ok(sectionManagerSource.includes('window.cancelAnimationFrame(autoScroll.frameId)'))
assert.equal(sectionManagerSource.includes("addEventListener('wheel'"), false)
assert.equal(sectionManagerSource.includes("addEventListener('touchstart'"), false)
assert.equal(sectionManagerSource.includes("addEventListener('keydown'"), false)
assert.ok(managerSource.includes('sceneModule.shouldUpdateWhenInactive?.()'))
assert.ok(managerSource.includes('setJourneyTransitionActive(isActive)'))
assert.ok(managerSource.includes('this.journeyTransitionActive ? 1 : maxPixelRatio'))
assert.ok(appSource.includes('setJourneyTransitionActive(true)'))
assert.ok(appSource.includes('setJourneyTransitionActive(false)'))
assert.ok(cakeSource.includes('shouldUpdateWhenInactive()'))
assert.ok(cakeSource.includes('context.scene.add(this.group, this.wishConvergence.points)'))
assert.equal(cakeSource.includes('this.group.add(this.cake, this.wishConvergence.points)'), false)
assert.equal(WISH_CONVERGENCE_BUDGET.drawCalls, 1)
assert.equal(WISH_CONVERGENCE_TIMING.full.travelSeconds, 1.55)
assert.equal(WISH_CONVERGENCE_TIMING.reduced.travelSeconds, 0.52)

let receivedEvent = null
const eventTarget = {
  CustomEvent: class {
    constructor(type, options) {
      this.detail = options.detail
      this.type = type
    }
  },
  dispatchEvent(event) {
    receivedEvent = event
  },
}
assert.equal(announceCakeWishJourney('topper-to-wand', { durationMs: 1550 }, eventTarget), true)
assert.equal(receivedEvent.type, CAKE_WISH_JOURNEY_EVENT)
assert.deepEqual(receivedEvent.detail, { durationMs: 1550, stage: 'topper-to-wand' })

const canvasRect = { height: 850, left: 0, top: 0, width: 1470 }
const sourceRect = { height: 100, left: 900, top: 330, width: 420 }
const sourceElement = { getBoundingClientRect: () => sourceRect }
const originalDocument = globalThis.document
globalThis.document = {
  hidden: false,
  querySelector: (selector) => selector === '[data-journey-anchor="wish-source"]'
    ? sourceElement
    : null,
}

try {
  const canvas = { getBoundingClientRect: () => canvasRect }
  const camera = new PerspectiveCamera(45, canvasRect.width / canvasRect.height, 0.1, 100)
  camera.position.z = 5
  camera.updateProjectionMatrix()
  camera.updateMatrixWorld()
  const registry = new JourneyAnchorRegistry({ camera, canvas })
  const scene = new Scene()
  const context = {
    camera,
    journeyAnchors: registry,
    qualityMode: 'full',
    reducedMotion: false,
    renderer: { domElement: canvas, getPixelRatio: () => 2 },
    scene,
  }
  const hero = new HeroScene()
  const cake = new CakeScene()
  hero.mount(context)
  cake.mount(context)
  hero.setActive(false)
  cake.setActive(true)
  cake.setRevealProgress(1)
  cake.cakeStatus = 'complete'
  cake.handleWishRequest({ detail: { wish: 'Điều ước kiểm thử R5.4' } })

  for (let frame = 0; frame < 180 && cake.wishJourneyStage !== 'topper-to-wand'; frame += 1) {
    cake.update({ delta: 1 / 60, reducedMotion: false })
  }
  assert.equal(cake.wishJourneyStage, 'topper-to-wand')
  assert.equal(cake.wishConvergence.points.parent, scene)

  cake.setActive(false)
  hero.setActive(true)
  assert.equal(cake.group.visible, false)
  assert.equal(hero.group.visible, true)
  assert.equal(cake.shouldUpdateWhenInactive(), true)

  for (let frame = 0; frame < 180 && cake.wishJourneyStage !== 'complete'; frame += 1) {
    assert.equal(cake.shouldUpdateWhenInactive(), true)
    hero.update({ delta: 1 / 60, reducedMotion: false })
    cake.update({ delta: 1 / 60, reducedMotion: false })
  }

  assert.equal(cake.wishJourneyStage, 'complete')
  assert.equal(cake.shouldUpdateWhenInactive(), false)
  assert.equal(cake.wishConvergence.points.visible, false)
  const endpoint = new Vector3().fromBufferAttribute(
    cake.wishConvergence.geometry.attributes.position,
    0,
  )
  const wand = registry.getWorldPosition(JOURNEY_ANCHOR_IDS.HERO_WAND_TIP, new Vector3())
  assert.ok(endpoint.distanceTo(wand) < 1e-5)

  cake.dispose()
  assert.equal(scene.getObjectByName('wish-particle-convergence'), undefined)
  hero.dispose()
  registry.dispose()
} finally {
  if (originalDocument === undefined) delete globalThis.document
  else globalThis.document = originalDocument
}

console.log('R5.4 passed: SectionManager owns timed reverse scroll while the root-scene journey survives Cake deactivation.')
