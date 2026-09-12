import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const [
  appSource,
  contextSource,
  packageSource,
  planning,
  sceneManagerSource,
  sectionManagerSource,
  sectionSnapshotSource,
  storySectionSource,
  styleSource,
] = await Promise.all([
  readFile(new URL('../src/App.jsx', import.meta.url), 'utf8'),
  readFile(new URL('../src/core/SectionManagerContext.js', import.meta.url), 'utf8'),
  readFile(new URL('../package.json', import.meta.url), 'utf8'),
  readFile(new URL('../PLANNING.md', import.meta.url), 'utf8'),
  readFile(new URL('../src/core/SceneManager.js', import.meta.url), 'utf8'),
  readFile(new URL('../src/core/SectionManager.jsx', import.meta.url), 'utf8'),
  readFile(new URL('../src/core/sectionSnapshot.js', import.meta.url), 'utf8'),
  readFile(new URL('../src/components/StorySection.jsx', import.meta.url), 'utf8'),
  readFile(new URL('../src/styles/global.css', import.meta.url), 'utf8'),
])

assert.ok(appSource.includes('SectionManagerProvider'))
assert.ok(appSource.includes('connectScrollTrigger'))
assert.ok(appSource.includes('setSectionSnapshot'))
assert.equal(appSource.includes('heroScene.setActive'), false)
assert.equal(appSource.includes('cakeScene.setActive'), false)
assert.equal(appSource.includes('letterScene.setActive'), false)
assert.ok(sectionManagerSource.includes('calculateSectionSnapshot'))
assert.ok(sectionSnapshotSource.includes('TRANSITION_START'))
assert.ok(sectionManagerSource.includes('presentSectionIds'))
assert.ok(sectionManagerSource.includes('element.inert = !isInteractive'))
assert.ok(sectionManagerSource.includes('aria-hidden'))
assert.ok(sectionManagerSource.includes('document.activeElement'))
assert.ok(contextSource.includes('useSectionStage'))
assert.ok(storySectionSource.includes('data-section-state'))
assert.ok(sceneManagerSource.includes('this.activeSectionIds'))
assert.ok(sceneManagerSource.includes('this.sceneModules = new Map()'))
assert.ok(sceneManagerSource.includes('this.activeSectionIds.has(sectionId)'))
assert.ok(styleSource.includes('pointer-events: none'))
assert.ok(styleSource.includes(`data-section-state='active'`))
assert.ok(styleSource.includes('@media (prefers-reduced-motion: reduce)'))
assert.ok(packageSource.includes('verify:refinement-r1'))

for (const item of ['R1.1', 'R1.2', 'R1.3', 'R1.4', 'R1.5', 'R1.6', 'R1.7']) {
  assert.ok(planning.includes('- [x] ' + item), 'R1 checklist is incomplete: ' + item)
}

console.log('Refinement R1 structural verification passed')
