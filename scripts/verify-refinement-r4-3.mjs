import assert from 'node:assert/strict'
import { PerspectiveCamera, Scene, Vector3 } from 'three'
import { CakeScene } from '../src/scenes/CakeScene.js'

const cake = new CakeScene()
const target = new Vector3()
assert.equal(cake.getTopperWorldPosition(target), null)
const camera = new PerspectiveCamera(45, 1470 / 850, 0.1, 100)
camera.position.z = 5
camera.updateMatrixWorld()
cake.mount({ camera, qualityMode: 'full', reducedMotion: false, renderer: { getPixelRatio: () => 2 }, scene: new Scene() })
cake.setActive(true)
const topper = cake.cake.getObjectByName('cake-star-topper')
const star = cake.cake.getObjectByName('cake-topper-star')
const stem = cake.cake.getObjectByName('cake-topper-stem')
assert.equal(topper.position.x, 0)
assert.equal(topper.position.z, 0)
assert.equal(topper.position.y + stem.position.y - stem.geometry.parameters.height / 2, 0.76)
const stemTop = stem.position.y + stem.geometry.parameters.height / 2
const lowerValley = star.position.y - 0.16
assert.ok(Math.abs(stemTop - lowerValley) < 1e-10, 'Stem must meet the valley between the two lower star tips')
star.geometry.computeBoundingBox()
assert.ok(star.geometry.boundingBox.max.y > Math.abs(star.geometry.boundingBox.min.y), 'One star tip must face upward')
assert.ok(Math.abs(star.geometry.boundingBox.min.z + star.geometry.boundingBox.max.z) < 1e-7)
const expectedLocal = new Vector3(0, 1.98, 0)
let samples = 0
for (const [width, height] of [[1470, 956], [1470, 850], [1440, 900], [390, 844]]) {
  camera.aspect = width / height
  camera.updateProjectionMatrix()
  cake.resize({ width, height })
  for (const reducedMotion of [false, true]) {
    cake.context.reducedMotion = reducedMotion
    for (const quality of ['full', 'lite']) {
      cake.setQualityMode(quality)
      for (const progress of [0, 0.5, 1, 0.5, 0]) {
        cake.setRevealProgress(progress)
        cake.setScrollProgress(progress)
        cake.update({ delta: 0.1, reducedMotion })
        // Parent matrices have not been rendered yet: the API must refresh them.
        const result = cake.getTopperWorldPosition(target)
        assert.equal(result, target)
        const expected = cake.cake.localToWorld(expectedLocal.clone())
        assert.ok(result.distanceTo(expected) < 1e-10)
        const local = cake.cake.worldToLocal(result.clone())
        assert.ok(Math.abs(local.x) < 1e-10 && Math.abs(local.z) < 1e-10)
        const projected = result.clone().project(camera)
        assert.ok(projected.toArray().every(Number.isFinite))
        samples += 1
      }
    }
  }
}
cake.setActive(false)
assert.ok(cake.getTopperWorldPosition(target))
const beforeReset = target.clone()
cake.handleResetRequest()
assert.ok(cake.getTopperWorldPosition(target).distanceTo(beforeReset) < 1e-10)
const independent = cake.getTopperWorldPosition()
independent.set(999, 999, 999)
assert.ok(cake.getTopperWorldPosition(target).distanceTo(beforeReset) < 1e-10)
cake.dispose()
assert.equal(cake.getTopperWorldPosition(target), null)
console.log(`R4.3 passed: ${samples} anchor samples across resize, scroll, reveal, quality and motion modes; reset/dispose passed.`)
