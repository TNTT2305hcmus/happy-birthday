import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Color,
  DynamicDrawUsage,
  Points,
  ShaderMaterial,
  Vector3,
} from 'three'

const MAX_PARTICLES = 96
const PARTICLE_COUNTS = Object.freeze({ full: 96, lite: 40 })

export const WISH_CONVERGENCE_BUDGET = Object.freeze({
  drawCalls: 1,
  particles: PARTICLE_COUNTS,
})

export const WISH_CONVERGENCE_TIMING = Object.freeze({
  full: Object.freeze({ settleSeconds: 0.24, travelSeconds: 1.55 }),
  reduced: Object.freeze({ settleSeconds: 0.08, travelSeconds: 0.52 }),
})

const vertexShader = [
  'attribute float aColorMix;',
  'attribute float aSize;',
  'uniform float uOpacity;',
  'uniform float uPixelRatio;',
  'varying float vColorMix;',
  'varying float vOpacity;',
  'void main() {',
  '  vec4 viewPosition = modelViewMatrix * vec4(position, 1.0);',
  '  gl_Position = projectionMatrix * viewPosition;',
  '  gl_PointSize = aSize * uPixelRatio;',
  '  vColorMix = aColorMix;',
  '  vOpacity = uOpacity;',
  '}',
].join('\n')

const fragmentShader = [
  'uniform vec3 uGold;',
  'uniform vec3 uPink;',
  'varying float vColorMix;',
  'varying float vOpacity;',
  'void main() {',
  '  vec2 point = gl_PointCoord - 0.5;',
  '  float angle = atan(point.y, point.x);',
  '  float radius = length(point);',
  '  float starEdge = 0.28 + 0.16 * pow(0.5 + 0.5 * cos(angle * 5.0), 2.5);',
  '  float alpha = 1.0 - smoothstep(starEdge - 0.07, starEdge, radius);',
  '  float core = 1.0 - smoothstep(0.0, 0.16, radius);',
  '  vec3 color = mix(uPink, uGold, vColorMix) + core * 0.32;',
  '  if (alpha < 0.01) discard;',
  '  gl_FragColor = vec4(color, alpha * vOpacity);',
  '}',
].join('\n')

function hashWish(wish) {
  let hash = 2_166_136_261
  for (let index = 0; index < wish.length; index += 1) {
    hash ^= wish.charCodeAt(index)
    hash = Math.imul(hash, 16_777_619)
  }
  return hash >>> 0
}

function createRandom(seed) {
  let value = seed || 1
  return () => {
    value = (Math.imul(value, 1_664_525) + 1_013_904_223) >>> 0
    return value / 4_294_967_296
  }
}

function smoothstep(value) {
  const clamped = Math.max(0, Math.min(1, value))
  return clamped * clamped * (3 - 2 * clamped)
}

export class WishParticleConvergence {
  constructor({ pixelRatio = 1, qualityMode = 'full' } = {}) {
    this.qualityMode = qualityMode
    this.positions = new Float32Array(MAX_PARTICLES * 3)
    this.sizes = new Float32Array(MAX_PARTICLES)
    this.colorMixes = new Float32Array(MAX_PARTICLES)
    this.angles = new Float32Array(MAX_PARTICLES)
    this.radii = new Float32Array(MAX_PARTICLES)
    this.lifts = new Float32Array(MAX_PARTICLES)
    this.delays = new Float32Array(MAX_PARTICLES)
    this.twists = new Float32Array(MAX_PARTICLES)
    this.start = new Vector3()
    this.target = new Vector3()
    this.desiredStart = new Vector3()
    this.desiredTarget = new Vector3()
    this.control = new Vector3()
    this.active = false
    this.elapsed = 0
    this.progress = 0
    this.wishSeed = 0

    this.geometry = new BufferGeometry()
    const positionAttribute = new BufferAttribute(this.positions, 3)
    positionAttribute.setUsage(DynamicDrawUsage)
    this.geometry.setAttribute('position', positionAttribute)
    this.geometry.setAttribute('aSize', new BufferAttribute(this.sizes, 1))
    this.geometry.setAttribute('aColorMix', new BufferAttribute(this.colorMixes, 1))

    this.material = new ShaderMaterial({
      blending: AdditiveBlending,
      depthWrite: false,
      fragmentShader,
      transparent: true,
      uniforms: {
        uGold: { value: new Color(0xffc257) },
        uOpacity: { value: 1 },
        uPink: { value: new Color(0xff64b3) },
        uPixelRatio: { value: Math.max(0.5, pixelRatio) },
      },
      vertexShader,
    })
    this.points = new Points(this.geometry, this.material)
    this.points.name = 'wish-particle-convergence'
    this.points.frustumCulled = false
    this.points.renderOrder = 18
    this.points.visible = false
    this.setQualityMode(qualityMode)
  }

  setPixelRatio(pixelRatio) {
    this.material.uniforms.uPixelRatio.value = Math.max(0.5, Number(pixelRatio) || 1)
  }

  setQualityMode(nextMode) {
    if (!PARTICLE_COUNTS[nextMode]) return
    this.qualityMode = nextMode
    this.geometry.setDrawRange(0, PARTICLE_COUNTS[nextMode])
  }

  seedParticles(wish) {
    this.wishSeed = hashWish(wish)
    const random = createRandom(this.wishSeed)
    for (let index = 0; index < MAX_PARTICLES; index += 1) {
      this.angles[index] = random() * Math.PI * 2
      this.radii[index] = 0.16 + random() * 0.52
      this.lifts[index] = (random() - 0.2) * 0.46
      this.delays[index] = random() * 0.2
      this.twists[index] = (random() < 0.5 ? -1 : 1) * (1.2 + random() * 2.6)
      this.sizes[index] = 5.5 + random() * 5.5
      this.colorMixes[index] = random()
    }
    this.geometry.attributes.aSize.needsUpdate = true
    this.geometry.attributes.aColorMix.needsUpdate = true
  }

  updateControl() {
    this.control.lerpVectors(this.start, this.target, 0.52)
    this.control.y += Math.max(0.28, this.start.distanceTo(this.target) * 0.12)
  }

  setAnchors(start, target) {
    if (!start || !target) return false
    this.desiredStart.copy(start)
    this.desiredTarget.copy(target)
    if (!this.active) {
      this.start.copy(start)
      this.target.copy(target)
      this.updateControl()
    }
    return true
  }

  launch({ from, to, wish = '' }) {
    this.active = false
    if (!this.setAnchors(from, to)) return false
    this.seedParticles(String(wish))
    return this.beginFlight()
  }

  launchContinuation({ from, to }) {
    this.active = false
    if (!this.setAnchors(from, to)) return false
    return this.beginFlight()
  }

  beginFlight() {
    this.active = true
    this.elapsed = 0
    this.progress = 0
    this.material.uniforms.uOpacity.value = 1
    this.points.visible = true
    this.updatePositions(0, false)
    return true
  }

  updatePositions(progress, reducedMotion) {
    const count = PARTICLE_COUNTS[this.qualityMode]
    const spreadScale = reducedMotion ? 0.18 : 1
    for (let index = 0; index < count; index += 1) {
      const offset = index * 3
      const particleProgress = smoothstep(
        (progress - this.delays[index]) / Math.max(0.001, 1 - this.delays[index]),
      )
      const remaining = 1 - particleProgress
      const pathX = remaining * remaining * this.start.x
        + 2 * remaining * particleProgress * this.control.x
        + particleProgress * particleProgress * this.target.x
      const pathY = remaining * remaining * this.start.y
        + 2 * remaining * particleProgress * this.control.y
        + particleProgress * particleProgress * this.target.y
      const pathZ = remaining * remaining * this.start.z
        + 2 * remaining * particleProgress * this.control.z
        + particleProgress * particleProgress * this.target.z
      const scatter = Math.sin(particleProgress * Math.PI) * this.radii[index] * spreadScale
      const angle = this.angles[index] + particleProgress * Math.PI * this.twists[index]

      this.positions[offset] = pathX + Math.cos(angle) * scatter
      this.positions[offset + 1] = pathY + Math.sin(angle) * scatter * 0.72
        + Math.sin(particleProgress * Math.PI) * this.lifts[index] * spreadScale
      this.positions[offset + 2] = pathZ + Math.sin(angle * 0.7) * scatter * 0.34
    }
    this.geometry.attributes.position.needsUpdate = true
  }

  update(delta, reducedMotion = false) {
    if (!this.active) return false
    this.elapsed += delta
    const anchorSmoothing = 1 - Math.exp(-delta * 12)
    this.start.lerp(this.desiredStart, anchorSmoothing)
    this.target.lerp(this.desiredTarget, anchorSmoothing)
    this.updateControl()
    const timing = reducedMotion
      ? WISH_CONVERGENCE_TIMING.reduced
      : WISH_CONVERGENCE_TIMING.full
    this.progress = Math.min(1, this.elapsed / timing.travelSeconds)
    this.updatePositions(this.progress, reducedMotion)
    this.material.uniforms.uOpacity.value = this.progress < 0.08
      ? this.progress / 0.08
      : 1

    if (this.elapsed < timing.travelSeconds + timing.settleSeconds) return false
    this.target.copy(this.desiredTarget)
    this.updateControl()
    this.updatePositions(1, reducedMotion)
    this.active = false
    this.points.visible = false
    return true
  }

  reset() {
    this.active = false
    this.elapsed = 0
    this.progress = 0
    this.points.visible = false
    this.material.uniforms.uOpacity.value = 1
    this.updatePositions(0, false)
  }

  dispose() {
    this.reset()
    this.geometry.dispose()
    this.material.dispose()
    this.points.clear()
  }
}
