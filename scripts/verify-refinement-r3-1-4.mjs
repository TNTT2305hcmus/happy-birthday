import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { birthdayContent } from '../src/content/config.js'
import { createHeroOverlayModel } from '../src/components/heroOverlayModel.js'

const [heroSource, mainSource, packageSource, planning, styleSource] = await Promise.all([
  readFile(new URL('../src/components/HeroOverlay.jsx', import.meta.url), 'utf8'),
  readFile(new URL('../src/main.jsx', import.meta.url), 'utf8'),
  readFile(new URL('../package.json', import.meta.url), 'utf8'),
  readFile(new URL('../PLANNING.md', import.meta.url), 'utf8'),
  readFile(new URL('../src/styles/global.css', import.meta.url), 'utf8'),
])

const heroSection = birthdayContent.sections.find(({ id }) => id === 'hero')
const copy = heroSection.heroCopy
const model = createHeroOverlayModel({
  copy,
  recipient: birthdayContent.recipient,
  relationship: birthdayContent.relationship,
})

assert.equal(copy.tagLabel, 'Ngày của em bé')
assert.equal(copy.tagDateLabel, '17.9.2026')
assert.equal(copy.headline, 'Happy Birthday Ngiu Hiền Lương xinh đẹp của a')
assert.equal(
  copy.timelineLead,
  '1.111 ngày được bên em bé — cột mốc của chúng mình vào 16.9.2026.',
)
assert.equal(copy.loveLine, 'I love u so much and be always only you.')
assert.equal(model.headline, copy.headline)
assert.equal(model.headlinePrefix, 'Happy Birthday Ngiu ')
assert.equal(model.headlineName, 'Hiền Lương')
assert.equal(model.headlineSuffix, ' xinh đẹp của a')
assert.ok(model.headline.includes('Hiền Lương'))
assert.equal([...model.headline].includes('ề'), true)

for (const removedClass of ['hero-stats', 'hero-milestone', 'hero-cta', 'hero-footer']) {
  assert.equal(heroSource.includes(removedClass), false, `Legacy Hero UI remains: ${removedClass}`)
}

for (const requiredClass of ['hero-date-chip', 'hero-tag-sparkle', 'hero-script-title', 'hero-title-name', 'hero-storyline', 'hero-love-loop']) {
  assert.ok(heroSource.includes(requiredClass), `Missing redesigned Hero group: ${requiredClass}`)
}

assert.ok(mainSource.includes("@fontsource/dancing-script/vietnamese-700.css"))
assert.ok(styleSource.includes("--font-script: 'Dancing Script'"))
assert.ok(styleSource.includes('@keyframes hero-love-reveal'))
assert.ok(styleSource.includes('@keyframes hero-love-gradient'))
assert.ok(styleSource.includes('@keyframes hero-tag-sparkle'))
assert.ok(styleSource.includes('@keyframes hero-title-heartbeat'))
assert.ok(styleSource.includes('.hero-love-line'))
assert.ok(styleSource.includes('@media (prefers-reduced-motion: reduce)'))
assert.ok(packageSource.includes('@fontsource/dancing-script'))

for (const item of ['R3.1', 'R3.2', 'R3.3', 'R3.4', 'R3.5']) {
  assert.ok(planning.includes('- [x] ' + item), 'R3 partial checklist is incomplete: ' + item)
}

console.log('Refinement R3.1-R3.5 structural verification passed', {
  contentGroups: 3,
  headline: model.headline,
  vietnameseScriptFont: true,
})
