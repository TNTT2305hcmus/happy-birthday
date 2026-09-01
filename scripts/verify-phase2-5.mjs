import assert from 'node:assert/strict'
import { navigateToStorySection } from '../src/components/storyNavigation.js'
import { birthdayContent } from '../src/content/config.js'

const heroSection = birthdayContent.sections.find(({ id }) => id === 'hero')
assert.equal('ctaTarget' in heroSection.heroCopy, false)
assert.equal('ctaLabel' in heroSection.heroCopy, false)

let scrollOptions = null
let focusOptions = null
let replacedUrl = null
const target = {
  focus: (options) => { focusOptions = options },
  scrollIntoView: (options) => { scrollOptions = options },
}
const fullJourneyBrowser = {
  document: { getElementById: (id) => id === 'cake' ? target : null },
  history: { replaceState: (_state, _title, url) => { replacedUrl = url } },
  location: { href: 'https://example.test/?quality=full' },
  matchMedia: () => ({ matches: false }),
}

assert.equal(navigateToStorySection('cake', fullJourneyBrowser), 'smooth')
assert.deepEqual(scrollOptions, { behavior: 'smooth', block: 'start' })
assert.deepEqual(focusOptions, { preventScroll: true })
assert.equal(replacedUrl, '/?quality=full#cake')

let assignedUrl = null
const demoBrowser = {
  document: { getElementById: () => null },
  location: {
    assign: (url) => { assignedUrl = url },
    href: 'https://example.test/?section=hero&quality=lite&stage=landing',
  },
}

assert.equal(navigateToStorySection('cake', demoBrowser), 'demo-navigation')
assert.equal(assignedUrl, 'https://example.test/?section=cake&quality=lite')

const reducedMotionBrowser = {
  ...fullJourneyBrowser,
  matchMedia: () => ({ matches: true }),
}
assert.equal(navigateToStorySection('cake', reducedMotionBrowser), 'auto')
assert.equal(scrollOptions.behavior, 'auto')

console.log('Phase 2.5 verification passed:', {
  demoFallback: true,
  focusManagement: true,
  reducedMotion: true,
  target: 'cake',
})
