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
    front: new MeshStandardMaterial({ color: 0xf5b8d5, roughness: 0.6, metalness: 0.02 }),
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
    this.letterPaper = null
    this.envelopeFlap = null
    this.paperTexture = null
    this.elapsedSeconds = 0
    this.isActive = false
    this.scrollProgress = 0
    this.scrollTarget = 0
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
    this.envelope.add(this.letterPaper)

    const border = extrude(roundedRectangle(2.68, 2.05, 0.075), this.materials.gold, 0.012)
    border.name = 'letter-paper-gold-border'
    border.position.set(0, 0.72, 0.058)
    border.scale.z = 0.4
    this.envelope.add(border)

    const writingSurface = extrude(roundedRectangle(2.61, 1.98, 0.06), this.materials.paper, 0.012)
    writingSurface.name = 'letter-paper-writing-surface'
    writingSurface.position.set(0, 0.72, 0.074)
    this.envelope.add(writingSurface)

    for (let index = 0; index < 5; index += 1) {
      const line = new Mesh(new BoxGeometry(1.88 - index * 0.08, 0.018, 0.012), this.materials.ink)
      line.name = `letter-writing-guide-${index + 1}`
      line.position.set(-0.18 + index * 0.025, 1.18 - index * 0.25, 0.1)
      this.envelope.add(line)
    }

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
    this.envelopeFlap.position.z = 0.28
    this.envelope.add(this.envelopeFlap)

    const seal = extrude(star(6, 0.25, 0.14), this.materials.wax, 0.075)
    seal.name = 'letter-wax-star-seal'
    seal.position.set(0, -0.13, 0.365)
    seal.rotation.z = 0.08
    const sealSpark = extrude(star(5, 0.1, 0.045), this.materials.gold, 0.03)
    sealSpark.name = 'letter-seal-gold-star'
    sealSpark.position.set(0, -0.13, 0.46)
    this.envelope.add(seal, sealSpark)

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
    this.resize()
  }

  setActive(isActive) {
    this.isActive = Boolean(isActive)
    this.group.visible = this.isActive
  }

  setScrollProgress(progress) {
    this.scrollTarget = Math.max(0, Math.min(1, progress))
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
      this.group.position.set(1.62, -0.08, 0)
      this.group.scale.setScalar(0.74)
    } else {
      this.group.position.set(1.58, -0.03, 0)
      this.group.scale.setScalar(0.82)
    }
  }

  setQualityMode() {}

  update({ delta, reducedMotion }) {
    if (!this.isActive) return
    this.elapsedSeconds += delta
    const smoothing = 1 - Math.exp(-delta * 4.5)
    this.scrollProgress += (this.scrollTarget - this.scrollProgress) * smoothing
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
    this.paperTexture = null
  }
}
