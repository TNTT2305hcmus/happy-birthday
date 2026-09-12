import {
  DoubleSide,
  ExtrudeGeometry,
  Group,
  Mesh,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  Shape,
  SphereGeometry,
  Vector3,
} from 'three'

function createHeartGeometry() {
  const heart = new Shape()
  heart.moveTo(0, -0.28)
  heart.bezierCurveTo(-0.48, -0.02, -0.5, 0.32, -0.24, 0.39)
  heart.bezierCurveTo(-0.08, 0.44, 0, 0.3, 0, 0.21)
  heart.bezierCurveTo(0, 0.3, 0.08, 0.44, 0.24, 0.39)
  heart.bezierCurveTo(0.5, 0.32, 0.48, -0.02, 0, -0.28)
  return new ExtrudeGeometry(heart, {
    bevelEnabled: true,
    bevelSegments: 2,
    bevelSize: 0.025,
    bevelThickness: 0.018,
    curveSegments: 8,
    depth: 0.045,
  })
}

function createWingedHeart({ color, name }) {
  const group = new Group()
  group.name = name
  const heart = new Mesh(
    createHeartGeometry(),
    new MeshStandardMaterial({
      color,
      emissive: color,
      emissiveIntensity: 0.16,
      roughness: 0.46,
    }),
  )
  heart.name = `${name}-heart`
  heart.scale.setScalar(0.32)

  const wingMaterial = new MeshPhysicalMaterial({
    color: 0xfff8ff,
    depthWrite: false,
    opacity: 0.7,
    roughness: 0.24,
    side: DoubleSide,
    transparent: true,
  })
  const wings = [-1, 1].map((side) => {
    const wing = new Mesh(new SphereGeometry(0.12, 8, 6), wingMaterial)
    wing.name = `${name}-wing-${side < 0 ? 'left' : 'right'}`
    wing.position.set(side * 0.16, 0.04, -0.02)
    wing.scale.set(0.85, 0.34, 0.12)
    wing.rotation.z = side * 0.42
    group.add(wing)
    return wing
  })
  group.add(heart)
  group.userData.wings = wings
  return group
}

export class HeroCompanions {
  constructor({ qualityMode = 'full' } = {}) {
    this.group = new Group()
    this.group.name = 'hero-r39-card-companions'
    this.cardAnchor = new Vector3(-1.62, -0.04, 0.24)
    this.qualityMode = qualityMode
    this.isCompact = false
    this.companions = [
      createWingedHeart({ color: 0xff9ecf, name: 'hero-winged-heart-one' }),
      createWingedHeart({ color: 0xc9b6ff, name: 'hero-winged-heart-two' }),
    ]
    this.companions.forEach((companion, index) => {
      companion.userData.phase = index * Math.PI
    })
    this.group.add(...this.companions)
    this.resize()
    this.setQualityMode(qualityMode)
  }

  resize({ height = 900, width = 1_440 } = {}) {
    const aspect = width / Math.max(1, height)
    this.isCompact = width < 700
    if (this.isCompact) {
      this.cardAnchor.set(0, 0.12, 0.2)
    } else if (aspect < 1.35) {
      this.cardAnchor.set(-1.28, -0.02, 0.24)
    } else {
      this.cardAnchor.set(-1.62, -0.04, 0.24)
    }
    this.applyVisibility()
  }

  setActive(isActive) {
    this.group.visible = Boolean(isActive)
  }

  setQualityMode(nextMode) {
    this.qualityMode = nextMode
    this.applyVisibility()
  }

  applyVisibility() {
    this.companions[0].visible = true
    this.companions[1].visible = this.qualityMode !== 'lite' && !this.isCompact
  }

  update({ elapsedSeconds = 0, reducedMotion = false } = {}) {
    this.companions.forEach((companion, index) => {
      const phase = companion.userData.phase
      const angle = reducedMotion ? phase + 0.72 : elapsedSeconds * (0.4 + index * 0.055) + phase
      const radiusX = this.isCompact ? 1.02 : 1.58
      const radiusY = this.isCompact ? 0.82 : 1.18
      companion.position.set(
        this.cardAnchor.x + Math.cos(angle) * radiusX,
        this.cardAnchor.y + Math.sin(angle) * radiusY,
        this.cardAnchor.z + Math.sin(angle) * 0.08,
      )
      companion.rotation.z = reducedMotion ? (index === 0 ? -0.12 : 0.12) : Math.sin(angle) * 0.18
      companion.userData.wings.forEach((wing, wingIndex) => {
        const side = wingIndex === 0 ? -1 : 1
        wing.rotation.z = side * (reducedMotion ? 0.42 : 0.42 + Math.sin(elapsedSeconds * 9 + phase) * 0.18)
      })
    })
  }

  dispose() {
    const geometries = new Set()
    const materials = new Set()
    this.group.traverse((object) => {
      if (object.geometry) geometries.add(object.geometry)
      if (Array.isArray(object.material)) object.material.forEach((material) => materials.add(material))
      else if (object.material) materials.add(object.material)
    })
    geometries.forEach((geometry) => geometry.dispose())
    materials.forEach((material) => material.dispose())
    this.group.parent?.remove(this.group)
    this.group.clear()
  }
}
