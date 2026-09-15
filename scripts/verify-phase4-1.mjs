import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { Scene } from 'three'
import { LetterScene } from '../src/scenes/LetterScene.js'

const [appSource, sceneReadme, stylesheet] = await Promise.all([
  readFile(new URL('../src/App.jsx', import.meta.url), 'utf8'),
  readFile(new URL('../src/scenes/README.md', import.meta.url), 'utf8'),
  readFile(new URL('../src/styles/global.css', import.meta.url), 'utf8'),
])
assert.ok(appSource.includes("import('./scenes/LetterScene.js')"))
assert.ok(appSource.includes(`sectionId: 'letter'`))
assert.ok(appSource.includes('connectScrollTrigger'))
assert.ok(stylesheet.includes('.letter-story-section'))
assert.ok(sceneReadme.includes('`LetterScene`'))

const threeScene = new Scene()
const letterScene = new LetterScene()
letterScene.mount({ qualityMode: 'full', reducedMotion: false, renderer: {}, scene: threeScene })
assert.equal(letterScene.group.visible, false)
for (const name of [
  'birthday-letter-model', 'letter-envelope-back', 'letter-envelope-pocket',
  'letter-envelope-flap', 'letter-paper', 'letter-paper-writing-surface',
  'letter-paper-gold-border', 'letter-wax-star-seal', 'letter-key-light',
  'letter-fill-light', 'letter-rim-light',
]) assert.ok(threeScene.getObjectByName(name), `Missing ${name}`)
assert.equal(letterScene.paperTexture.name, 'letter-paper-grain')
letterScene.setActive(true)
letterScene.setScrollProgress(0.75)
letterScene.update({ delta: 1 / 60, reducedMotion: false })
assert.equal(letterScene.group.visible, true)
assert.notEqual(letterScene.letterModel.rotation.y, 0)
letterScene.resize({ height: 844, width: 390 })
assert.equal(letterScene.group.scale.x, 0.48)
assert.equal(letterScene.group.position.x, 0)
assert.equal(letterScene.group.position.y, -0.18)
letterScene.resize({ height: 900, width: 1_440 })
assert.equal(letterScene.group.position.x, 0)
assert.equal(letterScene.group.position.y, -0.16)
assert.equal(letterScene.group.scale.x, 0.78)
letterScene.dispose()
assert.equal(threeScene.getObjectByName('birthday-letter-scene'), undefined)
console.log('Phase 4.1 structural verification passed')
