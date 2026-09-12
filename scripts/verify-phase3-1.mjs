import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { Scene } from 'three'
import { CakeScene } from '../src/scenes/CakeScene.js'

const [appSource, sceneReadme, stylesheet] = await Promise.all([
  readFile(new URL('../src/App.jsx', import.meta.url), 'utf8'),
  readFile(new URL('../src/scenes/README.md', import.meta.url), 'utf8'),
  readFile(new URL('../src/styles/global.css', import.meta.url), 'utf8'),
])

assert.ok(appSource.includes("import('./scenes/CakeScene.js')"), 'CakeScene must be loaded by App')
assert.ok(appSource.includes(`sectionId: 'cake'`), 'Cake needs SectionManager registration')
assert.ok(appSource.includes('connectScrollTrigger'), 'Cake needs centralized ScrollTrigger orchestration')
assert.ok(stylesheet.includes('.cake-copy-panel'), 'Cake overlay layout is missing')
assert.ok(sceneReadme.includes('`CakeScene`'), 'CakeScene documentation is missing')

const threeScene = new Scene()
const cakeScene = new CakeScene()
cakeScene.mount({
  qualityMode: 'full',
  reducedMotion: false,
  renderer: { getPixelRatio: () => 1 },
  scene: threeScene,
})

assert.equal(cakeScene.group.visible, false, 'Cake must start inactive')
assert.equal(cakeScene.candles.length, 5)
assert.equal(cakeScene.flames.length, 5)
assert.ok(threeScene.getObjectByName('birthday-cake-model'))
assert.ok(threeScene.getObjectByName('cake-gold-platter'))
assert.ok(threeScene.getObjectByName('cake-star-topper'))
assert.ok(threeScene.getObjectByName('cake-key-light'))
assert.ok(threeScene.getObjectByName('cake-fill-light'))
assert.ok(threeScene.getObjectByName('cake-rim-light'))

cakeScene.setActive(true)
cakeScene.setScrollProgress(0.75)
cakeScene.update({ delta: 1 / 60, reducedMotion: false })
assert.equal(cakeScene.group.visible, true)
assert.notEqual(cakeScene.cake.rotation.y, 0)

cakeScene.resize({ height: 844, width: 390 })
assert.ok(cakeScene.group.scale.x > 0 && cakeScene.group.scale.x < 0.5)
assert.ok(cakeScene.group.position.y > 0)
cakeScene.resize({ height: 900, width: 1_440 })
assert.ok(cakeScene.group.position.x < 0)
assert.ok(cakeScene.group.scale.x > 0)

cakeScene.dispose()
assert.equal(threeScene.getObjectByName('birthday-cake-scene'), undefined)

console.log('Phase 3.1 structural verification passed:', {
  candles: 5,
  responsiveLayout: true,
  sharedCanvasIntegration: true,
  tieredCake: true,
})
