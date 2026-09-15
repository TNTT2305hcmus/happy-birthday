import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { Scene } from 'three'
import { birthdayContent } from '../src/content/config.js'
import { LetterScene } from '../src/scenes/LetterScene.js'
import {
  getLetterPaperText,
  layoutLetterPaperPages,
  splitGraphemes,
} from '../src/scenes/LetterPaperTexture.js'

const section = birthdayContent.sections.find(({ id }) => id === 'letter')
const baseSentences = section.placeholderSentences
const context = {
  clearRect() {}, fillText() {}, font: '', textAlign: 'left', textBaseline: 'top',
  measureText(text) { return { width: splitGraphemes(text).length * 8 } },
}
const createCanvas = () => ({ getContext: () => context, height: 0, width: 0 })
const fixture = (count) => ({
  copy: section.letterCopy,
  sentences: Array.from({ length: count }, (_, index) => baseSentences[index % baseSentences.length]),
})

for (const count of [1, 10, 20]) {
  const content = fixture(count)
  const pagination = layoutLetterPaperPages(createCanvas(), content)
  assert.ok(pagination.pages.length >= 1)
  if (count === 1) assert.equal(pagination.pages.length, 1)
  if (count === 20) assert.ok(pagination.pages.length > 1)
  assert.equal(pagination.layout.fontSize, 24)
  pagination.pages.forEach(({ lines }) => {
    const height = lines.reduce((total, line) => total + (
      line === null ? pagination.layout.gap : pagination.layout.lineHeight
    ), 0)
    assert.ok(height <= 300.001)
  })
  const renderedBody = pagination.pages.flatMap(({ lines }) => lines).filter(Boolean).join(' ')
  assert.equal(renderedBody, getLetterPaperText(content).sentences.join(' '))
}

const originalDocument = globalThis.document
globalThis.document = { createElement: createCanvas, fonts: { ready: Promise.resolve() } }
const letter = new LetterScene(fixture(20))
letter.mount({ scene: new Scene() })
letter.setActive(true)
assert.ok(letter.paperTextAsset.pageCount > 1)
letter.openProgress = 0.999
letter.updateTyping(1 / 60, true)
assert.equal(letter.typingState, 'complete')
assert.ok(letter.completedPages.has(0))

letter.handlePageRequest({ detail: { direction: 'next' } })
assert.equal(letter.pageIndex, 1)
assert.equal(letter.typingState, 'idle')
letter.updateTyping(1 / 60, false)
assert.equal(letter.typingState, 'typing')
letter.handlePageRequest({ detail: { direction: 'next' } })
assert.equal(letter.pageIndex, 1, 'Typing must block page navigation')
letter.updateTyping(1 / 60, true)
assert.equal(letter.typingState, 'complete')

letter.handlePageRequest({ detail: { direction: 'previous' } })
assert.equal(letter.pageIndex, 0)
assert.equal(letter.typingState, 'complete', 'A read page must return fully rendered')
letter.handlePageRequest({ detail: { direction: 'previous' } })
assert.equal(letter.pageIndex, 0)
letter.openProgress = 0.98
letter.updateTyping(1 / 60, false)
assert.equal(letter.pageIndex, 0)
assert.equal(letter.completedPages.size, 0)
assert.equal(letter.typingState, 'idle')
letter.dispose()
globalThis.document = originalDocument

const [component, events, styles] = await Promise.all([
  readFile(new URL('../src/components/LetterInteractionSurface.jsx', import.meta.url), 'utf8'),
  readFile(new URL('../src/scenes/letterEvents.js', import.meta.url), 'utf8'),
  readFile(new URL('../src/styles/global.css', import.meta.url), 'utf8'),
])
assert.ok(component.includes('letter-page-control-previous'))
assert.ok(component.includes('letter-page-control-next'))
assert.ok(component.includes("typingStatus === 'complete'"))
assert.ok(events.includes('LETTER_PAGE_REQUEST_EVENT'))
assert.ok(styles.includes('.letter-page-control:focus-visible'))
assert.ok(!styles.includes('.letter-preview'))

console.log('Refinement R6.7 pagination verification passed')
