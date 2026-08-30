import assert from 'node:assert/strict'
import { Scene } from 'three'
import { FairyMascot, FAIRY_PALETTE } from '../src/scenes/FairyMascot.js'
import { HeroScene } from '../src/scenes/HeroScene.js'

const mascot = new FairyMascot()
const requiredParts = [
  'fairy-face',
  'fairy-hair-cap',
  'fairy-pointed-hat',
  'fairy-skirt',
  'fairy-wings',
  'fairy-star-wand',
  'fairy-wand-star',
]

requiredParts.forEach((partName) => {
  assert.ok(mascot.group.getObjectByName(partName), `Missing mascot part: ${partName}`)
})

let meshCount = 0
mascot.group.traverse((object) => {
  if (!object.isMesh) return
  meshCount += 1
  assert.equal(object.material.map, null, `${object.name} unexpectedly uses an external texture`)
})
assert.ok(meshCount >= 30)
assert.equal(mascot.materials.pink.color.getHex(), FAIRY_PALETTE.pink)
assert.equal(mascot.materials.lavender.color.getHex(), FAIRY_PALETTE.lavender)
mascot.dispose()

const scene = new Scene()
const heroScene = new HeroScene()
heroScene.mount({
  qualityMode: 'lite',
  renderer: { getPixelRatio: () => 1 },
  scene,
})
heroScene.resize({ height: 900, width: 1_440 })

assert.equal(scene.getObjectByName('original-fairy-mascot'), heroScene.mascot.group)
assert.equal(heroScene.mascot.group.position.x, 2.25)
assert.equal(heroScene.mascot.group.scale.x, 0.72)

heroScene.resize({ height: 844, width: 390 })
assert.equal(heroScene.mascot.group.scale.x, 0.48)
heroScene.dispose()
assert.equal(scene.getObjectByName('original-fairy-mascot'), undefined)

console.log('Phase 2.2 verification passed:', {
  meshCount,
  originalProceduralGeometry: true,
  responsivePlacement: true,
})
