import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Color,
  DynamicDrawUsage,
  Points,
  ShaderMaterial,
} from 'three'

const DEFAULT_COUNTS = {
  full: 96,
  lite: 32,
}

const vertexShader = /* glsl */ `
  attribute float aLife;
  attribute float aSize;

  uniform float uPixelRatio;

  varying float vLife;

  void main() {
    vec4 viewPosition = modelViewMatrix * vec4(position, 1.0);
    float remaining = 1.0 - aLife;

    vLife = aLife;
    gl_Position = projectionMatrix * viewPosition;
    gl_PointSize = aSize * remaining * uPixelRatio * (8.0 / max(1.0, -viewPosition.z));
  }
`

const fragmentShader = /* glsl */ `
  uniform vec3 uColorFresh;
  uniform vec3 uColorWarm;

  varying float vLife;

  void main() {
    vec2 centered = gl_PointCoord - vec2(0.5);
    float radius = length(centered);
    float core = 1.0 - smoothstep(0.02, 0.48, radius);
    float rayX = 1.0 - smoothstep(0.0, 0.07, abs(centered.x));
    float rayY = 1.0 - smoothstep(0.0, 0.07, abs(centered.y));
    float sparkle = max(core, max(rayX, rayY) * (1.0 - radius * 2.0) * 0.55);
    float alpha = sparkle * pow(1.0 - vLife, 1.7);

    if (alpha < 0.02) discard;
    gl_FragColor = vec4(mix(uColorFresh, uColorWarm, vLife), alpha);
  }
`

function createRandom(seed) {
  let value = seed >>> 0
  return () => {
    value = (value * 1_664_525 + 1_013_904_223) >>> 0
    return value / 4_294_967_296
  }
}

export class MagicTrail {
  constructor({ counts = DEFAULT_COUNTS, qualityMode = 'full' } = {}) {
    this.counts = { ...DEFAULT_COUNTS, ...counts }
    this.qualityMode = qualityMode
    this.cursor = 0
    this.random = createRandom(2_003)
    this.geometry = null
    this.positions = null
    this.lives = null
    this.sizes = null
    this.velocities = null
    this.material = new ShaderMaterial({
      blending: AdditiveBlending,
      depthWrite: false,
      fragmentShader,
      transparent: true,
      uniforms: {
        uColorFresh: { value: new Color(0xfffbff) },
        uColorWarm: { value: new Color(0xffd98a) },
        uPixelRatio: { value: 1 },
      },
      vertexShader,
    })
    this.points = new Points(new BufferGeometry(), this.material)
    this.points.name = 'fairy-magic-trail'
    this.points.frustumCulled = false
    this.rebuild()
  }

  rebuild() {
    const count = this.counts[this.qualityMode] ?? this.counts.full
    const previousGeometry = this.geometry
    const geometry = new BufferGeometry()

    this.positions = new Float32Array(count * 3)
    this.lives = new Float32Array(count).fill(1)
    this.sizes = new Float32Array(count)
    this.velocities = new Float32Array(count * 3)

    const positionAttribute = new BufferAttribute(this.positions, 3)
    const lifeAttribute = new BufferAttribute(this.lives, 1)
    positionAttribute.setUsage(DynamicDrawUsage)
    lifeAttribute.setUsage(DynamicDrawUsage)
    geometry.setAttribute('position', positionAttribute)
    geometry.setAttribute('aLife', lifeAttribute)
    geometry.setAttribute('aSize', new BufferAttribute(this.sizes, 1))

    this.geometry = geometry
    this.points.geometry = geometry
    this.cursor = 0
    previousGeometry?.dispose()
  }

  emit(position, energy = 0.5) {
    const amount = Math.max(1, Math.min(4, Math.round(1 + energy * 3)))

    for (let particle = 0; particle < amount; particle += 1) {
      const index = this.cursor
      const offset = index * 3
      const spread = 0.025 + energy * 0.035

      this.positions[offset] = position.x + (this.random() - 0.5) * spread
      this.positions[offset + 1] = position.y + (this.random() - 0.5) * spread
      this.positions[offset + 2] = position.z + (this.random() - 0.5) * spread
      this.velocities[offset] = (this.random() - 0.5) * 0.12
      this.velocities[offset + 1] = 0.06 + this.random() * 0.12
      this.velocities[offset + 2] = (this.random() - 0.5) * 0.08
      this.lives[index] = 0
      this.sizes[index] = 2.2 + this.random() * 3.8
      this.cursor = (this.cursor + 1) % this.lives.length
    }

    this.geometry.getAttribute('position').needsUpdate = true
    this.geometry.getAttribute('aLife').needsUpdate = true
    this.geometry.getAttribute('aSize').needsUpdate = true
  }

  update(delta) {
    let changed = false

    for (let index = 0; index < this.lives.length; index += 1) {
      if (this.lives[index] >= 1) continue

      const offset = index * 3
      this.lives[index] = Math.min(1, this.lives[index] + delta / 1.05)
      this.positions[offset] += this.velocities[offset] * delta
      this.positions[offset + 1] += this.velocities[offset + 1] * delta
      this.positions[offset + 2] += this.velocities[offset + 2] * delta
      this.velocities[offset + 1] -= 0.035 * delta
      changed = true
    }

    if (changed) {
      this.geometry.getAttribute('position').needsUpdate = true
      this.geometry.getAttribute('aLife').needsUpdate = true
    }
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
