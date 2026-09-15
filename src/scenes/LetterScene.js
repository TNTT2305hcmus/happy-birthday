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
  PlaneGeometry,
  PointLight,
  RGBAFormat,
  Shape,
  SRGBColorSpace,
  UnsignedByteType,
} from 'three'
import { createLetterPaperTexture } from './LetterPaperTexture.js'
import {
  announceLetterPage,
  announceLetterState,
  LETTER_PAGE_REQUEST_EVENT,
  LETTER_TOGGLE_REQUEST_EVENT,
} from './letterEvents.js'

const clamp = (value, min = 0, max = 1) => Math.max(min, Math.min(max, value))
const smoothstep = (value) => {
  const progress = clamp(value)
  return progress * progress * (3 - 2 * progress)
}

const LETTER_DEPTH = Object.freeze({
  back: -0.1,
  paper: 0.035,
  pocket: 0.14,
  folds: 0.225,
  flap: 0.3,
  flapOpen: -0.16,
})

const LETTER_POSE = Object.freeze({
  sealStart: 0,
  sealEnd: 0.26,
  flapStart: 0.08,
  flapEnd: 0.58,
  paperStart: 0.44,
  paperEnd: 1,
  paperTravel: 1.76,
  paperDepthTravel: 0.08,
  paperScaleTravel: 0.08,
})

const LETTER_MOTION = Object.freeze({
  scrollStart: 0.3,
  scrollEnd: 0.58,
  scrollResponse: 4,
  controlResponse: 12,
  controlReleaseDelta: 0.025,
})

const LETTER_TYPING = Object.freeze({
  graphemesPerSecond: 34,
  openThreshold: 0.999,
  resetThreshold: 0.98,
})

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
  constructor(letterContent = {}) {
    this.group = new Group()
    this.group.name = 'birthday-letter-scene'
    this.letterModel = new Group()
    this.letterModel.name = 'birthday-letter-model'
    this.envelope = new Group()
    this.envelope.name = 'letter-envelope'
    this.envelopeBackGroup = new Group()
    this.envelopeBackGroup.name = 'letter-envelope-back-layer'
    this.paperGroup = new Group()
    this.paperGroup.name = 'letter-paper-group'
    this.pocketOccluderGroup = new Group()
    this.pocketOccluderGroup.name = 'letter-pocket-occluder-layer'
    this.flapHinge = new Group()
    this.flapHinge.name = 'letter-flap-hinge'
    this.sealGroup = new Group()
    this.sealGroup.name = 'letter-seal-group'
    this.letterPaper = null
    this.envelopeFlap = null
    this.paperTexture = null
    this.paperTextAsset = null
    this.paperTextMesh = null
    this.typingState = 'idle'
    this.typingElapsed = 0
    this.typingSession = 0
    this.revealedGraphemes = 0
    this.pageIndex = 0
    this.completedPages = new Set()
    this.isDisposed = false
    this.letterContent = letterContent
    this.elapsedSeconds = 0
    this.isActive = false
    this.scrollProgress = 0
    this.scrollTarget = 0
    this.openProgress = 0
    this.manualOpenTarget = null
    this.manualScrollAnchor = null
    this.lastAnnouncedStatus = null
    this.handleToggleRequest = this.handleToggleRequest.bind(this)
    this.handlePageRequest = this.handlePageRequest.bind(this)
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
    back.position.z = LETTER_DEPTH.back
    this.envelopeBackGroup.add(back)
    this.envelope.add(this.envelopeBackGroup)

    this.letterPaper = extrude(roundedRectangle(2.92, 1.96, 0.1), this.materials.paper, 0.035)
    this.letterPaper.name = 'letter-paper'
    this.letterPaper.position.set(0, 0, 0)
    this.paperGroup.add(this.letterPaper)

    const border = extrude(roundedRectangle(2.68, 1.72, 0.075), this.materials.gold, 0.012)
    border.name = 'letter-paper-gold-border'
    border.position.set(0, 0, 0.043)
    border.scale.z = 0.4
    this.paperGroup.add(border)

    const writingSurface = extrude(roundedRectangle(2.61, 1.65, 0.06), this.materials.paper, 0.012)
    writingSurface.name = 'letter-paper-writing-surface'
    writingSurface.position.set(0, 0, 0.059)
    this.paperGroup.add(writingSurface)

    if (typeof document !== 'undefined') {
      this.paperTextAsset = createLetterPaperTexture(
        this.letterContent,
        () => document.createElement('canvas'),
        { initialRevealCount: 0 },
      )
      const textMaterial = new MeshBasicMaterial({
        depthWrite: false,
        map: this.paperTextAsset.texture,
        transparent: true,
      })
      this.paperTextMesh = new Mesh(new PlaneGeometry(2.48, 1.55), textMaterial)
      this.paperTextMesh.name = 'letter-paper-text'
      this.paperTextMesh.position.set(0, 0, 0.095)
      this.paperTextMesh.visible = false
      this.paperGroup.add(this.paperTextMesh)
      document.fonts?.ready.then(() => {
        if (!this.isDisposed && this.paperTextAsset?.texture === textMaterial.map) {
          this.paperTextAsset.render(this.revealedGraphemes, this.pageIndex)
        }
      })
    }
    this.paperGroup.position.set(0, 0, LETTER_DEPTH.paper)
    this.envelope.add(this.paperGroup)

    const pocket = extrude(polygon([
      [-1.75, -1.04], [1.75, -1.04], [1.75, 0.7], [0, -0.18], [-1.75, 0.7],
    ]), this.materials.front, 0.075)
    pocket.name = 'letter-envelope-pocket'
    pocket.position.z = LETTER_DEPTH.pocket
    this.pocketOccluderGroup.add(pocket)

    const leftFold = extrude(polygon([[-1.75, 0.7], [0, -0.18], [-1.75, -1.04]]), this.materials.fold, 0.045)
    leftFold.name = 'letter-envelope-left-fold'
    leftFold.position.z = LETTER_DEPTH.folds
    const rightFold = extrude(polygon([[1.75, 0.7], [1.75, -1.04], [0, -0.18]]), this.materials.fold, 0.045)
    rightFold.name = 'letter-envelope-right-fold'
    rightFold.position.z = LETTER_DEPTH.folds
    this.pocketOccluderGroup.add(leftFold, rightFold)
    this.envelope.add(this.pocketOccluderGroup)

    this.envelopeFlap = extrude(polygon([[-1.68, 0.98], [1.68, 0.98], [0, -0.18]]), this.materials.front, 0.055)
    this.envelopeFlap.name = 'letter-envelope-flap'
    this.envelopeFlap.position.set(0, -0.98, 0)
    this.flapHinge.position.set(0, 0.98, LETTER_DEPTH.flap)
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
      window.addEventListener(LETTER_PAGE_REQUEST_EVENT, this.handlePageRequest)
    }
    this.announcePageState()
  }

  setActive(isActive) {
    this.isActive = Boolean(isActive)
    this.group.visible = this.isActive
    if (!this.isActive) {
      this.manualOpenTarget = null
      this.manualScrollAnchor = null
    }
    else {
      this.announceState('scroll')
      this.announcePageState()
    }
  }

  setScrollProgress(progress) {
    const nextProgress = clamp(progress)
    if (
      this.manualOpenTarget !== null
      && Math.abs(nextProgress - this.manualScrollAnchor) >= LETTER_MOTION.controlReleaseDelta
    ) {
      this.manualOpenTarget = null
      this.manualScrollAnchor = null
    }
    this.scrollTarget = nextProgress
  }

  getScrollOpenTarget() {
    const range = LETTER_MOTION.scrollEnd - LETTER_MOTION.scrollStart
    return clamp((this.scrollTarget - LETTER_MOTION.scrollStart) / range)
  }

  setOpen(isOpen, source = 'control') {
    this.manualOpenTarget = isOpen ? 1 : 0
    this.manualScrollAnchor = this.scrollTarget
    this.announceState(source, isOpen ? 'opening' : 'closing')
  }

  handleToggleRequest({ detail }) {
    if (!this.isActive || typeof detail?.isOpen !== 'boolean') return
    this.setOpen(detail.isOpen, 'control')
  }

  handlePageRequest({ detail }) {
    if (
      !this.isActive
      || this.openProgress < LETTER_TYPING.openThreshold
      || this.typingState !== 'complete'
      || this.paperTextAsset?.pageCount <= 1
    ) return
    const offset = detail?.direction === 'next' ? 1 : detail?.direction === 'previous' ? -1 : 0
    const nextPage = this.pageIndex + offset
    if (!offset || nextPage < 0 || nextPage >= this.paperTextAsset.pageCount) return
    this.typingSession += 1
    this.typingElapsed = 0
    this.pageIndex = nextPage
    if (this.completedPages.has(nextPage)) {
      this.typingState = 'complete'
      this.renderPaperText(this.paperTextAsset.getPageGraphemeCount(nextPage), nextPage)
    } else {
      this.typingState = 'idle'
      this.renderPaperText(0, nextPage)
    }
    this.announcePageState()
  }

  applyOpenPose(progress) {
    const flapProgress = smoothstep(
      (progress - LETTER_POSE.flapStart) / (LETTER_POSE.flapEnd - LETTER_POSE.flapStart),
    )
    const paperProgress = smoothstep(
      (progress - LETTER_POSE.paperStart) / (LETTER_POSE.paperEnd - LETTER_POSE.paperStart),
    )
    const sealProgress = smoothstep(
      (progress - LETTER_POSE.sealStart) / (LETTER_POSE.sealEnd - LETTER_POSE.sealStart),
    )
    this.flapHinge.rotation.x = -Math.PI * flapProgress
    this.flapHinge.position.z = LETTER_DEPTH.flap
      + (LETTER_DEPTH.flapOpen - LETTER_DEPTH.flap) * flapProgress
    this.paperGroup.position.set(
      0,
      LETTER_POSE.paperTravel * paperProgress,
      LETTER_DEPTH.paper + LETTER_POSE.paperDepthTravel * paperProgress,
    )
    this.paperGroup.scale.setScalar(1 + LETTER_POSE.paperScaleTravel * paperProgress)
    this.sealGroup.scale.setScalar(1 - sealProgress)
    this.sealGroup.rotation.z = -0.18 * sealProgress
    if (this.paperTextMesh) this.paperTextMesh.visible = progress >= LETTER_TYPING.openThreshold
  }

  renderPaperText(revealCount, pageIndex = this.pageIndex) {
    if (!this.paperTextAsset || this.isDisposed) return
    const nextPage = Math.max(0, Math.min(this.paperTextAsset.pageCount - 1, pageIndex))
    const pageTotal = this.paperTextAsset.getPageGraphemeCount(nextPage)
    const nextCount = Math.max(0, Math.min(pageTotal, revealCount))
    if (nextCount === this.revealedGraphemes && nextPage === this.paperTextAsset.pageIndex) return
    this.pageIndex = nextPage
    this.revealedGraphemes = nextCount
    this.paperTextAsset.render(nextCount, nextPage)
  }

  resetTyping({ resetPages = false } = {}) {
    if (
      this.typingState === 'idle'
      && this.revealedGraphemes === 0
      && (!resetPages || (this.pageIndex === 0 && this.completedPages.size === 0))
    ) return
    this.typingSession += 1
    this.typingState = 'idle'
    this.typingElapsed = 0
    if (resetPages) {
      this.pageIndex = 0
      this.completedPages.clear()
    }
    this.renderPaperText(0, this.pageIndex)
    this.announcePageState()
  }

  startTyping(reducedMotion) {
    if (this.typingState !== 'idle') return
    this.typingSession += 1
    this.typingElapsed = 0
    const pageTotal = this.paperTextAsset.getPageGraphemeCount(this.pageIndex)
    if (reducedMotion || this.completedPages.has(this.pageIndex) || pageTotal === 0) {
      this.renderPaperText(pageTotal)
      this.typingState = 'complete'
      this.completedPages.add(this.pageIndex)
      this.announcePageState()
      return
    }
    this.typingState = 'typing'
    this.announcePageState()
  }

  updateTyping(delta, reducedMotion) {
    if (!this.paperTextAsset) return
    if (this.openProgress <= LETTER_TYPING.resetThreshold) {
      this.resetTyping({ resetPages: true })
      return
    }
    if (this.openProgress < LETTER_TYPING.openThreshold) return
    if (this.typingState === 'idle') this.startTyping(reducedMotion)
    if (this.typingState !== 'typing') return
    if (reducedMotion) {
      this.renderPaperText(this.paperTextAsset.getPageGraphemeCount(this.pageIndex))
      this.typingState = 'complete'
      this.completedPages.add(this.pageIndex)
      this.announcePageState()
      return
    }
    this.typingElapsed += delta
    const revealCount = Math.floor(
      this.typingElapsed * LETTER_TYPING.graphemesPerSecond + 1e-6,
    )
    this.renderPaperText(revealCount)
    if (this.revealedGraphemes >= this.paperTextAsset.getPageGraphemeCount(this.pageIndex)) {
      this.typingState = 'complete'
      this.completedPages.add(this.pageIndex)
      this.announcePageState()
    }
  }

  announcePageState() {
    if (!this.paperTextAsset) return
    announceLetterPage({
      pageCount: this.paperTextAsset.pageCount,
      pageIndex: this.pageIndex,
      typingStatus: this.typingState,
    })
  }

  announceState(source = 'scroll', forcedStatus = null) {
    const target = this.manualOpenTarget ?? this.getScrollOpenTarget()
    const status = forcedStatus ?? (
      this.openProgress <= 0.02 && target <= 0.02
        ? 'closed'
        : this.openProgress >= 0.999 && target >= 0.999
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
      this.group.position.set(0, -0.18, 0.15)
      this.group.scale.setScalar(0.48)
    } else if (aspect < 1.35) {
      this.group.position.set(0, -0.12, 0.1)
      this.group.scale.setScalar(0.72)
    } else if (height <= 980) {
      this.group.position.set(0, -0.16, 0)
      this.group.scale.setScalar(0.78)
    } else {
      this.group.position.set(0, -0.08, 0)
      this.group.scale.setScalar(0.86)
    }
  }

  setQualityMode() {}

  update({ delta, reducedMotion }) {
    if (!this.isActive) return
    this.elapsedSeconds += delta
    const smoothing = 1 - Math.exp(-delta * 4.5)
    this.scrollProgress += (this.scrollTarget - this.scrollProgress) * smoothing
    const openTarget = this.manualOpenTarget ?? this.getScrollOpenTarget()
    const response = this.manualOpenTarget === null
      ? LETTER_MOTION.scrollResponse
      : LETTER_MOTION.controlResponse
    const openSmoothing = reducedMotion ? 1 : 1 - Math.exp(-delta * response)
    this.openProgress += (openTarget - this.openProgress) * openSmoothing
    if (Math.abs(openTarget - this.openProgress) < 0.001) this.openProgress = openTarget
    this.applyOpenPose(this.openProgress)
    this.updateTyping(delta, reducedMotion)
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
    this.isDisposed = true
    this.group.parent?.remove(this.group)
    if (typeof window !== 'undefined') {
      window.removeEventListener(LETTER_TOGGLE_REQUEST_EVENT, this.handleToggleRequest)
      window.removeEventListener(LETTER_PAGE_REQUEST_EVENT, this.handlePageRequest)
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
    this.paperTextAsset?.texture.dispose()
    this.group.clear()
    this.letterPaper = null
    this.envelopeFlap = null
    this.paperGroup = null
    this.envelopeBackGroup = null
    this.pocketOccluderGroup = null
    this.flapHinge = null
    this.sealGroup = null
    this.paperTexture = null
    this.paperTextAsset = null
    this.paperTextMesh = null
  }
}
