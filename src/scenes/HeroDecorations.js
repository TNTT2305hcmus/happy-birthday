import {
  CylinderGeometry,
  ExtrudeGeometry,
  Group,
  Mesh,
  MeshStandardMaterial,
  Shape,
} from 'three'

function createHeartGeometry() {
  const heart = new Shape()
  heart.moveTo(0, -0.32)
  heart.bezierCurveTo(-0.52, -0.02, -0.58, 0.35, -0.27, 0.43)
  heart.bezierCurveTo(-0.08, 0.48, 0, 0.34, 0, 0.24)
  heart.bezierCurveTo(0, 0.34, 0.08, 0.48, 0.27, 0.43)
  heart.bezierCurveTo(0.58, 0.35, 0.52, -0.02, 0, -0.32)
  return new ExtrudeGeometry(heart, {
    bevelEnabled: true,
    bevelSegments: 3,
    bevelSize: 0.035,
    bevelThickness: 0.025,
    curveSegments: 12,
    depth: 0.07,
  })
}

function createBalloon({ color, name, position, scale, stringLength = 0.9 }) {
  const group = new Group()
  group.name = name
  const heart = new Mesh(
    createHeartGeometry(),
    new MeshStandardMaterial({
      color,
      emissive: color,
      emissiveIntensity: 0.08,
      metalness: 0.03,
      roughness: 0.42,
    }),
  )
  heart.name = `${name}-heart`
  heart.scale.setScalar(scale)
  const string = new Mesh(
    new CylinderGeometry(0.006, 0.006, stringLength, 10),
    new MeshStandardMaterial({ color: 0xc590a9, roughness: 0.88 }),
  )
  string.name = `${name}-string`
  string.position.set(0, -0.32 * scale - stringLength * 0.5, 0.01)
  string.rotation.z = 0.045
  group.position.set(...position)
  group.add(heart, string)
  return group
}

export class HeroDecorations {
  constructor({ qualityMode = 'full' } = {}) {
    this.group = new Group()
    this.group.name = 'hero-static-decorations'
    this.qualityMode = qualityMode
    this.balloons = [
      createBalloon({ color: 0xf3a2c7, name: 'hero-heart-balloon-one', position: [0.56, 1.22, -0.48], scale: 0.68, stringLength: 0.8 }),
      createBalloon({ color: 0xc7aff6, name: 'hero-heart-balloon-two', position: [1.48, -0.42, -0.34], scale: 0.56, stringLength: 0.74 }),
      createBalloon({ color: 0xffd58a, name: 'hero-heart-balloon-three', position: [2.4, 0.78, -0.52], scale: 0.63, stringLength: 0.88 }),
      createBalloon({ color: 0xee91b9, name: 'hero-heart-balloon-four', position: [3.18, -0.68, -0.3], scale: 0.47, stringLength: 0.6 }),
    ]
    this.balloons.forEach((balloon, index) => {
      balloon.userData.basePosition = balloon.position.clone()
      balloon.userData.baseRotationZ = balloon.rotation.z
      balloon.userData.swayPhase = index * 1.73
    })
    this.group.add(...this.balloons)
  }

  resize({ height = 900, width = 1_440 } = {}) {
    const aspect = width / Math.max(1, height)
    if (width < 700) {
      this.group.scale.setScalar(0.58)
      this.group.position.set(0.22, -0.08, 0)
      this.balloons.forEach((balloon, index) => { balloon.visible = index < 2 })
      return
    }
    this.group.position.set(0, 0, 0)
    this.group.scale.setScalar(aspect < 1.35 ? 0.82 : 1)
    this.balloons.forEach((balloon) => { balloon.visible = true })
  }

  update({ elapsedSeconds = 0, reducedMotion = false } = {}) {
    this.balloons.forEach((balloon) => {
      const { basePosition, baseRotationZ, swayPhase } = balloon.userData
      if (reducedMotion) {
        balloon.position.copy(basePosition)
        balloon.rotation.set(0, 0, baseRotationZ)
        return
      }
      const slowTime = elapsedSeconds * 0.72 + swayPhase
      balloon.position.set(
        basePosition.x + Math.sin(slowTime * 0.83) * 0.012,
        basePosition.y + Math.sin(slowTime) * 0.018,
        basePosition.z,
      )
      balloon.rotation.set(0, Math.cos(slowTime * 0.7) * 0.018, baseRotationZ + Math.sin(slowTime) * 0.012)
    })
  }

  setQualityMode(nextMode) {
    this.qualityMode = nextMode
  }

  dispose() {
    this.group.parent?.remove(this.group)
    const geometries = new Set()
    const materials = new Set()
    this.group.traverse((object) => {
      if (object.geometry) geometries.add(object.geometry)
      if (Array.isArray(object.material)) object.material.forEach((material) => materials.add(material))
      else if (object.material) materials.add(object.material)
    })
    geometries.forEach((geometry) => geometry.dispose())
    materials.forEach((material) => material.dispose())
    this.group.clear()
  }
}
