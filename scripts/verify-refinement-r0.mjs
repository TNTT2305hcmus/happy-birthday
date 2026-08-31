import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const [appSource, baseline, packageSource, planning, sceneManagerSource] = await Promise.all([
  readFile(new URL('../src/App.jsx', import.meta.url), 'utf8'),
  readFile(new URL('../REFINEMENT-BASELINE.md', import.meta.url), 'utf8'),
  readFile(new URL('../package.json', import.meta.url), 'utf8'),
  readFile(new URL('../PLANNING.md', import.meta.url), 'utf8'),
  readFile(new URL('../src/core/SceneManager.js', import.meta.url), 'utf8'),
])

assert.ok(appSource.includes('SectionManagerProvider'))
assert.ok(appSource.includes('setSectionSnapshot'))
assert.equal(appSource.includes('heroScene.setActive'), false)
assert.equal(appSource.includes('cakeScene.setActive'), false)
assert.equal(appSource.includes('letterScene.setActive'), false)
assert.equal((sceneManagerSource.match(/new WebGLRenderer/g) ?? []).length, 1)
assert.ok(sceneManagerSource.includes('this.sceneModules.forEach'))
assert.ok(sceneManagerSource.includes('this.activeSectionIds'))

for (const phase of ['R1', 'R2', 'R3', 'R4', 'R5', 'R6', 'R7']) {
  assert.ok(baseline.includes('| ' + phase + ' |'))
}

assert.ok(planning.includes('- [x] R0.1'))
assert.ok(planning.includes('- [x] R0.4'))
assert.ok(packageSource.includes('verify:refinement-r0'))
assert.ok(packageSource.includes('verify:refinement-r0:browser'))

console.log('Refinement R0 structural verification passed')
