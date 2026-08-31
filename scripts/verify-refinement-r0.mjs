import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const [appSource, baseline, packageSource, planning, sceneManagerSource] = await Promise.all([
  readFile(new URL('../src/App.jsx', import.meta.url), 'utf8'),
  readFile(new URL('../REFINEMENT-BASELINE.md', import.meta.url), 'utf8'),
  readFile(new URL('../package.json', import.meta.url), 'utf8'),
  readFile(new URL('../PLANNING.md', import.meta.url), 'utf8'),
  readFile(new URL('../src/core/SceneManager.js', import.meta.url), 'utf8'),
])

assert.ok(appSource.includes("start: 'top bottom'"))
assert.ok(appSource.includes("start: 'top 55%'"))
assert.ok(appSource.includes('heroScene.setActive'))
assert.ok(appSource.includes('cakeScene.setActive'))
assert.ok(appSource.includes('letterScene.setActive'))
assert.equal((sceneManagerSource.match(/new WebGLRenderer/g) ?? []).length, 1)
assert.ok(sceneManagerSource.includes('this.sceneModules.forEach'))

for (const heading of [
  '## 2. Kiểm kê điều phối hiện tại',
  '## 4. Baseline lỗi/nợ kỹ thuật đã biết',
  '## 5. Ma trận file dự kiến theo phase refinement',
  '## 6. Inventory kiểm thử trước refinement',
  '## 7. Browser baseline',
]) {
  assert.ok(baseline.includes(heading), 'Missing baseline section: ' + heading)
}

for (const phase of ['R1', 'R2', 'R3', 'R4', 'R5', 'R6', 'R7']) {
  assert.ok(baseline.includes('| ' + phase + ' |'))
}

assert.ok(planning.includes('- [x] R0.1 Chụp lại trạng thái kỹ thuật'))
assert.ok(planning.includes('- [x] R0.4 Chốt baseline viewport'))
assert.ok(packageSource.includes('"verify:refinement-r0"'))
assert.ok(packageSource.includes('"verify:refinement-r0:browser"'))

console.log('Refinement R0 structural verification passed')
