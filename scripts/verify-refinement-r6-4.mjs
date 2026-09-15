import assert from 'node:assert/strict'
import { Scene } from 'three'
import { LetterScene } from '../src/scenes/LetterScene.js'

function createLetter() {
  const letter = new LetterScene()
  letter.mount({ qualityMode: 'full', reducedMotion: false, renderer: {}, scene: new Scene() })
  letter.setActive(true)
  return letter
}

const mapping = createLetter()
for (const [scroll, expected] of [[0, 0], [0.04, 0], [0.5, 0.5], [0.96, 1], [1, 1]]) {
  mapping.setScrollProgress(scroll)
  assert.ok(Math.abs(mapping.getScrollOpenTarget() - expected) < 0.001)
}
mapping.setScrollProgress(0.8)
assert.ok(mapping.getScrollOpenTarget() > 0.8 && mapping.getScrollOpenTarget() < 0.9)

mapping.applyOpenPose(0.2)
assert.ok(mapping.sealGroup.scale.x < 0.2)
assert.equal(mapping.paperGroup.position.y, 0)
mapping.applyOpenPose(0.4)
assert.ok(mapping.flapHinge.rotation.x < -Math.PI * 0.7)
assert.equal(mapping.paperGroup.position.y, 0)
mapping.applyOpenPose(0.65)
assert.ok(mapping.paperGroup.position.y > 0.3)
mapping.dispose()

const scrollDriven = createLetter()
scrollDriven.setScrollProgress(1)
for (let frame = 0; frame < 15; frame += 1) {
  scrollDriven.update({ delta: 1 / 60, reducedMotion: false })
}

const controlled = createLetter()
controlled.setOpen(true)
for (let frame = 0; frame < 15; frame += 1) {
  controlled.update({ delta: 1 / 60, reducedMotion: false })
}
assert.ok(controlled.openProgress > scrollDriven.openProgress + 0.25)
assert.ok(controlled.openProgress > 0.94)

controlled.setScrollProgress(0.01)
assert.equal(controlled.manualOpenTarget, 1, 'Tiny scroll must preserve control override')
const beforeHandoff = controlled.openProgress
controlled.setScrollProgress(0.04)
assert.equal(controlled.manualOpenTarget, null, 'Intentional scroll must release control override')
controlled.update({ delta: 1 / 60, reducedMotion: false })
assert.ok(Math.abs(controlled.openProgress - beforeHandoff) < 0.08, 'Handoff must stay continuous')

controlled.setOpen(false)
controlled.update({ delta: 1 / 60, reducedMotion: true })
assert.equal(controlled.openProgress, 0)
controlled.setOpen(true)
controlled.update({ delta: 1 / 60, reducedMotion: true })
assert.equal(controlled.openProgress, 1)

scrollDriven.dispose()
controlled.dispose()
console.log('Refinement R6.4 interaction mapping verification passed')
