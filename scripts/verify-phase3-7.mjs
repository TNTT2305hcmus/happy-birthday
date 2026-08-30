import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { Scene } from 'three'
import { CakeScene } from '../src/scenes/CakeScene.js'

const [
  cakeControls,
  cakeSceneSource,
  sceneManagerSource,
  stylesheet,
  uxNotes,
] = await Promise.all([
  readFile(new URL('../src/components/CakeControls.jsx', import.meta.url), 'utf8'),
  readFile(new URL('../src/scenes/CakeScene.js', import.meta.url), 'utf8'),
  readFile(new URL('../src/core/SceneManager.js', import.meta.url), 'utf8'),
  readFile(new URL('../src/styles/global.css', import.meta.url), 'utf8'),
  readFile(new URL('../UX_REFINEMENT_NOTES.md', import.meta.url), 'utf8'),
])

assert.ok(stylesheet.includes('@media (min-width: 1100px) and (max-height: 980px)'))
assert.ok(stylesheet.includes('grid-template-columns: minmax(0, 1fr) minmax(0, 1fr)'))
assert.ok(stylesheet.includes('min-height: 3rem'), 'Primary Cake actions need a touch-safe height')
assert.ok(stylesheet.includes('.cake-copy-panel .phase-note'))
assert.ok(cakeSceneSource.includes('height <= 980'))
assert.ok(sceneManagerSource.includes("maxPixelRatio: 2"))
assert.ok(sceneManagerSource.includes("maxPixelRatio: 1"))
assert.ok(cakeControls.includes('<button'))
assert.ok(cakeControls.includes('onClick={handleMicrophone}'))
assert.ok(cakeControls.includes('onClick={handleManualBlow}'))
assert.ok(uxNotes.includes('1470×850'))

const cake = new CakeScene()
cake.mount({
  qualityMode: 'full',
  reducedMotion: false,
  renderer: { getPixelRatio: () => 2 },
  scene: new Scene(),
})
cake.resize({ height: 850, width: 1470 })
assert.equal(cake.group.scale.x, 0.76)
assert.equal(cake.group.position.x, 1.62)
assert.equal(cake.group.position.y, -0.14)

cake.resize({ height: 956, width: 1470 })
assert.equal(cake.group.scale.x, 0.76)

cake.resize({ height: 1100, width: 1728 })
assert.equal(cake.group.scale.x, 0.84)
cake.dispose()

console.log('Phase 3.7 static verification passed:', {
  compactDesktop: true,
  dprProfiles: { full: 2, lite: 1 },
  macBookSafeViewport: '1470x850',
  semanticActions: true,
})
