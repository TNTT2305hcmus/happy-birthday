import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { birthdayContent } from '../src/content/config.js'
import { LetterScene } from '../src/scenes/LetterScene.js'
import { calculateSectionSnapshot } from '../src/core/sectionSnapshot.js'

const letter = new LetterScene()
letter.resize({ width: 1470, height: 956 })
assert.equal(letter.group.scale.x, 0.78)
assert.equal(letter.group.scale.x, letter.group.scale.y)
assert.equal(letter.group.position.y, -0.16)
letter.mount({ scene: { add() {} } })
letter.applyOpenPose(1)
letter.letterPaper.geometry.computeBoundingBox()
const pocket = letter.pocketOccluderGroup.getObjectByName('letter-envelope-pocket')
pocket.geometry.computeBoundingBox()
const paperBottom = letter.paperGroup.position.y
  + letter.letterPaper.geometry.boundingBox.min.y * letter.paperGroup.scale.y
const pocketMouth = pocket.geometry.boundingBox.max.y
assert.ok(Math.abs(paperBottom - pocketMouth) < 0.08)
const paperTop = (
  letter.paperGroup.position.y
  + letter.letterPaper.geometry.boundingBox.max.y * letter.paperGroup.scale.y
) * letter.group.scale.y + letter.group.position.y
const cameraTop = Math.tan(45 * Math.PI / 360) * 5
assert.ok(paperTop <= cameraTop)
letter.dispose()

const ids = birthdayContent.sections.map(({ id }) => id)
assert.ok(ids.indexOf('gallery') === ids.indexOf('letter') + 1)
const snapshot = calculateSectionSnapshot({
  layouts: [
    { center: 500, height: 1000, id: 'letter', top: 0 },
    { center: 1500, height: 1000, id: 'gallery', top: 1000 },
  ],
  previousScrollY: 900,
  scrollY: 1000,
  sectionIds: ['letter', 'gallery'],
  viewportHeight: 1000,
})
assert.equal(snapshot.activeSectionId, 'gallery')
assert.equal(snapshot.sectionState.letter.state, 'hidden')
assert.equal(snapshot.sectionState.gallery.state, 'active')

const viewportHeight = 956
const letterHeight = viewportHeight * 3
const fullOpenScrollY = 0.58 * (viewportHeight + letterHeight)
const openSnapshot = calculateSectionSnapshot({
  layouts: [
    { center: 478, height: 956, id: 'cake', top: 0 },
    { center: 2390, height: letterHeight, id: 'letter', top: 956 },
    { center: 4302, height: 956, id: 'gallery', top: 3824 },
  ],
  previousScrollY: fullOpenScrollY - 1,
  scrollY: fullOpenScrollY,
  sectionIds: ['cake', 'letter', 'gallery'],
  viewportHeight,
})
assert.equal(openSnapshot.activeSectionId, 'letter')
assert.equal(openSnapshot.transition, null)
assert.ok(Math.abs(openSnapshot.sectionProgress.letter - 0.58) < 0.001)

const [fallback, story, styles, manager] = await Promise.all([
  readFile(new URL('../src/components/LetterFallback.jsx', import.meta.url), 'utf8'),
  readFile(new URL('../src/components/StorySection.jsx', import.meta.url), 'utf8'),
  readFile(new URL('../src/styles/global.css', import.meta.url), 'utf8'),
  readFile(new URL('../src/core/SectionManager.jsx', import.meta.url), 'utf8'),
])
assert.ok(story.includes('<LetterFallback'))
assert.ok(story.includes('letter-sticky-stage'))
assert.ok(story.includes("? 'active' : 'inactive'"))
assert.ok(fallback.includes("useSectionStage('letter')"))
assert.ok(fallback.includes('letter-fallback-page-previous'))
assert.ok(fallback.includes('letter-fallback-page-next'))
assert.ok(fallback.includes('copy.salutation'))
assert.ok(fallback.includes('content.sentences'))
assert.ok(styles.includes("html[data-webgl='unavailable'] .letter-fallback { display: grid; }"))
assert.ok(styles.includes('min-height: 300svh'))
assert.ok(styles.includes('position: sticky'))
assert.ok(styles.includes('top: calc(50% - 27svh)'))
assert.ok(styles.includes("html[data-webgl='unavailable'] .letter-interaction-surface"))
assert.ok(styles.includes('width: 44px;'))
assert.ok(styles.includes('height: 44px;'))
assert.ok(styles.includes('.letter-fallback-toggle:focus-visible'))
assert.ok(styles.includes('@media (prefers-reduced-motion: reduce)'))
assert.ok(manager.includes('element.inert = !isInteractive'))
assert.ok(manager.includes("element.contains(document.activeElement)"))

function luminance(hex) {
  const channels = hex.match(/[a-f\d]{2}/gi).map((value) => Number.parseInt(value, 16) / 255)
  return channels.map((value) => value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4)
    .reduce((total, value, index) => total + value * [0.2126, 0.7152, 0.0722][index], 0)
}
const light = luminance('fffaf0')
const dark = luminance('62445c')
assert.ok((light + 0.05) / (dark + 0.05) >= 4.5)

console.log('Refinement R6.8 responsive fallback and handoff verification passed')
