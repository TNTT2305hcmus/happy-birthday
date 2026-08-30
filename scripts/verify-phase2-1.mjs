import assert from 'node:assert/strict'
import { Scene } from 'three'
import { ParticleSystem } from '../src/core/ParticleSystem.js'
import { HeroScene } from '../src/scenes/HeroScene.js'

const particles = new ParticleSystem({
  counts: { full: 100, lite: 25 },
  qualityMode: 'full',
})

assert.equal(particles.geometry.getAttribute('position').count, 100)
assert.equal(particles.geometry.getAttribute('aPhase').count, 100)
particles.setQualityMode('lite')
assert.equal(particles.geometry.getAttribute('position').count, 25)
particles.update({ elapsedSeconds: 2, reducedMotion: false })
assert.equal(particles.material.uniforms.uTime.value, 2)
particles.update({ elapsedSeconds: 4, reducedMotion: true })
assert.equal(particles.material.uniforms.uTime.value, 0)
particles.dispose()

const scene = new Scene()
const heroScene = new HeroScene()
heroScene.mount({
  qualityMode: 'lite',
  renderer: { getPixelRatio: () => 1 },
  scene,
})

assert.equal(scene.getObjectByName('shared-hero-environment'), heroScene.group)
assert.ok(scene.getObjectByName('pink-lavender-gradient-sky'))
assert.ok(scene.getObjectByName('shared-star-particles'))
assert.ok(scene.getObjectByName('shared-hemisphere-light'))
assert.equal(heroScene.starField.geometry.getAttribute('position').count, 420)

heroScene.setQualityMode('full')
assert.equal(heroScene.starField.geometry.getAttribute('position').count, 1_400)
heroScene.dispose()
assert.equal(scene.getObjectByName('shared-hero-environment'), undefined)

console.log('Phase 2.1 verification passed: gradient sky, shared lights, and particle quality budgets.')
