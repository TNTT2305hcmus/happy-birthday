import {
  AmbientLight,
  BoxGeometry,
  DataTexture,
  DoubleSide,
  ExtrudeGeometry,
  Group,
  LinearFilter,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PointLight,
  RGBAFormat,
  Shape,
  SRGBColorSpace,
  UnsignedByteType,
} from 'three'
import {
  announceLetterState,
  LETTER_TOGGLE_REQUEST_EVENT,
} from './letterEvents.js'

const clamp = (value, min = 0, max = 1) => Math.max(min, Math.min(max, value))
const smoothstep = (value) => {
  const progress = clamp(value)
  return progress * progress * (3 - 2 * progress)
}

function roundedRectangle(width, height, radius) {
  const shape = new Shape()
  const left = -width / 2
  const right = width / 2
  const bottom = -height / 2
  const top = height / 2
  shape.moveTo(left + radius, bottom)
  shape.lineTo(right - radius, bottom)
  shape.quadraticCurveTo(right, bottom, right, bottom + radius)
  shape.lineTo(right, top - radius)
  shape.quadraticCurveTo(right, top, right - radius, top)
  shape.lineTo(left + radius, top)
  shape.quadraticCurveTo(left, top, left, top - radius)
  shape.lineTo(left, bottom + radius)
  shape.quadraticCurveTo(left, bottom, left + radius, bottom)
  return shape
}

function polygon(points) {
  const shape = new Shape()
  points.forEach(([x, y], index) => index ? shape.lineTo(x, y) : shape.moveTo(x, y))
  shape.closePath()
  return shape
}

function star(points = 5, outerRadius = 0.2, innerRadius = 0.09) {
  const shape = new Shape()
  for (let index = 0; index < points * 2; index += 1) {
    const radius = index % 2 === 0 ? outerRadius : innerRadius
    const angle = -Math.PI / 2 + index * Math.PI / points
    const x = Math.cos(angle) * radius
    const y = Math.sin(angle) * radius
    if (index) shape.lineTo(x, y)
    else shape.moveTo(x, y)
  }
  shape.closePath()
  return shape
}

function paperGrain(size = 64) {
  const data = new Uint8Array(size * size * 4)
  let seed = 1_111
  for (let index = 0; index < size * size; index += 1) {
    seed = (seed * 1_664_525 + 1_013_904_223) >>> 0
    const value = 232 + (seed % 24)
    const offset = index * 4
    data.set([value, Math.min(255, value + 2), Math.max(0, value - 5), 255], offset)
  }
  const texture = new DataTexture(data, size, size, RGBAFormat, UnsignedByteType)
  texture.colorSpace = SRGBColorSpace
  texture.magFilter = LinearFilter
  texture.minFilter = LinearFilter
  texture.needsUpdate = true
  texture.name = 'letter-paper-grain'
  return texture
}

function extrude(shape, material, depth = 0.055) {
  return new Mesh(new ExtrudeGeometry(shape, {
    bevelEnabled: true,
    bevelSegments: 2,
    bevelSize: 0.025,
    bevelThickness: 0.015,
    curveSegments: 10,
    depth,
  }), material)
}

function materialPalette(texture) {
  return {
    back: new MeshStandardMaterial({ color: 0xeaa0c5, roughness: 0.66, metalness: 0.02 }),
    front: new MeshStandardMaterial({ color: 0xf5b8d5, roughness: 0.6, metalness: 0.02, side: DoubleSide }),
    fold: new MeshStandardMaterial({ color: 0xdca5e9, roughness: 0.62, metalness: 0.02 }),
    gold: new MeshStandardMaterial({ color: 0xffd98a, emissive: 0x7d4218, emissiveIntensity: 0.14, metalness: 0.42, roughness: 0.3 }),
    ink: new MeshBasicMaterial({ color: 0xb58aa8, transparent: true, opacity: 0.34 }),
    paper: new MeshStandardMaterial({ color: 0xfffbef, map: texture, roughness: 0.9, metalness: 0 }),
    shadow: new MeshBasicMaterial({ color: 0x6f416d, side: DoubleSide, transparent: true, opacity: 0.16 }),
    wax: new MeshStandardMaterial({ color: 0xcf5d8e, emissive: 0x4c102c, emissiveIntensity: 0.08, roughness: 0.48 }),
  }
}

export class LetterScene {
  constructor() {
    this.group = new Group()
    this.group.name = 'birthday-letter-scene'
    this.letterModel = new Group()
    this.letterModel.name = 'birthday-letter-model'
    this.envelope = new Group()
    this.envelope.name = 'letter-envelope'
    this.paperGroup = new Group()
    this.paperGroup.name = 'letter-paper-group'
    this.flapHinge = new Group()
    this.flapHinge.name = 'letter-flap-hinge'
    this.sealGroup = new Group()
    this.sealGroup.name = 'letter-seal-group'
    this.letterPaper = null
    this.envelopeFlap = null
    this.paperTexture = null
    this.elapsedSeconds = 0
    this.isActive = false
    this.scrollProgress = 0
    this.scrollTarget = 0
    this.openProgress = 0
    this.manualOpenTarget = null
    this.lastAnnouncedStatus = null
    this.handleToggleRequest = this.handleToggleRequest.bind(this)
  }

  mount(context) {
    this.paperTexture = paperGrain()
    this.materials = materialPalette(this.paperTexture)

    const shadow = new Mesh(new BoxGeometry(3.72, 2.15, 0.02), this.materials.shadow)
    shadow.name = 'letter-contact-shadow'
    shadow.position.set(0.12, -0.2, -0.2)
    shadow.rotation.z = -0.035
    this.letterModel.add(shadow)

    const back = extrude(roundedRectangle(3.55, 2.18, 0.16), this.materials.back, 0.08)
    back.name = 'letter-envelope-back'
    back.position.z = -0.08
    this.envelope.add(back)

    this.letterPaper = extrude(roundedRectangle(2.92, 2.3, 0.1), this.materials.paper, 0.035)
    this.letterPaper.name = 'letter-paper'
    this.letterPaper.position.set(0, 0.72, 0.015)
    this.paperGroup.add(this.letterPaper)

    const border = extrude(roundedRectangle(2.68, 2.05, 0.075), this.materials.gold, 0.012)
    border.name = 'letter-paper-gold-border'
    border.position.set(0, 0.72, 0.058)
    border.scale.z = 0.4
    this.paperGroup.add(border)

    const writingSurface = extrude(roundedRectangle(2.61, 1.98, 0.06), this.materials.paper, 0.012)
    writingSurface.name = 'letter-paper-writing-surface'
    writingSurface.position.set(0, 0.72, 0.074)
    this.paperGroup.add(writingSurface)

    for (let index = 0; index < 5; index += 1) {
      const line = new Mesh(new BoxGeometry(1.88 - index * 0.08, 0.018, 0.012), this.materials.ink)
      line.name = `letter-writing-guide-${index + 1}`
      line.position.set(-0.18 + index * 0.025, 1.18 - index * 0.25, 0.1)
      this.paperGroup.add(line)
    }
    this.envelope.add(this.paperGroup)

    const pocket = extrude(polygon([
      [-1.75, -1.04], [1.75, -1.04], [1.75, 0.7], [0, -0.18], [-1.75, 0.7],
    ]), this.materials.front, 0.075)
    pocket.name = 'letter-envelope-pocket'
    pocket.position.z = 0.13
    this.envelope.add(pocket)

    const leftFold = extrude(polygon([[-1.75, 0.7], [0, -0.18], [-1.75, -1.04]]), this.materials.fold, 0.045)
    leftFold.name = 'letter-envelope-left-fold'
    leftFold.position.z = 0.215
    const rightFold = extrude(polygon([[1.75, 0.7], [1.75, -1.04], [0, -0.18]]), this.materials.fold, 0.045)
    rightFold.name = 'letter-envelope-right-fold'
    rightFold.position.z = 0.215
    this.envelope.add(leftFold, rightFold)

    this.envelopeFlap = extrude(polygon([[-1.68, 0.98], [1.68, 0.98], [0, -0.18]]), this.materials.front, 0.055)
    this.envelopeFlap.name = 'letter-envelope-flap'
    this.envelopeFlap.position.set(0, -0.98, 0)
    this.flapHinge.position.set(0, 0.98, 0.28)
    this.flapHinge.add(this.envelopeFlap)
    this.envelope.add(this.flapHinge)

    const seal = extrude(star(6, 0.25, 0.14), this.materials.wax, 0.075)
    seal.name = 'letter-wax-star-seal'
    seal.position.set(0, -0.13, 0.365)
    seal.rotation.z = 0.08
    const sealSpark = extrude(star(5, 0.1, 0.045), this.materials.gold, 0.03)
    sealSpark.name = 'letter-seal-gold-star'
    sealSpark.position.set(0, -0.13, 0.46)
    this.sealGroup.add(seal, sealSpark)
    this.envelope.add(this.sealGroup)

    this.letterModel.add(this.envelope)
    this.group.add(this.letterModel)

    const ambient = new AmbientLight(0xffedf7, 1.05)
    ambient.name = 'letter-ambient-light'
    const key = new PointLight(0xffe1b4, 7, 10, 1.8)
    key.name = 'letter-key-light'
    key.position.set(2.8, 3.6, 4.2)
    const fill = new PointLight(0xd2c2ff, 5.4, 9, 1.9)
    fill.name = 'letter-fill-light'
    fill.position.set(-3.1, 1.6, 3)
    const rim = new PointLight(0xff8dc4, 4.2, 8, 2)
    rim.name = 'letter-rim-light'
    rim.position.set(1.2, -1.4, -2.6)
    this.group.add(ambient, key, fill, rim)

    context.scene.add(this.group)
    this.group.visible = this.isActive
    this.applyOpenPose(0)
    this.resize()
    if (typeof window !== 'undefined') {
      window.addEventListener(LETTER_TOGGLE_REQUEST_EVENT, this.handleToggleRequest)
    }
  }

  setActive(isActive) {
    this.isActive = Boolean(isActive)
    this.group.visible = this.isActive
    if (!this.isActive) this.manualOpenTarget = null
    else this.announceState('scroll')
  }

  setScrollProgress(progress) {
    const nextProgress = clamp(progress)
    if (Math.abs(nextProgress - this.scrollTarget) > 0.002) this.manualOpenTarget = null
    this.scrollTarget = nextProgress
  }

  getScrollOpenTarget() {
    return smoothstep((this.scrollTarget - 0.08) / 0.58)
  }

  setOpen(isOpen, source = 'control') {
    this.manualOpenTarget = isOpen ? 1 : 0
    this.announceState(source, isOpen ? 'opening' : 'closing')
  }

  handleToggleRequest({ detail }) {
    if (!this.isActive || typeof detail?.isOpen !== 'boolean') return
    this.setOpen(detail.isOpen, 'control')
  }

  applyOpenPose(progress) {
    const flapProgress = smoothstep(progress / 0.56)
    const paperProgress = smoothstep((progress - 0.34) / 0.66)
    const sealProgress = smoothstep(progress / 0.24)
    this.flapHinge.rotation.x = -Math.PI * flapProgress
    this.paperGroup.position.set(0, 0.68 * paperProgress, 0.12 * paperProgress)
    this.paperGroup.scale.setScalar(1 + 0.025 * paperProgress)
    this.sealGroup.scale.setScalar(1 - sealProgress)
    this.sealGroup.rotation.z = -0.18 * sealProgress
  }

  announceState(source = 'scroll', forcedStatus = null) {
    const target = this.manualOpenTarget ?? this.getScrollOpenTarget()
    const status = forcedStatus ?? (
      this.openProgress <= 0.02 && target <= 0.02
        ? 'closed'
        : this.openProgress >= 0.98 && target >= 0.98
          ? 'open'
          : target >= this.openProgress ? 'opening' : 'closing'
    )
    if (!forcedStatus && status === this.lastAnnouncedStatus) return
    this.lastAnnouncedStatus = status
    announceLetterState({
      isOpen: target >= 0.5,
      progress: this.openProgress,
      source,
      status,
    })
  }

  resize({ height = 900, width = 1_440 } = {}) {
    const aspect = width / Math.max(1, height)
    if (width < 700) {
      this.group.position.set(0, -1.52, 0.15)
      this.group.scale.setScalar(0.48)
    } else if (aspect < 1.35) {
      this.group.position.set(1.28, -0.12, 0.1)
      this.group.scale.setScalar(0.72)
    } else if (height <= 980) {
      this.group.position.set(1.62, -0.25, 0)
      this.group.scale.setScalar(0.74)
    } else {
      this.group.position.set(1.58, -0.18, 0)
      this.group.scale.setScalar(0.82)
    }
  }

  setQualityMode() {}

  update({ delta, reducedMotion }) {
    if (!this.isActive) return
    this.elapsedSeconds += delta
    const smoothing = 1 - Math.exp(-delta * 4.5)
    this.scrollProgress += (this.scrollTarget - this.scrollProgress) * smoothing
    const openTarget = this.manualOpenTarget ?? this.getScrollOpenTarget()
    const openSmoothing = reducedMotion ? 1 : 1 - Math.exp(-delta * 5.8)
    this.openProgress += (openTarget - this.openProgress) * openSmoothing
    if (Math.abs(openTarget - this.openProgress) < 0.001) this.openProgress = openTarget
    this.applyOpenPose(this.openProgress)
    this.announceState(this.manualOpenTarget === null ? 'scroll' : 'control')
    if (reducedMotion) {
      this.letterModel.rotation.set(-0.025, -0.06, -0.025)
      return
    }
    this.letterModel.rotation.x = -0.035 + Math.sin(this.elapsedSeconds * 0.55) * 0.012
    this.letterModel.rotation.y = -0.12 + this.scrollProgress * 0.14
    this.letterModel.rotation.z = -0.035 + Math.sin(this.elapsedSeconds * 0.42) * 0.012
    this.letterModel.position.y = Math.sin(this.elapsedSeconds * 0.7) * 0.035
  }

  dispose() {
    this.group.parent?.remove(this.group)
    if (typeof window !== 'undefined') {
      window.removeEventListener(LETTER_TOGGLE_REQUEST_EVENT, this.handleToggleRequest)
    }
    const geometries = new Set()
    const materials = new Set()
    this.group.traverse((object) => {
      if (object.geometry) geometries.add(object.geometry)
      const objectMaterials = Array.isArray(object.material) ? object.material : [object.material]
      objectMaterials.filter(Boolean).forEach((material) => materials.add(material))
    })
    geometries.forEach((geometry) => geometry.dispose())
    materials.forEach((material) => material.dispose())
    this.paperTexture?.dispose()
    this.group.clear()
    this.letterPaper = null
    this.envelopeFlap = null
    this.paperGroup = null
    this.flapHinge = null
    this.sealGroup = null
    this.paperTexture = null
  }
}
