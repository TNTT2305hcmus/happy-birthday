import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { Scene } from 'three'
import { HeroDecorations } from '../src/scenes/HeroDecorations.js'
import { HeroScene } from '../src/scenes/HeroScene.js'

const [overlaySource, styleSource] = await Promise.all([
  readFile(new URL('../src/components/HeroOverlay.jsx', import.meta.url), 'utf8'),
  readFile(new URL('../src/styles/hero-r37.css', import.meta.url), 'utf8'),
])

const decorations = new HeroDecorations({ qualityMode: 'full' })
assert.equal(decorations.balloons.length, 4)
assert.equal(decorations.group.getObjectByName('hero-heart-balloon-one')?.isGroup, true)
assert.equal(decorations.group.getObjectByName('hero-heart-balloon-four')?.isGroup, true)
assert.equal(decorations.group.getObjectByName('hero-low-poly-garden'), undefined)
decorations.setQualityMode('lite')
decorations.setQualityMode('full')
decorations.resize({ height: 844, width: 390 })
assert.equal(decorations.balloons.filter(({ visible }) => visible).length, 2)
decorations.dispose()

const scene = new Scene()
const heroScene = new HeroScene()
heroScene.mount({
  qualityMode: 'full',
  renderer: { getPixelRatio: () => 1 },
  scene,
})
assert.equal(scene.getObjectByName('hero-static-decorations'), heroScene.staticDecorations.group)
heroScene.setQualityMode('lite')
assert.equal(scene.getObjectByName('hero-low-poly-garden'), undefined)
heroScene.dispose()
assert.equal(scene.getObjectByName('hero-static-decorations'), undefined)

assert.doesNotMatch(overlaySource, /HeroGarland|hero-birthday-garland/)
assert.match(overlaySource, /aria-hidden="true"/)
assert.doesNotMatch(styleSource, /hero-birthday-garland|hero-garland-copy/)
assert.match(styleSource, /former HAPPY BIRTHDAY garland was removed/)
assert.doesNotMatch(styleSource, /@keyframes/)

console.log('Refinement R3.7 structural verification passed', {
  balloons: 4,
  gardenRemoved: true,
  mobileBalloons: 2,
})
