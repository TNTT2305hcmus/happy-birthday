import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { birthdayContent } from '../src/content/config.js'
import { getLetterRevealSchedule } from '../src/components/letterContentModel.js'

const [controlsSource, stylesheet] = await Promise.all([
  readFile(new URL('../src/components/LetterControls.jsx', import.meta.url), 'utf8'),
  readFile(new URL('../src/styles/global.css', import.meta.url), 'utf8'),
])

const letterSection = birthdayContent.sections.find(({ id }) => id === 'letter')
const schedule = getLetterRevealSchedule(letterSection.placeholderSentences)

assert.equal(schedule.items.length, 10)
assert.ok(schedule.totalSeconds <= 11.85)
assert.ok(schedule.signatureDelaySeconds > schedule.items.at(-1).delaySeconds)
schedule.items.forEach((item, index) => {
  assert.ok(item.durationSeconds > 0)
  assert.ok(item.stepCount >= 12 && item.stepCount <= 42)
  if (index > 0) {
    assert.ok(item.delaySeconds > schedule.items[index - 1].delaySeconds)
  }
})

assert.ok(controlsSource.includes("data-letter-reveal={isOpen ? 'writing' : 'hidden'}"))
assert.ok(controlsSource.includes("'--letter-delay'"))
assert.ok(controlsSource.includes('previewScrollRef.current.scrollTop = 0'))
assert.ok(!stylesheet.includes('@keyframes letter-ink-reveal'))
assert.ok(stylesheet.includes("@media (prefers-reduced-motion: reduce)"))
assert.ok(stylesheet.includes('animation: none'))

console.log('Phase 4.4 handwriting verification passed')
