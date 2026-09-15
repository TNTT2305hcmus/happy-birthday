import assert from 'node:assert/strict'
import { Box3, Scene } from 'three'
import { LetterScene } from '../src/scenes/LetterScene.js'

const letter = new LetterScene()
letter.mount({ qualityMode: 'full', reducedMotion: false, renderer: {}, scene: new Scene() })

const back = letter.envelope.getObjectByName('letter-envelope-back-layer')
const paper = letter.envelope.getObjectByName('letter-paper-group')
const pocket = letter.envelope.getObjectByName('letter-pocket-occluder-layer')
const flap = letter.envelope.getObjectByName('letter-flap-hinge')
assert.ok(back && paper && pocket && flap)
for (const layer of [back, paper, pocket, flap]) assert.equal(layer.parent, letter.envelope)

letter.applyOpenPose(0)
letter.envelope.updateMatrixWorld(true)
const paperBounds = new Box3().setFromObject(paper)
const backBounds = new Box3().setFromObject(back)
assert.ok(paperBounds.min.x > backBounds.min.x && paperBounds.max.x < backBounds.max.x)
assert.ok(paperBounds.min.y > backBounds.min.y && paperBounds.max.y < backBounds.max.y)
assert.ok(back.children[0].position.z < paper.position.z)
assert.ok(paper.position.z < pocket.children[0].position.z)
assert.ok(pocket.children[0].position.z < flap.position.z)

const closedY = paper.position.y
letter.applyOpenPose(0.25)
assert.equal(paper.position.y, closedY)
assert.ok(flap.rotation.x < -Math.PI * 0.25)

letter.applyOpenPose(0.5)
const middleY = paper.position.y
assert.ok(middleY > closedY)
assert.ok(flap.rotation.x < -Math.PI * 0.9)
assert.ok(flap.position.z < paper.position.z)

letter.applyOpenPose(0.75)
const lateY = paper.position.y
assert.ok(lateY > middleY && flap.position.z < paper.position.z)

letter.applyOpenPose(1)
letter.envelope.updateMatrixWorld(true)
assert.ok(paper.position.y > lateY)
assert.ok(new Box3().setFromObject(paper).max.y > backBounds.max.y)
assert.ok(flap.position.z < back.children[0].position.z)

letter.dispose()
console.log('Refinement R6.3 envelope layer verification passed')
