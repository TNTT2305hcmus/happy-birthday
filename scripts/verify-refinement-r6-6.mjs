import assert from 'node:assert/strict'
import { Scene } from 'three'
import { birthdayContent } from '../src/content/config.js'
import { LetterScene } from '../src/scenes/LetterScene.js'
import { createLetterPaperTexture, drawLetterPaperText, splitGraphemes } from '../src/scenes/LetterPaperTexture.js'

const section = birthdayContent.sections.find(({ id }) => id === 'letter')
const content = { copy: section.letterCopy, sentences: section.placeholderSentences }
const drawn = []
const context = {
  clearRect() { drawn.length = 0 }, fillStyle: '', font: '', textAlign: 'left', textBaseline: 'top',
  fillText(text) { drawn.push(text) },
  measureText(text) { return { width: splitGraphemes(text).length * 8 } },
}
const createCanvas = () => ({ getContext: () => context, height: 0, width: 0 })

const accented = splitGraphemes('Hiền ✨')
assert.equal(accented.join(''), 'Hiền ✨')
assert.equal(accented.at(-1), '✨')
drawLetterPaperText(createCanvas(), content, { revealCount: 3 })
assert.equal(splitGraphemes(drawn[0]).length, 3)
const asset = createLetterPaperTexture(content, createCanvas, { initialRevealCount: 0 })
assert.ok(!drawn.join(' ').includes(content.copy.salutation))
assert.ok(drawn.join(' ').includes('1 /'))
assert.ok(asset.totalGraphemes > 34)
asset.texture.dispose()

const originalDocument = globalThis.document
globalThis.document = { createElement: createCanvas, fonts: { ready: Promise.resolve() } }
function createLetter() {
  const letter = new LetterScene(content)
  letter.mount({ scene: new Scene() })
  letter.setActive(true)
  return letter
}
function advance(fps) {
  const letter = createLetter()
  letter.openProgress = 0.998
  letter.updateTyping(1 / fps, false)
  assert.equal(letter.typingState, 'idle')
  letter.openProgress = 0.999
  for (let frame = 0; frame < fps; frame += 1) letter.updateTyping(1 / fps, false)
  return letter
}

const thirty = advance(30)
const sixty = advance(60)
assert.equal(thirty.revealedGraphemes, sixty.revealedGraphemes)
assert.equal(thirty.typingState, 'typing')
const version = thirty.paperTextAsset.texture.version
thirty.renderPaperText(thirty.revealedGraphemes)
assert.equal(thirty.paperTextAsset.texture.version, version)

const session = thirty.typingSession
thirty.openProgress = 0.99
thirty.updateTyping(1 / 60, false)
assert.equal(thirty.typingSession, session)
thirty.openProgress = 0.98
thirty.updateTyping(1 / 60, false)
assert.equal(thirty.typingState, 'idle')
assert.equal(thirty.revealedGraphemes, 0)
thirty.openProgress = 0.999
thirty.updateTyping(1 / 60, false)
assert.equal(thirty.typingState, 'typing')
assert.ok(thirty.typingSession > session)

const reduced = createLetter()
reduced.openProgress = 0.999
reduced.updateTyping(1 / 60, true)
assert.equal(reduced.typingState, 'complete')
assert.equal(reduced.revealedGraphemes, reduced.paperTextAsset.totalGraphemes)
reduced.openProgress = 0.98
reduced.updateTyping(1 / 60, true)
assert.equal(reduced.typingState, 'idle')

thirty.dispose()
sixty.dispose()
reduced.dispose()
globalThis.document = originalDocument
console.log('Refinement R6.6 typing verification passed')
