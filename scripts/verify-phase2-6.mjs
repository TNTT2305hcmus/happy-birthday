import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { PerformanceMonitor } from '../src/core/PerformanceMonitor.js'

const [componentsReadme, coreReadme, fallbackSource, stylesheet] = await Promise.all([
  readFile(new URL('../src/components/README.md', import.meta.url), 'utf8'),
  readFile(new URL('../src/core/README.md', import.meta.url), 'utf8'),
  readFile(new URL('../src/components/HeroFallbackFairy.jsx', import.meta.url), 'utf8'),
  readFile(new URL('../src/styles/global.css', import.meta.url), 'utf8'),
])

for (const requiredPart of [
  'fallback-fairy-head',
  'fallback-hat-cone',
  'fallback-wing-left',
  'fallback-skirt',
  'fallback-wand-star',
]) {
  assert.ok(fallbackSource.includes(requiredPart), `Missing 2D fallback part: ${requiredPart}`)
}

assert.ok(stylesheet.includes("html[data-webgl='unavailable'] .hero-fallback-fairy"))
assert.ok(stylesheet.includes('@media (prefers-reduced-motion: reduce)'))
assert.ok(stylesheet.includes('margin-left: -135px'), 'Mobile fallback must be centered')

for (const componentFile of [
  'DevSectionNav.jsx',
  'ExperienceGate.jsx',
  'HackIntro.jsx',
  'HeroFallbackFairy.jsx',
  'HeroOverlay.jsx',
  'MatrixRain.jsx',
  'PerformanceDebugHud.jsx',
  'RuntimeNotices.jsx',
  'IntroHeroFadeTransition.jsx',
  'StorySection.jsx',
  'heroOverlayModel.js',
  'storyNavigation.js',
]) {
  assert.ok(componentsReadme.includes(`\`${componentFile}\``), `Missing component documentation: ${componentFile}`)
}

for (const coreFile of [
  'AudioManager.js',
  'MagicTrail.js',
  'ParticleSystem.js',
  'PerformanceMonitor.js',
  'SceneManager.js',
  'demoMode.js',
  'runtimeCapabilities.js',
]) {
  assert.ok(coreReadme.includes(`\`${coreFile}\``), `Missing core documentation: ${coreFile}`)
}

function sampleFps(frameIntervalMs) {
  let sample = null
  const monitor = new PerformanceMonitor({ onSample: (result) => { sample = result } })
  for (let timestamp = 0; timestamp <= 2_100; timestamp += frameIntervalMs) {
    monitor.recordFrame(timestamp)
  }
  return sample
}

const fullRateSample = sampleFps(1_000 / 60)
const lowRateSample = sampleFps(1_000 / 30)
assert.equal(fullRateSample.shouldEnableLiteMode, false)
assert.equal(lowRateSample.shouldEnableLiteMode, true)

console.log('Phase 2.6 structural verification passed:', {
  fallback2D: true,
  fullRateSample,
  lowRateSample,
  reducedMotion: true,
  readmes: true,
})
