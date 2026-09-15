import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { Scene } from 'three'
import { birthdayContent } from '../src/content/config.js'
import { LetterScene } from '../src/scenes/LetterScene.js'
import {
  createLetterPaperTexture,
  getLetterPaperText,
} from '../src/scenes/LetterPaperTexture.js'

const letterSection = birthdayContent.sections.find(({ id }) => id === 'letter')
assert.ok(letterSection)
const content = {
  copy: letterSection.letterCopy,
  sentences: letterSection.placeholderSentences,
}
const normalized = getLetterPaperText(content)
assert.equal(normalized.salutation, content.copy.salutation)
assert.deepEqual(normalized.sentences, content.sentences)
assert.equal(normalized.signOff, content.copy.signOff)
assert.equal(normalized.signature, content.copy.signature)

const drawnText = []
const fakeContext = {
  clearRect() {},
  fillStyle: '',
  fillText(text) { drawnText.push(text) },
  font: '',
  measureText(text) { return { width: text.length * 8 } },
  textAlign: 'left',
  textBaseline: 'top',
}
const createCanvas = () => ({
  getContext: () => fakeContext,
  height: 0,
  width: 0,
})
const paperAsset = createLetterPaperTexture(content, createCanvas)
assert.equal(paperAsset.texture.name, 'letter-paper-texture')
assert.equal(paperAsset.texture.userData.source, 'birthday-content-config')
assert.equal(paperAsset.texture.userData.sentenceCount, content.sentences.length)
const firstPageText = drawnText.join(' ')
assert.ok(firstPageText.includes(content.copy.salutation))
paperAsset.render(Infinity, paperAsset.pageCount - 1)
const lastPageText = drawnText.join(' ')
assert.ok(lastPageText.includes(content.copy.signOff))
assert.ok(lastPageText.includes(content.copy.signature))
paperAsset.texture.dispose()

const originalDocument = globalThis.document
globalThis.document = {
  createElement: createCanvas,
  fonts: { ready: Promise.resolve() },
}
const letter = new LetterScene(content)
letter.mount({ qualityMode: 'full', reducedMotion: false, renderer: {}, scene: new Scene() })
assert.ok(letter.paperTextMesh)
assert.equal(letter.paperTextMesh.name, 'letter-paper-text')
assert.equal(letter.paperTextMesh.parent, letter.paperGroup)
const writingSurface = letter.paperGroup.getObjectByName('letter-paper-writing-surface')
assert.ok(letter.paperTextMesh.position.z > writingSurface.position.z)
letter.openProgress = 0.998
letter.manualOpenTarget = 1
letter.announceState('control')
assert.equal(letter.lastAnnouncedStatus, 'opening')
letter.applyOpenPose(0.998)
assert.equal(letter.paperTextMesh.visible, false)
letter.applyOpenPose(0.999)
assert.equal(letter.paperTextMesh.visible, true)
letter.openProgress = 0.999
letter.announceState('control')
assert.equal(letter.lastAnnouncedStatus, 'open')
letter.dispose()
globalThis.document = originalDocument

const [appSource, componentSource, storySource, stylesheet] = await Promise.all([
  readFile(new URL('../src/App.jsx', import.meta.url), 'utf8'),
  readFile(new URL('../src/components/LetterInteractionSurface.jsx', import.meta.url), 'utf8'),
  readFile(new URL('../src/components/StorySection.jsx', import.meta.url), 'utf8'),
  readFile(new URL('../src/styles/global.css', import.meta.url), 'utf8'),
])
assert.ok(appSource.includes('new LetterScene({'))
assert.ok(appSource.includes('sentences: letterSection?.placeholderSentences'))
assert.ok(storySource.includes('sentences={section.placeholderSentences}'))
assert.ok(componentSource.includes('aria-controls'))
assert.ok(componentSource.includes('aria-hidden={!isFullyOpen}'))
assert.ok(componentSource.includes('letter-semantic-content'))
assert.ok(stylesheet.includes('.letter-semantic-content'))
assert.ok(!stylesheet.includes('.letter-preview'))

console.log('Refinement R6.5 paper text verification passed')
