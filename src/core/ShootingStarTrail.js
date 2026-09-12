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

const DEFAULT_COUNTS = { full: 30, lite: 14 }

const vertexShader = /* glsl */ `
  attribute float aAlpha;
  attribute float aSize;
  uniform float uPixelRatio;
  varying float vAlpha;

  void main() {
    vec4 viewPosition = modelViewMatrix * vec4(position, 1.0);
    vAlpha = aAlpha;
    gl_Position = projectionMatrix * viewPosition;
    gl_PointSize = aSize * uPixelRatio * (8.0 / max(1.0, -viewPosition.z));
  }
`

const fragmentShader = /* glsl */ `
  uniform vec3 uColorHead;
  uniform vec3 uColorTail;
  varying float vAlpha;

  void main() {
    vec2 centered = gl_PointCoord - vec2(0.5);
    float radius = length(centered);
    float core = 1.0 - smoothstep(0.02, 0.48, radius);
    float ray = max(
      1.0 - smoothstep(0.0, 0.055, abs(centered.x)),
      1.0 - smoothstep(0.0, 0.055, abs(centered.y))
    );
    float alpha = max(core, ray * 0.45) * vAlpha;
    if (alpha < 0.02) discard;
    gl_FragColor = vec4(mix(uColorTail, uColorHead, vAlpha), alpha);
  }
`

export class ShootingStarTrail {
  constructor({ counts = DEFAULT_COUNTS, qualityMode = 'full' } = {}) {
    this.counts = { ...DEFAULT_COUNTS, ...counts }
    this.qualityMode = qualityMode
    this.elapsed = 0
    this.duration = 1.25
    this.launchTimer = 2.8
    this.launchIndex = 0
    this.isFlying = false
    this.isActive = true
    this.start = new Vector3()
    this.end = new Vector3()
    this.geometry = null
    this.positions = null
    this.alphas = null
    this.sizes = null
    this.material = new ShaderMaterial({
      blending: AdditiveBlending,
      depthWrite: false,
      fragmentShader,
      transparent: true,
      uniforms: {
        uColorHead: { value: new Color(0xfffbff) },
        uColorTail: { value: new Color(0xffc8e3) },
        uPixelRatio: { value: 1 },
      },
      vertexShader,
    })
    this.points = new Points(new BufferGeometry(), this.material)
    this.points.name = 'hero-shooting-star-trail'
    this.points.frustumCulled = false
    this.rebuild()
  }

  rebuild() {
    const count = this.counts[this.qualityMode] ?? this.counts.full
    const previousGeometry = this.geometry
    this.positions = new Float32Array(count * 3)
    this.alphas = new Float32Array(count)
    this.sizes = new Float32Array(count)
    const geometry = new BufferGeometry()
    const positionAttribute = new BufferAttribute(this.positions, 3)
    const alphaAttribute = new BufferAttribute(this.alphas, 1)
    positionAttribute.setUsage(DynamicDrawUsage)
    alphaAttribute.setUsage(DynamicDrawUsage)
    geometry.setAttribute('position', positionAttribute)
    geometry.setAttribute('aAlpha', alphaAttribute)
    geometry.setAttribute('aSize', new BufferAttribute(this.sizes, 1))
    this.geometry = geometry
    this.points.geometry = geometry
    this.points.visible = false
    this.isFlying = false
    this.elapsed = 0
    previousGeometry?.dispose()
  }

  launch() {
    if (this.isFlying || !this.isActive) return false
    const variation = this.launchIndex % 3
    this.start.set(-3.35 + variation * 0.18, 1.82 - variation * 0.16, -0.62)
    this.end.set(1.05 + variation * 0.3, 0.55 - variation * 0.2, -0.5)
    this.launchIndex += 1
    this.elapsed = 0
    this.isFlying = true
    this.points.visible = true
    return true
  }

  update(delta, { reducedMotion = false } = {}) {
    if (!this.isActive || reducedMotion) {
      this.reset({ preserveTimer: true })
      return
    }
    if (!this.isFlying) {
      this.launchTimer -= delta
      if (this.launchTimer <= 0) this.launch()
      return
    }

    this.elapsed += delta
    const progress = Math.min(1, this.elapsed / this.duration)
    const count = this.alphas.length
    const tailLength = 0.34
    for (let index = 0; index < count; index += 1) {
      const tailOffset = index / Math.max(1, count - 1) * tailLength
      const pointProgress = progress - tailOffset
      const offset = index * 3
      if (pointProgress < 0 || pointProgress > 1) {
        this.alphas[index] = 0
        continue
      }
      const arc = Math.sin(pointProgress * Math.PI) * 0.1
      this.positions[offset] = this.start.x + (this.end.x - this.start.x) * pointProgress
      this.positions[offset + 1] = this.start.y + (this.end.y - this.start.y) * pointProgress + arc
      this.positions[offset + 2] = this.start.z + (this.end.z - this.start.z) * pointProgress
      this.alphas[index] = (1 - index / count) * Math.min(1, (1 - progress) * 5)
      this.sizes[index] = index === 0 ? 7.5 : 2.5 + (1 - index / count) * 2.5
    }
    this.geometry.getAttribute('position').needsUpdate = true
    this.geometry.getAttribute('aAlpha').needsUpdate = true
    this.geometry.getAttribute('aSize').needsUpdate = true

    if (progress >= 1) {
      this.reset()
      this.launchTimer = 5.6 + (this.launchIndex % 3) * 0.9
    }
  }

  reset({ preserveTimer = false } = {}) {
    this.isFlying = false
    this.points.visible = false
    this.alphas?.fill(0)
    if (!preserveTimer) this.elapsed = 0
  }

  setActive(isActive) {
    this.isActive = Boolean(isActive)
    if (!this.isActive) this.reset({ preserveTimer: true })
  }

  setPixelRatio(pixelRatio) {
    this.material.uniforms.uPixelRatio.value = Math.min(pixelRatio, 2)
  }

  setQualityMode(nextMode) {
    if (!this.counts[nextMode] || nextMode === this.qualityMode) return
    this.qualityMode = nextMode
    this.rebuild()
  }

  dispose() {
    this.geometry?.dispose()
    this.material.dispose()
  }
}
