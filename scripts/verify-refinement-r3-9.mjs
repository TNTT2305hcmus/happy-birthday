import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { Scene } from 'three'
import { HeroCompanions } from '../src/scenes/HeroCompanions.js'
import { HeroScene } from '../src/scenes/HeroScene.js'

const [overlaySource, configSource, mainSource, decorSource] = await Promise.all([
  readFile(new URL('../src/components/HeroOverlay.jsx', import.meta.url), 'utf8'),
  readFile(new URL('../src/content/config.js', import.meta.url), 'utf8'),
  readFile(new URL('../src/main.jsx', import.meta.url), 'utf8'),
  readFile(new URL('../src/scenes/HeroDecorations.js', import.meta.url), 'utf8'),
])

const story = new HeroCompanions({ qualityMode: 'full' })
assert.equal(story.group.name, 'hero-r39-card-companions')
assert.equal(story.companions.length, 2)
assert.equal(story.companions.filter(({ visible }) => visible).length, 2)
assert.ok(story.cardAnchor.x < 0, 'Card orbit anchor should stay on the left side')
story.update({ elapsedSeconds: 1 })
assert.ok(story.companions[0].position.distanceTo(story.cardAnchor) > 1)
story.setQualityMode('lite')
assert.equal(story.companions.filter(({ visible }) => visible).length, 1)
story.update({ elapsedSeconds: 4, reducedMotion: true })
const staticPosition = story.companions[0].position.clone()
story.update({ elapsedSeconds: 9, reducedMotion: true })
assert.ok(story.companions[0].position.equals(staticPosition))
story.dispose()

const scene = new Scene()
const hero = new HeroScene()
hero.mount({ qualityMode: 'full', renderer: { getPixelRatio: () => 1 }, scene })
assert.equal(scene.getObjectByName('hero-r39-card-companions'), hero.companionStory.group)
hero.dispose()
assert.equal(scene.getObjectByName('hero-r39-card-companions'), undefined)

assert.doesNotMatch(overlaySource, /hero-mascot-speech|mascotSpeech/)
assert.doesNotMatch(configSource, /mascotSpeech:/)
assert.doesNotMatch(mainSource, /hero-r39\.css/)
assert.doesNotMatch(decorSource, /garden|flower|petal/)

console.log('Refinement R3.9 structural verification passed', {
  cardOrbit: true,
  companions: { full: 2, lite: 1 },
  flowersRemoved: true,
  reducedMotionStatic: true,
  secondaryFairyRemoved: true,
  speechBubbleRemoved: true,
})
