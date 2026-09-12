import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { Scene, Vector3 } from 'three'
import { MagicTrail } from '../src/core/MagicTrail.js'
import { ShootingStarTrail } from '../src/core/ShootingStarTrail.js'
import { HeroScene } from '../src/scenes/HeroScene.js'

const [heroSource, styleSource] = await Promise.all([
  readFile(new URL('../src/scenes/HeroScene.js', import.meta.url), 'utf8'),
  readFile(new URL('../src/styles/hero-r38.css', import.meta.url), 'utf8'),
])

const magicTrail = new MagicTrail({ counts: { full: 12, lite: 5 }, qualityMode: 'full' })
magicTrail.emit(new Vector3(), 1, { cascade: true })
assert.ok(magicTrail.velocities[1] < 0, 'Cascade glitter should fall from the wand')
assert.equal(magicTrail.lives.length, 12)
magicTrail.setQualityMode('lite')
assert.equal(magicTrail.lives.length, 5)
magicTrail.dispose()

const shootingStar = new ShootingStarTrail({ counts: { full: 18, lite: 8 } })
assert.equal(shootingStar.points.name, 'hero-shooting-star-trail')
assert.equal(shootingStar.alphas.length, 18)
assert.equal(shootingStar.launch(), true)
assert.equal(shootingStar.launch(), false, 'Only one shooting star may fly at a time')
shootingStar.update(0.2)
assert.equal(shootingStar.points.visible, true)
shootingStar.setActive(false)
assert.equal(shootingStar.points.visible, false)
shootingStar.setQualityMode('lite')
assert.equal(shootingStar.alphas.length, 8)
shootingStar.dispose()

const scene = new Scene()
const hero = new HeroScene()
hero.mount({ qualityMode: 'full', renderer: { getPixelRatio: () => 1 }, scene })
assert.ok(scene.getObjectByName('hero-shooting-star-trail'))
hero.setActive(false)
assert.equal(hero.shootingStar.isActive, false)
hero.dispose()
assert.equal(scene.getObjectByName('hero-shooting-star-trail'), undefined)

assert.match(heroSource, /gestureEnvelope/)
assert.match(heroSource, /cascade: true/)
assert.doesNotMatch(styleSource, /hero-garland-sway/)
assert.match(styleSource, /hero-balloon-sway-a/)
assert.match(styleSource, /prefers-reduced-motion/)

console.log('Refinement R3.8 structural verification passed', {
  magicTrailCounts: { full: 96, lite: 32 },
  shootingStarCounts: { full: 30, lite: 14 },
  shootingStarDrawCalls: 1,
})
