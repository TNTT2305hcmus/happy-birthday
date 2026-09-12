import assert from 'node:assert/strict'
import { DoubleSide, PerspectiveCamera, Scene, Vector3 } from 'three'
import { HeroScene, HERO_RESOURCE_BUDGET } from '../src/scenes/HeroScene.js'

const listeners = new Map()
const target = (prefix) => ({
  addEventListener: (name, fn) => listeners.set(`${prefix}:${name}`, fn),
  removeEventListener: (name, fn) => {
    assert.equal(listeners.get(`${prefix}:${name}`), fn)
    listeners.delete(`${prefix}:${name}`)
  },
})
globalThis.window = { ...target('window'), innerWidth: 1470, innerHeight: 850 }
globalThis.document = { ...target('document'), hidden: false, documentElement: target('root') }
const camera = new PerspectiveCamera(45, 1470 / 850, 0.1, 100)
camera.position.z = 5
const hero = new HeroScene()
hero.mount({ camera, scene: new Scene(), qualityMode: 'full', renderer: { getPixelRatio: () => 1 } })
assert.equal(hero.sky.parent, hero.depthLayers.far)
assert.equal(hero.mascot.group.parent, hero.depthLayers.middle)
assert.equal(hero.companionStory.group.parent, hero.depthLayers.middle)
assert.equal(hero.staticDecorations.group.parent, hero.depthLayers.near)
assert.equal(hero.magicTrail.points.parent, hero.depthLayers.near)
const tick = (count = 180, reducedMotion = false) => {
  for (let frame = 0; frame < count; frame++) hero.update({ delta: 1 / 60, reducedMotion })
}
const resourceCounts = () => {
  const geometries = new Set()
  let particles = 0
  let drawCalls = 0
  hero.group.traverse((object) => {
    if (object.geometry) geometries.add(object.geometry)
    if (object.isPoints) particles += object.geometry.attributes.position.count
    if (!object.isMesh && !object.isPoints) return
    const materials = Array.isArray(object.material) ? object.material : [object.material]
    for (const material of materials) {
      drawCalls += material.transparent && material.side === DoubleSide && !material.forceSinglePass ? 2 : 1
    }
  })
  return { geometries: geometries.size, particles, drawCalls }
}
const results = []
for (const quality of ['full', 'lite']) {
  hero.setQualityMode(quality)
  const counts = resourceCounts()
  assert.ok(counts.geometries <= HERO_RESOURCE_BUDGET.geometries)
  assert.ok(counts.drawCalls <= HERO_RESOURCE_BUDGET.drawCalls)
  assert.ok(counts.particles <= HERO_RESOURCE_BUDGET.particles[quality])
  results.push({ quality, ...counts })
  for (const [width, height] of [[1470, 956], [1470, 850], [1440, 900], [390, 844]]) {
    hero.resize({ width, height })
    hero.setQualityMode(quality)
    assert.deepEqual(hero.viewport, { width, height })
    for (const sign of [-1, 1]) {
      hero.handlePointerMove({ clientX: sign * 1e6, clientY: sign * 1e6, pointerType: 'mouse' })
      assert.equal(Math.abs(hero.pointerTarget.x), 1)
      tick()
      const offsets = Object.values(hero.depthLayers).map((layer) => Math.abs(layer.position.x))
      assert.ok(offsets[0] < offsets[1] && offsets[1] < offsets[2])
      const pixelsPerWorld = height / (2 * Math.tan(Math.PI / 8) * 4.5)
      assert.ok(offsets[2] * pixelsPerWorld <= 10.001)
      hero.handlePointerLeave()
      tick()
      assert.ok(hero.depthLayers.near.position.length() < 1e-6)
    }
  }
}
hero.handlePointerMove({ clientX: 1470, clientY: 0, pointerType: 'touch' })
assert.equal(hero.pointerTarget.length(), 0)
hero.pointerTarget.set(1, 1)
tick()
const initialOffset = hero.depthLayers.near.position.length()
hero.setScrollProgress(1)
tick()
assert.ok(hero.depthLayers.near.position.length() < initialOffset * 0.36)
// Newly emitted particles must remain at the wand despite different parent transforms.
hero.magicTrail.emit = (position) => {
  const actual = hero.magicTrail.points.localToWorld(position.clone())
  const expected = hero.wandStar.getWorldPosition(new Vector3())
  assert.ok(actual.distanceTo(expected) < 1e-8)
}
tick(450)
tick(1, true)
assert.equal(hero.currentPointer.length(), 0)
Object.values(hero.depthLayers).forEach((layer) => assert.equal(layer.position.length(), 0))
hero.pointerTarget.set(1, 1)
tick()
hero.setActive(false)
const elapsed = hero.elapsedSeconds
tick()
assert.equal(hero.elapsedSeconds, elapsed)
assert.equal(hero.currentPointer.length(), 0)
hero.setActive(true)
hero.pointerTarget.set(1, 1)
tick()
globalThis.document.hidden = true
listeners.get('document:visibilitychange')()
assert.equal(hero.currentPointer.length(), 0)
hero.dispose()
assert.equal(listeners.size, 0)
delete globalThis.window
delete globalThis.document
console.log('R3.10 parallax, lifecycle, wand anchor and resource budgets passed', results)

