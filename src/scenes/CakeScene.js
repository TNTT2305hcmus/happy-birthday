import { JOURNEY_ANCHOR_IDS } from '../core/JourneyAnchorRegistry.js'
import { fitCakeToStage } from './cakeLayout.js'
import {
  AmbientLight,
  CircleGeometry,
  CylinderGeometry,
  DoubleSide,
  ExtrudeGeometry,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PointLight,
  Raycaster,
  Shape,
  SphereGeometry,
  TorusGeometry,
  Vector2,
  Vector3,
} from 'three'
import { CandleSmoke } from './CandleSmoke.js'
import {
  announceCakeWishJourney,
  announceCakeStatus,
  CAKE_BLOW_REQUEST_EVENT,
  CAKE_FLAME_ACTIVATE_EVENT,
  CAKE_FLAME_POINTER_EVENT,
  CAKE_INTERACTION_READY_EVENT,
  CAKE_RESET_REQUEST_EVENT,
  CAKE_WISH_SUBMIT_EVENT,
} from './cakeEvents.js'
import {
  WISH_CONVERGENCE_TIMING,
  WishParticleConvergence,
} from './WishParticleConvergence.js'

const CANDLE_LAYOUT = [
  [-0.48, 0.02],
  [-0.24, 0.2],
  [0, 0.26],
  [0.24, 0.2],
  [0.48, 0.02],
]

function createStarShape(points = 5, outerRadius = 0.34, innerRadius = 0.16) {
  const shape = new Shape()

  for (let index = 0; index < points * 2; index += 1) {
    const radius = index % 2 === 0 ? outerRadius : innerRadius
    // One outer point faces up. The lower center is then an inner valley,
    // allowing the support stem to meet the star between its two lower tips.
    const angle = Math.PI / 2 + index * Math.PI / points
    const x = Math.cos(angle) * radius
    const y = Math.sin(angle) * radius
    if (index === 0) shape.moveTo(x, y)
    else shape.lineTo(x, y)
  }

  shape.closePath()
  return shape
}

function createMaterialPalette() {
  return {
    berry: new MeshStandardMaterial({ color: 0xd95d91, roughness: 0.48 }),
    candle: new MeshStandardMaterial({ color: 0xf6d7ff, roughness: 0.52 }),
    cream: new MeshStandardMaterial({ color: 0xfff7e8, roughness: 0.63 }),
    flame: new MeshStandardMaterial({
      color: 0xfff0a8,
      emissive: 0xffa63d,
      emissiveIntensity: 1.8,
      roughness: 0.32,
    }),
    gold: new MeshStandardMaterial({
      color: 0xffd36f,
      emissive: 0x6b3510,
      emissiveIntensity: 0.18,
      metalness: 0.32,
      roughness: 0.3,
    }),
    lavender: new MeshStandardMaterial({ color: 0xbca4ef, roughness: 0.58 }),
    pink: new MeshStandardMaterial({ color: 0xf59bc8, roughness: 0.55 }),
    wick: new MeshStandardMaterial({ color: 0x493345, roughness: 0.9 }),
  }
}

function addTier({ group, material, radius, height, y }) {
  const tier = new Mesh(new CylinderGeometry(radius, radius * 1.02, height, 48), material)
  tier.position.y = y
  tier.name = `cake-tier-${group.children.length + 1}`
  group.add(tier)
  return tier
}

function addIcingRing({ group, material, radius, y }) {
  const ring = new Mesh(new TorusGeometry(radius, 0.075, 10, 48), material)
  ring.position.y = y
  ring.rotation.x = Math.PI / 2
  group.add(ring)

  for (let index = 0; index < 12; index += 1) {
    const angle = index / 12 * Math.PI * 2
    const drop = new Mesh(new SphereGeometry(0.095, 14, 10), material)
    drop.position.set(Math.cos(angle) * radius, y - 0.055, Math.sin(angle) * radius)
    drop.scale.set(1, index % 3 === 0 ? 1.55 : 1.05, 1)
    group.add(drop)
  }
}

function addRosettes({ group, material, radius, y }) {
  for (let index = 0; index < 10; index += 1) {
    const angle = index / 10 * Math.PI * 2
    const rosette = new Mesh(new TorusGeometry(0.105, 0.04, 7, 12), material)
    rosette.position.set(Math.cos(angle) * radius, y, Math.sin(angle) * radius)
    rosette.rotation.set(Math.PI / 2, 0, -angle)
    group.add(rosette)
  }
}

export class CakeScene {
  constructor() {
    this.group = new Group()
    this.group.name = 'birthday-cake-scene'
    this.cake = new Group()
    this.cake.name = 'birthday-cake-model'
    this.candles = []
    this.flames = []
    this.flameHitAreas = []
    this.topperAnchor = null
    this.context = null
    this.elapsedSeconds = 0
    this.isActive = false
    this.scrollProgress = 0
    this.scrollTarget = 0
    this.qualityMode = 'full'
    this.revealProgress = 1
    this.cakeStatus = 'idle'
    this.extinguishElapsed = 0
    this.interactionReady = false
    this.lastPointer = { id: null, timeStamp: -Infinity }
    this.pointerNdc = new Vector2()
    this.raycaster = new Raycaster()
    this.wishSourceWorld = new Vector3()
    this.wishTargetWorld = new Vector3()

    this.smoke = null
    this.candleGlow = null
    this.wishConvergence = null
    this.wishJourneyStage = 'idle'
    this.anchorDisposers = []
    this.handleBlowRequest = this.handleBlowRequest.bind(this)
    this.handleFlameActivation = this.handleFlameActivation.bind(this)
    this.handleFlamePointer = this.handleFlamePointer.bind(this)
    this.handleInteractionReady = this.handleInteractionReady.bind(this)
    this.handleResetRequest = this.handleResetRequest.bind(this)
    this.handleWishRequest = this.handleWishRequest.bind(this)
  }

  mount(context) {
    this.context = context
    this.qualityMode = context.qualityMode
    const materials = createMaterialPalette()
    this.materials = materials

    const shadow = new Mesh(
      new CircleGeometry(1.72, 48),
      new MeshBasicMaterial({ color: 0x5f365c, opacity: 0.16, side: DoubleSide, transparent: true }),
    )
    shadow.name = 'cake-contact-shadow'
    shadow.position.y = -1.13
    shadow.rotation.x = -Math.PI / 2
    shadow.scale.set(1, 0.58, 1)
    this.cake.add(shadow)

    const platter = new Mesh(new CylinderGeometry(1.65, 1.52, 0.13, 56), materials.gold)
    platter.name = 'cake-gold-platter'
    platter.position.y = -1.02
    this.cake.add(platter)

    addTier({ group: this.cake, material: materials.pink, radius: 1.36, height: 0.7, y: -0.62 })
    addIcingRing({ group: this.cake, material: materials.cream, radius: 1.29, y: -0.25 })
    addRosettes({ group: this.cake, material: materials.berry, radius: 1.12, y: -0.15 })

    addTier({ group: this.cake, material: materials.cream, radius: 1.05, height: 0.58, y: -0.02 })
    addIcingRing({ group: this.cake, material: materials.lavender, radius: 0.99, y: 0.29 })

    addTier({ group: this.cake, material: materials.pink, radius: 0.78, height: 0.48, y: 0.52 })
    addIcingRing({ group: this.cake, material: materials.cream, radius: 0.72, y: 0.77 })
    addRosettes({ group: this.cake, material: materials.lavender, radius: 0.59, y: 0.83 })

    this.addCandles(materials)
    this.addStarTopper(materials)
    this.smoke = new CandleSmoke({ qualityMode: context.qualityMode })
    this.wishConvergence = new WishParticleConvergence({
      pixelRatio: context.renderer.getPixelRatio?.() ?? 1,
      qualityMode: context.qualityMode,
    })
    if (context.journeyAnchors) {
      this.anchorDisposers = [
        context.journeyAnchors.registerDomAnchor(
          JOURNEY_ANCHOR_IDS.WISH_SOURCE,
          () => typeof document === 'undefined'
            ? null
            : document.querySelector('[data-journey-anchor="wish-source"]'),
        ),
        context.journeyAnchors.registerWorldAnchor(
          JOURNEY_ANCHOR_IDS.CAKE_TOPPER,
          (target) => this.getTopperWorldPosition(target),
        ),
      ]
    }
    this.cake.add(this.smoke.points)

    this.candleGlow = new PointLight(0xffbd70, 3.6, 4.2, 2)
    this.candleGlow.name = 'candle-flame-glow'
    this.candleGlow.position.set(0, 1.68, 0.3)
    this.cake.add(this.candleGlow)
    this.group.add(this.cake)

    const ambient = new AmbientLight(0xffeaf5, 0.74)
    ambient.name = 'cake-ambient-light'
    const keyLight = new PointLight(0xffd9a8, 7.5, 11, 1.7)
    keyLight.name = 'cake-key-light'
    keyLight.position.set(2.8, 4.2, 3.8)
    const fillLight = new PointLight(0xd5c2ff, 5.2, 10, 1.8)
    fillLight.name = 'cake-fill-light'
    fillLight.position.set(-3.2, 1.8, 2.4)
    const rimLight = new PointLight(0xff88bd, 4.4, 9, 1.9)
    rimLight.name = 'cake-rim-light'
    rimLight.position.set(1.8, 0.6, -3.4)
    this.stageLights = [keyLight, fillLight, rimLight]
    this.stageLights.forEach((light) => { light.userData.referenceIntensity = light.intensity })
    this.group.add(ambient, keyLight, fillLight, rimLight)

    context.scene.add(this.group, this.wishConvergence.points)
    this.group.visible = this.isActive
    this.resize()

    if (typeof window !== 'undefined') {
      window.addEventListener(CAKE_BLOW_REQUEST_EVENT, this.handleBlowRequest)
      window.addEventListener(CAKE_FLAME_ACTIVATE_EVENT, this.handleFlameActivation)
      window.addEventListener(CAKE_FLAME_POINTER_EVENT, this.handleFlamePointer)
      window.addEventListener(CAKE_INTERACTION_READY_EVENT, this.handleInteractionReady)
      window.addEventListener(CAKE_RESET_REQUEST_EVENT, this.handleResetRequest)
      window.addEventListener(CAKE_WISH_SUBMIT_EVENT, this.handleWishRequest)
    }
  }

  addCandles(materials) {
    const hitGeometry = new SphereGeometry(0.125, 10, 8)
    const hitMaterial = new MeshBasicMaterial({ colorWrite: false, depthWrite: false })
    CANDLE_LAYOUT.forEach(([x, z], index) => {
      const candle = new Group()
      candle.name = `magic-candle-${index + 1}`
      candle.position.set(x, 0.88, z)

      const body = new Mesh(new CylinderGeometry(0.065, 0.075, 0.52, 16), materials.candle)
      body.position.y = 0.26
      candle.add(body)

      for (let stripeIndex = 0; stripeIndex < 3; stripeIndex += 1) {
        const stripe = new Mesh(new TorusGeometry(0.071, 0.012, 6, 16), materials.berry)
        stripe.position.y = 0.12 + stripeIndex * 0.15
        stripe.rotation.x = Math.PI / 2
        candle.add(stripe)
      }

      const wick = new Mesh(new CylinderGeometry(0.012, 0.012, 0.1, 8), materials.wick)
      wick.position.y = 0.57
      candle.add(wick)

      const flame = new Mesh(new SphereGeometry(0.08, 14, 10), materials.flame)
      flame.name = `candle-flame-${index + 1}`
      flame.position.y = 0.72
      flame.scale.set(0.72, 1.6, 0.72)
      flame.userData.basePosition = flame.position.clone()
      flame.userData.baseScale = flame.scale.clone()
      flame.userData.isLit = true
      flame.userData.isExtinguishing = false
      flame.userData.extinguishStartedAt = 0
      flame.userData.phase = index * 1.37
      flame.userData.smokeOrigin = new Vector3(x, candle.position.y + flame.position.y, z)
      candle.add(flame)

      const hitArea = new Mesh(hitGeometry, hitMaterial)
      hitArea.name = `candle-flame-hit-${index + 1}`
      hitArea.position.copy(flame.position)
      hitArea.scale.y = 1.35
      hitArea.userData.flameIndex = index
      candle.add(hitArea)

      this.candles.push(candle)
      this.flames.push(flame)
      this.flameHitAreas.push(hitArea)
      this.cake.add(candle)
    })
  }

  addStarTopper(materials) {
    const topper = new Group()
    topper.name = 'cake-star-topper'
    // Upper tier surface; topper stays on the cake axis.
    topper.position.set(0, 0.76, 0)

    const stem = new Mesh(new CylinderGeometry(0.025, 0.025, 1.06, 10), materials.gold)
    stem.name = 'cake-topper-stem'
    stem.position.y = 0.53
    topper.add(stem)

    const star = new Mesh(
      new ExtrudeGeometry(createStarShape(), { bevelEnabled: true, bevelSize: 0.025, bevelThickness: 0.025, depth: 0.08 }),
      materials.gold,
    )
    star.name = 'cake-topper-star'
    // Center extrusion thickness before rotating around the cake axis.
    star.geometry.translate(0, 0, -0.04)
    star.position.set(0, 1.22, 0)
    star.rotation.y = -0.12
    topper.add(star)
    this.topperAnchor = new Group()
    this.topperAnchor.name = 'cake-topper-anchor'
    star.add(this.topperAnchor)
    this.cake.add(topper)
  }

  // R5: read after scene update; includes all current parent transforms.
  // Hidden scenes retain a valid anchor. Before mount/after disposal: null.
  // Pass a reusable Vector3 to avoid allocations during a flight.
  getTopperWorldPosition(target = new Vector3()) {
    if (!this.topperAnchor) return null
    return this.topperAnchor.getWorldPosition(target)
  }

  setActive(isActive) {
    this.isActive = Boolean(isActive)
    this.group.visible = this.isActive && this.revealProgress > 0
    if (this.isActive) this.announceStatus()
  }

  setRevealProgress(progress) {
    this.revealProgress = Math.max(0, Math.min(1, progress))
    this.group.visible = this.isActive && this.revealProgress > 0
    this.updatePlacement()
  }
  handleInteractionReady({ detail }) {
    this.interactionReady = Boolean(detail?.isReady)
  }

  getFlameIndexAt(clientX, clientY) {
    const canvas = this.context?.renderer?.domElement
    const camera = this.context?.camera
    const rect = canvas?.getBoundingClientRect?.()
    if (!camera || !rect || rect.width <= 0 || rect.height <= 0) return null

    this.pointerNdc.set(
      (clientX - rect.left) / rect.width * 2 - 1,
      -(clientY - rect.top) / rect.height * 2 + 1,
    )
    camera.updateMatrixWorld()
    this.group.updateMatrixWorld(true)
    this.raycaster.setFromCamera(this.pointerNdc, camera)
    const hit = this.raycaster.intersectObjects(this.flameHitAreas, false)[0]
    if (!hit) return null
    const flameIndex = hit.object.userData.flameIndex
    const flame = this.flames[flameIndex]
    return flame?.userData.isLit && !flame.userData.isExtinguishing ? flameIndex : null
  }

  extinguishFlame(index, source = 'pointer') {
    const flame = this.flames[index]
    if (!flame?.userData.isLit || flame.userData.isExtinguishing || this.cakeStatus === 'complete') return false
    flame.userData.isExtinguishing = true
    flame.userData.extinguishStartedAt = this.elapsedSeconds
    this.cakeStatus = 'extinguishing'
    this.extinguishElapsed = 0
    this.announceStatus()
    flame.userData.extinguishSource = source
    return true
  }

  handleFlameActivation({ detail } = {}) {
    if (!this.isActive || this.revealProgress < 0.999 || !this.interactionReady) return false
    const index = Number(detail?.index)
    if (!Number.isInteger(index) || index < 0 || index >= this.flames.length) return false
    return this.extinguishFlame(index, detail?.source ?? 'keyboard')
  }

  handleFlamePointer({ detail }) {
    if (!this.isActive || this.revealProgress < 0.999 || !this.interactionReady) return false
    const timeStamp = Number(detail?.timeStamp)
    const pointerId = detail?.pointerId ?? 'unknown'
    if (!Number.isFinite(timeStamp)) return false
    if (pointerId === this.lastPointer.id && timeStamp - this.lastPointer.timeStamp < 220) return false

    const flameIndex = this.getFlameIndexAt(Number(detail?.clientX), Number(detail?.clientY))
    if (flameIndex === null || !this.extinguishFlame(flameIndex)) return false
    this.lastPointer = { id: pointerId, timeStamp }
    return true
  }

  handleBlowRequest({ detail } = {}) {
    if (!this.isActive || this.cakeStatus === 'complete') return
    const stagger = this.context?.reducedMotion ? 0.035 : 0.17
    let order = 0
    this.flames.forEach((flame) => {
      if (!flame.userData.isLit || flame.userData.isExtinguishing) return
      flame.userData.isExtinguishing = true
      flame.userData.extinguishStartedAt = this.elapsedSeconds + order * stagger
      flame.userData.extinguishSource = detail?.source ?? 'microphone'
      order += 1
    })
    if (order === 0) return
    this.cakeStatus = 'extinguishing'
    this.extinguishElapsed = 0
    this.announceStatus()
  }

  resolveWishConvergenceAnchors(stage = this.wishJourneyStage) {
    const registry = this.context?.journeyAnchors
    const isWandLeg = stage === 'topper-to-wand'
    const targetId = isWandLeg
      ? JOURNEY_ANCHOR_IDS.HERO_WAND_TIP
      : JOURNEY_ANCHOR_IDS.CAKE_TOPPER
    const sourceId = isWandLeg
      ? JOURNEY_ANCHOR_IDS.CAKE_TOPPER
      : JOURNEY_ANCHOR_IDS.WISH_SOURCE
    const targetWorld = registry?.getWorldPosition(
      targetId,
      this.wishTargetWorld,
    ) ?? (!isWandLeg ? this.getTopperWorldPosition(this.wishTargetWorld) : null)
    if (!targetWorld) return false

    const sourceWorld = registry?.getWorldPosition(
      sourceId,
      this.wishSourceWorld,
      { planeZ: targetWorld.z },
    )
    if (!sourceWorld && !isWandLeg) {
      this.wishSourceWorld.copy(targetWorld)
      this.wishSourceWorld.x += 1.4
      this.wishSourceWorld.y -= 0.75
    }
    if (!sourceWorld && isWandLeg) return false

    return true
  }

  updateWishConvergence(delta, reducedMotion) {
    if (!this.wishConvergence?.active) return
    if (this.resolveWishConvergenceAnchors()) {
      this.wishConvergence.setAnchors(this.wishSourceWorld, this.wishTargetWorld)
    }
    const completed = this.wishConvergence.update(delta, reducedMotion)
    if (!completed) return

    if (this.wishJourneyStage === 'source-to-topper'
      && this.resolveWishConvergenceAnchors('topper-to-wand')) {
      this.wishJourneyStage = 'topper-to-wand'
      const timing = this.context?.reducedMotion
        ? WISH_CONVERGENCE_TIMING.reduced
        : WISH_CONVERGENCE_TIMING.full
      announceCakeWishJourney(this.wishJourneyStage, {
        durationMs: timing.travelSeconds * 1_000,
      })
      this.wishConvergence.launchContinuation({
        from: this.wishSourceWorld,
        to: this.wishTargetWorld,
      })
      return
    }

    this.wishJourneyStage = 'complete'
    announceCakeWishJourney(this.wishJourneyStage)
  }

  handleWishRequest({ detail }) {
    if (!this.isActive || this.cakeStatus !== 'complete' || !detail?.wish) return
    this.wishJourneyStage = 'source-to-topper'
    if (!this.resolveWishConvergenceAnchors()) {
      this.wishJourneyStage = 'idle'
      return
    }
    const launched = this.wishConvergence?.launch({
      from: this.wishSourceWorld,
      to: this.wishTargetWorld,
      wish: detail.wish,
    })
    if (launched) announceCakeWishJourney(this.wishJourneyStage)
    else this.wishJourneyStage = 'idle'
  }

  handleResetRequest() {
    this.cakeStatus = 'idle'
    this.extinguishElapsed = 0
    this.flames.forEach((flame) => {
      flame.visible = true
      flame.userData.isLit = true
      flame.userData.isExtinguishing = false
      flame.userData.extinguishStartedAt = 0
      flame.userData.extinguishSource = null
      flame.position.copy(flame.userData.basePosition)
      flame.scale.copy(flame.userData.baseScale)
      flame.rotation.set(0, 0, 0)
    })
    this.smoke?.reset()
    this.wishConvergence?.reset()
    this.wishJourneyStage = 'idle'
    announceCakeWishJourney(this.wishJourneyStage)
    this.lastPointer = { id: null, timeStamp: -Infinity }
    if (this.candleGlow) this.candleGlow.intensity = 3.6
    this.announceStatus()
  }

  getLitCount() {
    return this.flames.reduce((count, flame) => count + Number(flame.userData.isLit), 0)
  }

  announceStatus() {
    if (typeof window === 'undefined') return
    announceCakeStatus({
      candleStates: this.flames.map((flame) => flame.userData.isLit && !flame.userData.isExtinguishing),
      litCount: this.getLitCount(),
      status: this.cakeStatus,
    })
  }

  setScrollProgress(progress) {
    this.scrollTarget = Math.max(0, Math.min(1, progress))
  }

  resize({ height = 900, width = 1_440 } = {}) {
    this.viewport = { width, height }
    this.updatePlacement()

    const pixelRatio = this.context?.renderer.getPixelRatio?.() ?? 1
    this.smoke?.setPixelRatio(pixelRatio)
    this.wishConvergence?.setPixelRatio(pixelRatio)
  }

  updatePlacement() {
    const { width = 1440, height = 900 } = this.viewport ?? {}
    const stage = typeof document === 'undefined' ? null : document.querySelector('#cake .cake-visual-stage')
    const rect = stage?.getBoundingClientRect()
    const layout = fitCakeToStage({ width, height, rect, camera: this.context?.camera })
    const reducedMotion = this.context?.reducedMotion
    const revealScale = reducedMotion ? 1 : 0.92 + this.revealProgress * 0.08
    this.group.position.set(
      layout.position[0],
      layout.position[1] - (reducedMotion ? 0 : (1 - this.revealProgress) * 0.12),
      layout.position[2],
    )
    this.group.scale.setScalar(layout.scale * revealScale)
    // Keep the same exposure when the stage scales down on mobile.
    this.stageLights?.forEach((light) => {
      light.intensity = light.userData.referenceIntensity * (layout.scale / 0.76) ** light.decay
    })
  }

  setQualityMode(nextMode) {
    this.qualityMode = nextMode
    this.smoke?.setQualityMode(nextMode)
    this.wishConvergence?.setQualityMode(nextMode)
  }

  animateFlames(delta, reducedMotion) {
    this.smoke?.update(delta)
    if (this.cakeStatus === 'extinguishing') this.extinguishElapsed += delta

    const duration = reducedMotion ? 0.14 : 0.42
    let statusChanged = false

    this.flames.forEach((flame) => {
      if (!flame.userData.isLit) return
      const { basePosition, baseScale, phase } = flame.userData
      const flicker = reducedMotion ? 0 : Math.sin(this.elapsedSeconds * 13 + phase)
      const pulse = reducedMotion ? 1 : 1 + flicker * 0.09

      if (!flame.userData.isExtinguishing) {
        flame.position.set(basePosition.x + flicker * 0.012, basePosition.y, basePosition.z)
        flame.scale.set(baseScale.x * pulse, baseScale.y * (1 - flicker * 0.045), baseScale.z * pulse)
        flame.rotation.z = reducedMotion ? 0 : flicker * 0.055
        return
      }

      const localElapsed = this.elapsedSeconds - flame.userData.extinguishStartedAt
      if (localElapsed <= 0) {
        flame.scale.set(baseScale.x * pulse, baseScale.y, baseScale.z * pulse)
        return
      }

      const progress = Math.min(1, localElapsed / duration)
      const remaining = 1 - progress
      flame.position.x = basePosition.x + Math.sin(progress * Math.PI) * 0.08
      flame.position.y = basePosition.y + progress * 0.035
      flame.scale.set(
        baseScale.x * (0.9 + progress * 0.35) * remaining,
        baseScale.y * remaining,
        baseScale.z * (0.9 + progress * 0.35) * remaining,
      )
      flame.rotation.z = progress * 0.42

      if (progress >= 1) {
        flame.visible = false
        flame.userData.isLit = false
        flame.userData.isExtinguishing = false
        this.smoke?.emit(flame.userData.smokeOrigin, this.qualityMode === 'lite' ? 7 : 12)
        statusChanged = true
      }
    })

    const litCount = this.getLitCount()
    if (this.candleGlow) {
      const flicker = reducedMotion ? 1 : 0.92 + Math.sin(this.elapsedSeconds * 15) * 0.08
      this.candleGlow.intensity = 3.6 * litCount / Math.max(1, this.flames.length) * flicker * (this.group.scale.x / 0.76) ** this.candleGlow.decay
    }

    if (this.cakeStatus === 'extinguishing' && !this.flames.some((flame) => flame.userData.isExtinguishing)) {
      this.cakeStatus = litCount === 0 ? 'complete' : 'idle'
      statusChanged = true
    }
    if (statusChanged) this.announceStatus()
  }

  shouldUpdateWhenInactive() {
    return Boolean(this.wishConvergence?.active)
  }

  update({ delta, reducedMotion }) {
    const journeyActive = this.shouldUpdateWhenInactive()
    if (!this.isActive && !journeyActive) return

    if (this.isActive) {
      this.updatePlacement()
      this.elapsedSeconds += delta
      const smoothing = 1 - Math.exp(-delta * 4.5)
      this.scrollProgress += (this.scrollTarget - this.scrollProgress) * smoothing
      this.animateFlames(delta, reducedMotion)

      if (reducedMotion) {
        this.cake.rotation.set(0, -0.08 + this.scrollProgress * 0.08, 0)
      } else {
        this.cake.rotation.y = -0.16 + this.scrollProgress * 0.34 + Math.sin(this.elapsedSeconds * 0.35) * 0.025
        this.cake.position.y = Math.sin(this.elapsedSeconds * 0.8) * 0.025
      }
    }

    this.updateWishConvergence(delta, reducedMotion)
  }

  dispose() {
    this.anchorDisposers.forEach((disposeAnchor) => disposeAnchor())
    this.anchorDisposers = []
    this.group.parent?.remove(this.group)
    if (typeof window !== 'undefined') {
      window.removeEventListener(CAKE_BLOW_REQUEST_EVENT, this.handleBlowRequest)
      window.removeEventListener(CAKE_FLAME_ACTIVATE_EVENT, this.handleFlameActivation)
      window.removeEventListener(CAKE_FLAME_POINTER_EVENT, this.handleFlamePointer)
      window.removeEventListener(CAKE_INTERACTION_READY_EVENT, this.handleInteractionReady)
      window.removeEventListener(CAKE_RESET_REQUEST_EVENT, this.handleResetRequest)
      window.removeEventListener(CAKE_WISH_SUBMIT_EVENT, this.handleWishRequest)
    }
    if (this.smoke) {
      this.cake.remove(this.smoke.points)
      this.smoke.dispose()
    }
    if (this.wishConvergence) {
      this.context?.scene.remove(this.wishConvergence.points)
      this.wishConvergence.dispose()
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
    this.group.clear()
    this.candles = []
    this.flames = []
    this.flameHitAreas = []
    this.smoke = null
    this.candleGlow = null
    this.wishConvergence = null
    this.wishJourneyStage = 'idle'
    this.topperAnchor = null
    this.interactionReady = false
    this.context = null
  }
}
