import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { Scene, Vector3 } from 'three'
import { FairyMascot } from '../src/scenes/FairyMascot.js'
import { HeroScene } from '../src/scenes/HeroScene.js'

const [planning, styleSource] = await Promise.all([
  readFile(new URL('../PLANNING.md', import.meta.url), 'utf8'),
  readFile(new URL('../src/styles/global.css', import.meta.url), 'utf8'),
])

const mascot = new FairyMascot()
const { hatAxis, hatCrown, hatStar } = mascot.parts
const starOffset = new Vector3().subVectors(hatStar.position, hatCrown.position)
const perpendicularOffset = Math.abs(starOffset.x * hatAxis.y - starOffset.y * hatAxis.x)

assert.ok(hatCrown)
assert.ok(hatStar)
assert.ok(perpendicularOffset < 1e-6, `Hat star is off axis by ${perpendicularOffset}`)
assert.ok(starOffset.dot(hatAxis) > 0.39, 'Hat star does not sit beyond the crown tip')
assert.equal(hatStar.rotation.z, hatCrown.rotation.z)
mascot.dispose()

const scene = new Scene()
const heroScene = new HeroScene()
heroScene.mount({
  qualityMode: 'full',
  renderer: { getPixelRatio: () => 1 },
  scene,
})
heroScene.resize({ height: 850, width: 1_470 })

const halo = scene.getObjectByName('fairy-mascot-halo')
assert.ok(halo?.isMesh)
assert.equal(halo.parent, heroScene.mascot.group)
assert.equal(halo.material.transparent, true)
assert.equal(halo.material.depthWrite, false)
assert.ok(halo.position.z < 0)
assert.equal(heroScene.mascot.group.position.x, 1.95)
assert.equal(heroScene.mascot.group.scale.x, 0.78)

assert.ok(styleSource.includes('.hero-overlay::before'))
assert.ok(styleSource.includes('.hero-fallback-fairy::before'))
assert.ok(styleSource.includes('.fallback-hat-star'))
assert.ok(planning.includes('- [x] R3.6'))

heroScene.dispose()
assert.equal(scene.getObjectByName('fairy-mascot-halo'), undefined)

console.log('Refinement R3.6 structural verification passed', {
  haloDrawCalls: 1,
  hatStarAxisError: perpendicularOffset,
  mascotDesktopPosition: heroScene.baseMascotPosition.toArray(),
})
