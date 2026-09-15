import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { Scene } from 'three'
import { LetterScene } from '../src/scenes/LetterScene.js'

const [appSource, storySectionSource, stylesheet] = await Promise.all([
  readFile(new URL('../src/App.jsx', import.meta.url), 'utf8'),
  readFile(new URL('../src/components/StorySection.jsx', import.meta.url), 'utf8'),
  readFile(new URL('../src/styles/global.css', import.meta.url), 'utf8'),
])

assert.ok(appSource.includes("import('./scenes/LetterScene.js')"))
assert.ok(appSource.includes("sectionId: 'letter'"))
assert.ok(storySectionSource.includes("section.id === 'letter'"))
assert.ok(storySectionSource.includes("className={'story-section letter-story-section'}"))
assert.ok(storySectionSource.includes('data-scene={section.sceneModule}'))
assert.ok(storySectionSource.includes('tabIndex={-1}'))
assert.ok(!storySectionSource.includes("import { LetterControls }"))
assert.ok(!storySectionSource.includes('<LetterControls'))
assert.ok(storySectionSource.includes('<LetterInteractionSurface'))

for (const selector of [
  '.letter-copy-panel',
  '.letter-controls',
  '.letter-toggle-button',
  '.letter-preview',
]) {
  assert.ok(!stylesheet.includes(selector), 'Obsolete Letter UI selector remains: ' + selector)
}

const threeScene = new Scene()
const letterScene = new LetterScene()
letterScene.mount({ qualityMode: 'full', reducedMotion: false, renderer: {}, scene: threeScene })

for (const viewport of [
  { height: 956, width: 1_470 },
  { height: 850, width: 1_470 },
  { height: 900, width: 1_440 },
  { height: 844, width: 390 },
]) {
  letterScene.resize(viewport)
  assert.equal(
    letterScene.group.position.x,
    0,
    'Letter is not centered at ' + viewport.width + 'x' + viewport.height,
  )
}

letterScene.dispose()
console.log('Refinement R6.1 structural verification passed')
