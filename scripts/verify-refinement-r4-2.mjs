import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { PerspectiveCamera, Scene } from 'three'
import {
  CAKE_SCENE_REVEAL_END,
  CAKE_SCENE_REVEAL_START,
  calculateSectionSnapshot,
} from '../src/core/sectionSnapshot.js'
import { CakeScene } from '../src/scenes/CakeScene.js'

const layouts = [
  { center: 500, height: 1000, id: 'hero', top: 0 },
  { center: 1500, height: 1000, id: 'cake', top: 1000 },
  { center: 2500, height: 1000, id: 'letter', top: 2000 },
]
const sectionIds = layouts.map(({ id }) => id)
const sample = (segmentProgress, previousScrollY = 0) => calculateSectionSnapshot({
  layouts,
  previousScrollY,
  scrollY: segmentProgress * 1000,
  sectionIds,
  viewportHeight: 1000,
})

assert.equal(CAKE_SCENE_REVEAL_START, 0.65)
assert.equal(CAKE_SCENE_REVEAL_END, 0.8)
const before = sample(0.52)
assert.ok(Math.abs(before.transition.progress - 0.625) < 1e-10)
assert.equal(before.activeSectionId, 'cake', 'Cake DOM should already own interaction at the midpoint')
assert.equal(before.scenePresence.cake, 0, 'Cake model must stay hidden before its reveal threshold')
assert.equal(before.sceneSectionIds.includes('cake'), false)
const revealing = sample(0.532)
assert.ok(revealing.scenePresence.cake > 0 && revealing.scenePresence.cake < 1)
assert.equal(revealing.sceneSectionIds.includes('cake'), true)
const complete = sample(0.548)
assert.ok(Math.abs(complete.scenePresence.cake - 1) < 1e-10)
assert.equal(sample(0.52, 900).scenePresence.cake, 0, 'Reverse scroll must use the same boundary')
assert.equal(sample(0.548, 900).scenePresence.cake, 1)
const deepLink = calculateSectionSnapshot({
  layouts: [layouts[1]], previousScrollY: 0, scrollY: 1000, sectionIds: ['cake'], viewportHeight: 1000,
})
assert.equal(deepLink.scenePresence.cake, 1)
assert.deepEqual(deepLink.sceneSectionIds, ['cake'])

const camera = new PerspectiveCamera(45, 1470 / 850, 0.1, 100)
camera.position.z = 5
const threeScene = new Scene()
const cake = new CakeScene()
cake.mount({ camera, qualityMode: 'full', reducedMotion: false, renderer: { getPixelRatio: () => 1 }, scene: threeScene })
cake.resize({ height: 850, width: 1470 })
cake.setRevealProgress(0)
cake.setActive(true)
assert.equal(cake.group.visible, false)
cake.setRevealProgress(0.5)
assert.equal(cake.group.visible, true)
const partialScale = cake.group.scale.x
cake.setRevealProgress(1)
assert.ok(cake.group.scale.x > partialScale)
cake.context.reducedMotion = true
cake.setRevealProgress(0.5)
const reducedScale = cake.group.scale.x
const reducedY = cake.group.position.y
cake.setRevealProgress(1)
assert.ok(Math.abs(cake.group.scale.x - reducedScale) < 1e-10)
assert.ok(Math.abs(cake.group.position.y - reducedY) < 1e-10)
cake.setActive(false)
assert.equal(cake.group.visible, false)
cake.dispose()

const [managerSource, styleSource] = await Promise.all([
  readFile(new URL('../src/core/SceneManager.js', import.meta.url), 'utf8'),
  readFile(new URL('../src/styles/cake-r41.css', import.meta.url), 'utf8'),
])
assert.match(managerSource, /sceneSectionIds = presentSectionIds/)
assert.match(managerSource, /setRevealProgress/)
assert.match(styleSource, /opacity: var\(--scene-presence, 0\)/)
console.log('R4.2 centralized Cake reveal verification passed', {
  deepLink: deepLink.scenePresence.cake,
  revealWindow: [CAKE_SCENE_REVEAL_START, CAKE_SCENE_REVEAL_END],
  reverseScroll: true,
})