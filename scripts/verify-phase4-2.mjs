import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { Scene } from 'three'
import { LetterScene } from '../src/scenes/LetterScene.js'

const [appSource, configSource, controlsSource, eventsSource, planning, storySource, stylesheet] = await Promise.all([
  readFile(new URL('../src/App.jsx', import.meta.url), 'utf8'),
  readFile(new URL('../src/content/config.js', import.meta.url), 'utf8'),
  readFile(new URL('../src/components/LetterControls.jsx', import.meta.url), 'utf8'),
  readFile(new URL('../src/scenes/letterEvents.js', import.meta.url), 'utf8'),
  readFile(new URL('../PLANNING.md', import.meta.url), 'utf8'),
  readFile(new URL('../src/components/StorySection.jsx', import.meta.url), 'utf8'),
  readFile(new URL('../src/styles/global.css', import.meta.url), 'utf8'),
])

assert.ok(appSource.includes('letterScene.setScrollProgress(progress)'))
assert.ok(configSource.includes('letterCopy:'))
assert.ok(controlsSource.includes('aria-expanded={isOpen}'))
assert.ok(controlsSource.includes('requestLetterToggle(nextOpen)'))
assert.ok(eventsSource.includes('LETTER_TOGGLE_REQUEST_EVENT'))
assert.ok(storySource.includes('copy={section.letterCopy}'))
assert.ok(storySource.includes('sentences={section.placeholderSentences}'))
assert.ok(stylesheet.includes('.letter-toggle-button'))
assert.ok(planning.includes('- [x] 4.2 Animation mở phong bì'))

const threeScene = new Scene()
const letterScene = new LetterScene()
letterScene.mount({ qualityMode: 'full', reducedMotion: false, renderer: {}, scene: threeScene })
assert.ok(threeScene.getObjectByName('letter-flap-hinge'))
assert.ok(threeScene.getObjectByName('letter-paper-group'))
assert.ok(threeScene.getObjectByName('letter-seal-group'))

letterScene.setActive(true)
letterScene.setScrollProgress(0.8)
for (let index = 0; index < 180; index += 1) {
  letterScene.update({ delta: 1 / 60, reducedMotion: false })
}
assert.ok(letterScene.openProgress > 0.95, 'Scroll should open the envelope')
assert.ok(letterScene.flapHinge.rotation.x < -2.8, 'Flap should fold behind the envelope')
assert.ok(letterScene.paperGroup.position.y > 0.55, 'Paper should rise out of the pocket')
assert.ok(letterScene.sealGroup.scale.x < 0.05, 'Seal should release while opening')

letterScene.setOpen(false, 'control')
letterScene.update({ delta: 1 / 60, reducedMotion: true })
assert.equal(letterScene.openProgress, 0, 'Reduced motion should close immediately')
assert.ok(Math.abs(letterScene.flapHinge.rotation.x) < Number.EPSILON)
assert.equal(letterScene.paperGroup.position.y, 0)

letterScene.setOpen(true, 'control')
letterScene.update({ delta: 1 / 60, reducedMotion: true })
assert.equal(letterScene.openProgress, 1, 'Reduced motion should open immediately')
assert.ok(letterScene.paperGroup.position.y > 0.6)

letterScene.dispose()
assert.equal(threeScene.getObjectByName('birthday-letter-scene'), undefined)
console.log('Phase 4.2 structural verification passed')
