import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Color,
  Points,
  ShaderMaterial,
} from 'three'

const DEFAULT_COUNTS = {
  full: 1_400,
  lite: 420,
}

const vertexShader = /* glsl */ `
  attribute float aPhase;
  attribute float aScale;
  attribute float aSpeed;

  uniform float uPixelRatio;
  uniform float uTime;

  varying float vTwinkle;

  void main() {
    vec4 modelPosition = modelMatrix * vec4(position, 1.0);
    vec4 viewPosition = viewMatrix * modelPosition;
    float pulse = 0.72 + 0.28 * sin(uTime * aSpeed + aPhase);

    vTwinkle = pulse;
    gl_Position = projectionMatrix * viewPosition;
    gl_PointSize = aScale * pulse * uPixelRatio * (16.0 / max(1.0, -viewPosition.z));
  }
`

const fragmentShader = /* glsl */ `
  uniform vec3 uColorA;
  uniform vec3 uColorB;

  varying float vTwinkle;

  void main() {
    vec2 centered = gl_PointCoord - vec2(0.5);
    float radius = length(centered);
    float core = 1.0 - smoothstep(0.03, 0.5, radius);
    float rayX = 1.0 - smoothstep(0.0, 0.075, abs(centered.x));
    float rayY = 1.0 - smoothstep(0.0, 0.075, abs(centered.y));
    float rays = max(rayX, rayY) * (1.0 - smoothstep(0.08, 0.5, radius));
    float alpha = max(core, rays * 0.5) * (0.42 + vTwinkle * 0.58);

    if (alpha < 0.02) discard;

    vec3 color = mix(uColorA, uColorB, vTwinkle);
    gl_FragColor = vec4(color, alpha);
  }
`

function seededRandom(seed) {
  let value = seed >>> 0

  return () => {
    value = (value * 1_664_525 + 1_013_904_223) >>> 0
    return value / 4_294_967_296
  }
}

export class ParticleSystem {
  constructor({
    colorA = 0xffa6d1,
    colorB = 0xffe4a8,
    counts = DEFAULT_COUNTS,
    qualityMode = 'full',
    radius = { min: 8, max: 28 },
    seed = 1_111,
  } = {}) {
    this.counts = { ...DEFAULT_COUNTS, ...counts }
    this.qualityMode = qualityMode
    this.radius = radius
    this.seed = seed
    this.geometry = new BufferGeometry()
    this.material = new ShaderMaterial({
      blending: AdditiveBlending,
      depthWrite: false,
      fragmentShader,
      transparent: true,
      uniforms: {
        uColorA: { value: new Color(colorA) },
        uColorB: { value: new Color(colorB) },
        uPixelRatio: { value: 1 },
        uTime: { value: 0 },
      },
      vertexShader,
    })
    this.points = new Points(this.geometry, this.material)
    this.points.frustumCulled = false
    this.rebuildGeometry()
  }

  rebuildGeometry() {
    const count = this.counts[this.qualityMode] ?? this.counts.full
    const previousGeometry = this.geometry
    const nextGeometry = new BufferGeometry()
    const positions = new Float32Array(count * 3)
    const phases = new Float32Array(count)
    const scales = new Float32Array(count)
    const speeds = new Float32Array(count)
    const random = seededRandom(this.seed)

    for (let index = 0; index < count; index += 1) {
      const distance = this.radius.min + random() * (this.radius.max - this.radius.min)
      const theta = random() * Math.PI * 2
      const y = random() * 2 - 1
      const horizontalRadius = Math.sqrt(1 - y * y)
      const offset = index * 3

      positions[offset] = Math.cos(theta) * horizontalRadius * distance
      positions[offset + 1] = y * distance
      positions[offset + 2] = Math.sin(theta) * horizontalRadius * distance
      phases[index] = random() * Math.PI * 2
      scales[index] = 1.8 + random() * 4.2
      speeds[index] = 0.45 + random() * 1.25
    }

    nextGeometry.setAttribute('position', new BufferAttribute(positions, 3))
    nextGeometry.setAttribute('aPhase', new BufferAttribute(phases, 1))
    nextGeometry.setAttribute('aScale', new BufferAttribute(scales, 1))
    nextGeometry.setAttribute('aSpeed', new BufferAttribute(speeds, 1))
    nextGeometry.computeBoundingSphere()

    this.geometry = nextGeometry
    if (this.points) {
      this.points.geometry = nextGeometry
    }
    previousGeometry?.dispose()
  }

  setPixelRatio(pixelRatio) {
    this.material.uniforms.uPixelRatio.value = Math.min(pixelRatio, 2)
  }

  setQualityMode(nextMode) {
    if (!this.counts[nextMode] || nextMode === this.qualityMode) {
      return
    }

    this.qualityMode = nextMode
    this.rebuildGeometry()
  }

  update({ elapsedSeconds, reducedMotion = false }) {
    this.material.uniforms.uTime.value = reducedMotion ? 0 : elapsedSeconds

    if (!reducedMotion) {
      this.points.rotation.y = elapsedSeconds * 0.006
      this.points.rotation.x = Math.sin(elapsedSeconds * 0.035) * 0.015
    }
  }

  dispose() {
    this.geometry.dispose()
    this.material.dispose()
  }
}
