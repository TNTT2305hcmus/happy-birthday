import {
  BufferAttribute,
  BufferGeometry,
  Color,
  DynamicDrawUsage,
  Points,
  ShaderMaterial,
} from 'three'

const PARTICLE_COUNTS = {
  full: 80,
  lite: 36,
}

const vertexShader = /* glsl */ `
  attribute float aLife;
  attribute float aSize;
  uniform float uPixelRatio;
  varying float vLife;

  void main() {
    vec4 viewPosition = modelViewMatrix * vec4(position, 1.0);
    vLife = aLife;
    gl_Position = projectionMatrix * viewPosition;
    gl_PointSize = aSize * uPixelRatio * (7.0 / max(1.0, -viewPosition.z));
  }
`

const fragmentShader = /* glsl */ `
  uniform vec3 uColor;
  varying float vLife;

  void main() {
    vec2 centered = gl_PointCoord - vec2(0.5);
    float radius = length(centered);
    float softCircle = 1.0 - smoothstep(0.08, 0.5, radius);
    float fadeIn = smoothstep(0.0, 0.12, vLife);
    float fadeOut = 1.0 - smoothstep(0.28, 1.0, vLife);
    float alpha = softCircle * fadeIn * fadeOut * 0.42;
    if (alpha < 0.01) discard;
    gl_FragColor = vec4(uColor, alpha);
  }
`

function createRandom(seed = 1_112) {
  let value = seed >>> 0
  return () => {
    value = (value * 1_664_525 + 1_013_904_223) >>> 0
    return value / 4_294_967_296
  }
}

export class CandleSmoke {
  constructor({ qualityMode = 'full' } = {}) {
    this.qualityMode = qualityMode
    this.cursor = 0
    this.random = createRandom()
    this.material = new ShaderMaterial({
      depthWrite: false,
      fragmentShader,
      transparent: true,
      uniforms: {
        uColor: { value: new Color(0xb9aac4) },
        uPixelRatio: { value: 1 },
      },
      vertexShader,
    })
    this.points = new Points(new BufferGeometry(), this.material)
    this.points.name = 'candle-smoke-particles'
    this.points.frustumCulled = false
    this.rebuild()
  }

  rebuild() {
    const count = PARTICLE_COUNTS[this.qualityMode] ?? PARTICLE_COUNTS.full
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

  emit(origin, amount = 10) {
    for (let particle = 0; particle < amount; particle += 1) {
      const index = this.cursor
      const offset = index * 3
      this.positions[offset] = origin.x + (this.random() - 0.5) * 0.06
      this.positions[offset + 1] = origin.y + this.random() * 0.035
      this.positions[offset + 2] = origin.z + (this.random() - 0.5) * 0.06
      this.velocities[offset] = (this.random() - 0.5) * 0.08
      this.velocities[offset + 1] = 0.18 + this.random() * 0.14
      this.velocities[offset + 2] = (this.random() - 0.5) * 0.055
      this.lives[index] = 0
      this.sizes[index] = 4.5 + this.random() * 5.5
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
      this.lives[index] = Math.min(1, this.lives[index] + delta / 2.1)
      this.positions[offset] += this.velocities[offset] * delta
      this.positions[offset + 1] += this.velocities[offset + 1] * delta
      this.positions[offset + 2] += this.velocities[offset + 2] * delta
      this.velocities[offset] += Math.sin(this.lives[index] * Math.PI * 3) * delta * 0.018
      this.velocities[offset + 1] *= 1 - delta * 0.12
      changed = true
    }

    if (changed) {
      this.geometry.getAttribute('position').needsUpdate = true
      this.geometry.getAttribute('aLife').needsUpdate = true
    }
  }

  reset() {
    this.lives.fill(1)
    this.positions.fill(0)
    this.velocities.fill(0)
    this.geometry.getAttribute('position').needsUpdate = true
    this.geometry.getAttribute('aLife').needsUpdate = true
  }

  setPixelRatio(pixelRatio) {
    this.material.uniforms.uPixelRatio.value = Math.min(pixelRatio, 2)
  }

  setQualityMode(nextMode) {
    if (!PARTICLE_COUNTS[nextMode] || nextMode === this.qualityMode) return
    this.qualityMode = nextMode
    this.rebuild()
  }

  dispose() {
    this.geometry?.dispose()
    this.material.dispose()
  }
}
