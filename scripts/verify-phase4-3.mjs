import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { birthdayContent } from '../src/content/config.js'
import {
  getLetterContentModel,
  normalizeLetterSentences,
} from '../src/components/letterContentModel.js'

const [controlsSource, planning, storySource, stylesheet] = await Promise.all([
  readFile(new URL('../src/components/LetterControls.jsx', import.meta.url), 'utf8'),
  readFile(new URL('../PLANNING.md', import.meta.url), 'utf8'),
  readFile(new URL('../src/components/StorySection.jsx', import.meta.url), 'utf8'),
  readFile(new URL('../src/styles/global.css', import.meta.url), 'utf8'),
])

const letterSection = birthdayContent.sections.find(({ id }) => id === 'letter')
assert.ok(letterSection, 'Letter section must be configured')
assert.equal(letterSection.placeholderSentences.length, 10)
assert.ok(letterSection.placeholderSentences.every((sentence) => sentence.trim().length > 0))

const shortModel = getLetterContentModel(['Một lời chúc ngắn.'])
assert.equal(shortModel.length, 'short')
assert.equal(shortModel.sentences.length, 1)

const standardModel = getLetterContentModel(letterSection.placeholderSentences)
assert.equal(standardModel.length, 'standard')
assert.equal(standardModel.sentences.length, 10)

const extendedModel = getLetterContentModel([
  ...letterSection.placeholderSentences,
  ...letterSection.placeholderSentences,
])
assert.equal(extendedModel.length, 'extended')
assert.equal(extendedModel.sentences.length, 20)

assert.deepEqual(
  normalizeLetterSentences(['  Câu một.  ', '', null, 'Câu   hai.']),
  ['Câu một.', 'Câu hai.'],
)
assert.deepEqual(normalizeLetterSentences(null), [])

assert.ok(controlsSource.includes('letterContent.sentences.map'))
assert.ok(controlsSource.includes('data-letter-content-length={letterContent.length}'))
assert.ok(controlsSource.includes('aria-hidden={!isOpen}'))
assert.ok(!storySource.includes('<LetterControls'))
assert.ok(!stylesheet.includes('.letter-preview-scroll'))
assert.ok(!stylesheet.includes("[data-content-length='extended']"))
assert.ok(planning.includes('- [x] 4.3 Nạp placeholder khoảng 10 câu'))

console.log('Phase 4.3 content-length verification passed')
