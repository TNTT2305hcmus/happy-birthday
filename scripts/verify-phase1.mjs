import assert from 'node:assert/strict'
import { birthdayContent } from '../src/content/config.js'
import { getRequestedSection } from '../src/core/demoMode.js'
import { PerformanceMonitor } from '../src/core/PerformanceMonitor.js'

assert.equal(birthdayContent.experience.introLockDurationMs, 10_000)
assert.equal(birthdayContent.experience.introCompleteHoldMs, 3_000)
assert.equal(birthdayContent.experience.allowIntroSkip, false)
assert.ok(birthdayContent.experience.transitionDurationMs >= 1_000)
assert.equal(birthdayContent.sections.length, 6)
assert.equal(birthdayContent.sections.find(({ id }) => id === 'gallery').items.length, 35)
assert.equal(getRequestedSection(birthdayContent.sections, '?section=hero'), 'hero')
assert.equal(getRequestedSection(birthdayContent.sections, '?section=unknown'), null)

let fullModeSample = null
const fullModeMonitor = new PerformanceMonitor({ onSample: (sample) => { fullModeSample = sample } })
for (let frame = 0; frame <= 120; frame += 1) {
  fullModeMonitor.recordFrame(frame * (1_000 / 60))
}

let liteModeSample = null
const liteModeMonitor = new PerformanceMonitor({ onSample: (sample) => { liteModeSample = sample } })
for (let frame = 0; frame <= 60; frame += 1) {
  liteModeMonitor.recordFrame(frame * (1_000 / 30))
}

assert.equal(fullModeSample.shouldEnableLiteMode, false)
assert.equal(liteModeSample.shouldEnableLiteMode, true)

console.log('Phase 1 verification passed:', {
  fullModeSample,
  liteModeSample,
  sectionCount: birthdayContent.sections.length,
  introCompleteHoldMs: birthdayContent.experience.introCompleteHoldMs,
  transitionDurationMs: birthdayContent.experience.transitionDurationMs,
})
