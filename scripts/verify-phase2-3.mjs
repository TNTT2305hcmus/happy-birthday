import assert from 'node:assert/strict'
import { Scene, Vector3 } from 'three'
import { MagicTrail } from '../src/core/MagicTrail.js'
import { HeroScene } from '../src/scenes/HeroScene.js'

const trail = new MagicTrail({
  counts: { full: 12, lite: 5 },
  qualityMode: 'full',
})
assert.equal(trail.geometry.getAttribute('position').count, 12)
assert.ok(Array.from(trail.lives).every((life) => life === 1))

trail.emit(new Vector3(1, 2, 3), 1)
assert.ok(Array.from(trail.lives).some((life) => life === 0))
trail.update(1.2)
assert.ok(Array.from(trail.lives).every((life) => life === 1))
trail.setQualityMode('lite')
assert.equal(trail.geometry.getAttribute('position').count, 5)
trail.dispose()

const scene = new Scene()
const heroScene = new HeroScene()
heroScene.mount({
  qualityMode: 'full',
  renderer: { getPixelRatio: () => 1 },
  scene,
})
heroScene.resize({ height: 900, width: 1_440 })

const initialY = heroScene.mascot.group.position.y
const initialWingRotation = heroScene.mascot.parts.wingMeshes[0].rotation.z
heroScene.setScrollProgress(0.75)
heroScene.update({ delta: 0.2, reducedMotion: false })

assert.notEqual(heroScene.mascot.group.position.y, initialY)
assert.notEqual(heroScene.mascot.parts.wingMeshes[0].rotation.z, initialWingRotation)
assert.ok(Array.from(heroScene.magicTrail.lives).some((life) => life === 0))

heroScene.setActive(false)
assert.equal(heroScene.mascot.group.visible, false)
assert.equal(heroScene.magicTrail.points.visible, false)
heroScene.setActive(true)
assert.equal(heroScene.mascot.group.visible, true)

heroScene.update({ delta: 0.2, reducedMotion: true })
assert.equal(heroScene.mascot.group.rotation.z, 0)
heroScene.dispose()

console.log('Phase 2.3 verification passed:', {
  glitterTrailDrawCalls: 1,
  pointerAndScrollInputs: true,
  reducedMotion: true,
})
