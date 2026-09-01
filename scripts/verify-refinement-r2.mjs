import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { birthdayContent } from '../src/content/config.js'
import {
  getIntroTransitionSnapshot,
  INTRO_TRANSITION_PHASES,
} from '../src/core/introTransitionTimeline.js'

const [appSource, experienceSource, fadeSource, planning, styleSource] = await Promise.all([
  readFile(new URL('../src/App.jsx', import.meta.url), 'utf8'),
  readFile(new URL('../src/components/ExperienceGate.jsx', import.meta.url), 'utf8'),
  readFile(new URL('../src/components/IntroHeroFadeTransition.jsx', import.meta.url), 'utf8'),
  readFile(new URL('../PLANNING.md', import.meta.url), 'utf8'),
  readFile(new URL('../src/styles/global.css', import.meta.url), 'utf8'),
])

const { experience } = birthdayContent
assert.equal(experience.introLockDurationMs, 10_000)
assert.equal(experience.introCompleteHoldMs, 3_000)
assert.equal(experience.introFadeToBlackDurationMs, 3_000)
assert.equal(experience.heroFadeInDurationMs, 2_000)
assert.equal(experience.allowIntroSkip, false)

const beforeBlack = getIntroTransitionSnapshot(2_999, 3_000, 2_000)
const atBlack = getIntroTransitionSnapshot(3_000, 3_000, 2_000)
const beforeComplete = getIntroTransitionSnapshot(4_999, 3_000, 2_000)
const atComplete = getIntroTransitionSnapshot(5_000, 3_000, 2_000)
const foregroundRecovery = getIntroTransitionSnapshot(8_500, 3_000, 2_000)

assert.equal(beforeBlack.phase, INTRO_TRANSITION_PHASES.FADE_OUT)
assert.equal(atBlack.phase, INTRO_TRANSITION_PHASES.HERO_REVEAL)
assert.equal(beforeComplete.phase, INTRO_TRANSITION_PHASES.HERO_REVEAL)
assert.equal(atComplete.phase, INTRO_TRANSITION_PHASES.COMPLETE)
assert.equal(foregroundRecovery.phase, INTRO_TRANSITION_PHASES.COMPLETE)
assert.equal(atBlack.phaseElapsedMs, 0)
assert.equal(atComplete.remainingMs, 0)

assert.ok(experienceSource.includes('IntroHeroFadeTransition'))
assert.ok(experienceSource.includes("currentStage === 'fade-out' ? 'hero-reveal'"))
assert.ok(appSource.includes("stage !== 'hero-reveal' && stage !== 'complete'"))
assert.ok(fadeSource.includes("document.addEventListener('visibilitychange'"))
assert.ok(fadeSource.includes("window.addEventListener('pageshow'"))
assert.ok(styleSource.includes("data-transition-phase='fade-out'"))
assert.ok(styleSource.includes("data-transition-phase='hero-reveal'"))

for (const removedEffect of [
  'StarBurstTransition',
  'star-burst-transition',
  'shatter-fragments',
  'transition-flash',
  'console-shatter-out',
]) {
  assert.equal(experienceSource.includes(removedEffect), false, `Legacy transition remains: ${removedEffect}`)
  assert.equal(styleSource.includes(removedEffect), false, `Legacy CSS remains: ${removedEffect}`)
}

for (const item of ['R2.1', 'R2.2', 'R2.3', 'R2.4', 'R2.5', 'R2.6']) {
  assert.ok(planning.includes('- [x] ' + item), 'R2 checklist is incomplete: ' + item)
}

console.log('Refinement R2 structural and clock verification passed', {
  fadeInMs: experience.heroFadeInDurationMs,
  fadeOutMs: experience.introFadeToBlackDurationMs,
  foregroundRecovery,
})
