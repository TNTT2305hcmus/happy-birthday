import {
  Color,
  DoubleSide,
  DynamicDrawUsage,
  InstancedMesh,
  Matrix4,
  MeshBasicMaterial,
  Object3D,
  PlaneGeometry,
  Vector3,
} from 'three'

const MAX_PARTICLES = 180
const PARTICLE_COUNTS = { full: 180, lite: 72 }
const COLORS = [0xff9ecf, 0xc9b6ff, 0xffd98a, 0xfff9f3, 0xe477a8]

function createRandom(seed = 1_112) {
  let value = seed >>> 0
  return () => {
    value = (value * 1_664_525 + 1_013_904_223) >>> 0
    return value / 4_294_967_296
  }
}

export class CelebrationConfetti {
  constructor({ qualityMode = 'full' } = {}) {
    this.qualityMode = qualityMode
    this.random = createRandom()
    this.geometry = new PlaneGeometry(0.095, 0.045)
    this.material = new MeshBasicMaterial({
      depthWrite: false,
      opacity: 0.92,
      side: DoubleSide,
      transparent: true,
      vertexColors: true,
    })
    this.mesh = new InstancedMesh(this.geometry, this.material, MAX_PARTICLES)
    this.mesh.name = 'cake-celebration-confetti'
    this.mesh.frustumCulled = false
    this.mesh.instanceMatrix.setUsage(DynamicDrawUsage)
    this.mesh.count = PARTICLE_COUNTS[qualityMode]
    this.mesh.visible = false
    this.positions = new Float32Array(MAX_PARTICLES * 3)
    this.velocities = new Float32Array(MAX_PARTICLES * 3)
    this.rotations = new Float32Array(MAX_PARTICLES * 3)
    this.rotationSpeeds = new Float32Array(MAX_PARTICLES * 3)
    this.lives = new Float32Array(MAX_PARTICLES)
    this.durations = new Float32Array(MAX_PARTICLES)
    this.dummy = new Object3D()
    this.hiddenMatrix = new Matrix4().makeScale(0, 0, 0)
    this.origin = new Vector3()
    this.reset()

    for (let index = 0; index < MAX_PARTICLES; index += 1) {
      this.mesh.setColorAt(index, new Color(COLORS[index % COLORS.length]))
    }
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true
  }

  burst(origin = new Vector3(0, 1.7, 0.4)) {
    this.origin.copy(origin)
    this.mesh.visible = true
    const count = PARTICLE_COUNTS[this.qualityMode]
    this.mesh.count = count

    for (let index = 0; index < count; index += 1) {
      const offset = index * 3
      const angle = this.random() * Math.PI * 2
      const speed = 0.75 + this.random() * 1.65
      this.positions[offset] = origin.x + (this.random() - 0.5) * 0.35
      this.positions[offset + 1] = origin.y + this.random() * 0.22
      this.positions[offset + 2] = origin.z + (this.random() - 0.5) * 0.35
      this.velocities[offset] = Math.cos(angle) * speed
      this.velocities[offset + 1] = 1.6 + this.random() * 2.1
      this.velocities[offset + 2] = Math.sin(angle) * speed * 0.72
      this.rotations[offset] = this.random() * Math.PI
      this.rotations[offset + 1] = this.random() * Math.PI
      this.rotations[offset + 2] = this.random() * Math.PI
      this.rotationSpeeds[offset] = (this.random() - 0.5) * 8
      this.rotationSpeeds[offset + 1] = (this.random() - 0.5) * 8
      this.rotationSpeeds[offset + 2] = (this.random() - 0.5) * 8
      this.lives[index] = 0
      this.durations[index] = 2.1 + this.random() * 1.35
    }
    this.updateMatrices(0)
  }

  updateMatrices(delta) {
    let livingParticles = 0
    for (let index = 0; index < this.mesh.count; index += 1) {
      const offset = index * 3
      if (this.lives[index] >= this.durations[index]) {
        this.mesh.setMatrixAt(index, this.hiddenMatrix)
        continue
      }

      livingParticles += 1
      this.lives[index] += delta
      this.velocities[offset + 1] -= 2.65 * delta
      this.positions[offset] += this.velocities[offset] * delta
      this.positions[offset + 1] += this.velocities[offset + 1] * delta
      this.positions[offset + 2] += this.velocities[offset + 2] * delta
      this.rotations[offset] += this.rotationSpeeds[offset] * delta
      this.rotations[offset + 1] += this.rotationSpeeds[offset + 1] * delta
      this.rotations[offset + 2] += this.rotationSpeeds[offset + 2] * delta

      const remaining = 1 - this.lives[index] / this.durations[index]
      this.dummy.position.set(
        this.positions[offset],
        this.positions[offset + 1],
        this.positions[offset + 2],
      )
      this.dummy.rotation.set(
        this.rotations[offset],
        this.rotations[offset + 1],
        this.rotations[offset + 2],
      )
      this.dummy.scale.setScalar(Math.min(1, remaining * 4))
      this.dummy.updateMatrix()
      this.mesh.setMatrixAt(index, this.dummy.matrix)
    }
    this.mesh.instanceMatrix.needsUpdate = true
    if (livingParticles === 0) this.mesh.visible = false
  }

  update(delta, reducedMotion = false) {
    if (!this.mesh.visible) return
    this.updateMatrices(reducedMotion ? delta * 3 : delta)
  }

  reset() {
    this.lives.fill(Number.POSITIVE_INFINITY)
    for (let index = 0; index < MAX_PARTICLES; index += 1) {
      this.mesh.setMatrixAt(index, this.hiddenMatrix)
    }
    this.mesh.instanceMatrix.needsUpdate = true
    this.mesh.visible = false
  }

  setQualityMode(nextMode) {
    if (!PARTICLE_COUNTS[nextMode]) return
    this.qualityMode = nextMode
    this.mesh.count = PARTICLE_COUNTS[nextMode]
  }

  dispose() {
    this.geometry.dispose()
    this.material.dispose()
  }
}
