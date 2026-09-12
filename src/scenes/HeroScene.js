import { JOURNEY_ANCHOR_IDS } from '../core/JourneyAnchorRegistry.js'
import {
  AmbientLight,
  BackSide,
  Color,
  DirectionalLight,
  Group,
  HemisphereLight,
  Mesh,
  PlaneGeometry,
  ShaderMaterial,
  SphereGeometry,
  Vector2,
  Vector3,
} from 'three'
import { MagicTrail } from '../core/MagicTrail.js'
import { ParticleSystem } from '../core/ParticleSystem.js'
import { ShootingStarTrail } from '../core/ShootingStarTrail.js'
import { FairyMascot } from './FairyMascot.js'
import { HeroCompanions } from './HeroCompanions.js'
import { HeroDecorations } from './HeroDecorations.js'

const skyVertexShader = /* glsl */ `
  varying vec3 vDirection;

  void main() {
    vDirection = normalize(position);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const skyFragmentShader = /* glsl */ `
  uniform vec3 uBottomColor;
  uniform vec3 uHorizonColor;
  uniform vec3 uTopColor;

  varying vec3 vDirection;

  void main() {
    float height = clamp(vDirection.y * 0.5 + 0.5, 0.0, 1.0);
    vec3 lowerSky = mix(uBottomColor, uHorizonColor, smoothstep(0.0, 0.58, height));
    vec3 color = mix(lowerSky, uTopColor, smoothstep(0.48, 1.0, height));
    float roseGlow = pow(max(0.0, dot(vDirection, normalize(vec3(-0.72, 0.12, -0.68)))), 7.0);
    float pearlGlow = pow(max(0.0, dot(vDirection, normalize(vec3(0.62, 0.42, -0.66)))), 12.0);
    float horizonHaze = 1.0 - smoothstep(0.0, 0.42, abs(vDirection.y + 0.08));

    color += vec3(0.065, 0.018, 0.042) * roseGlow;
    color += vec3(0.10, 0.085, 0.095) * pearlGlow;
    color += vec3(0.035, 0.018, 0.03) * horizonHaze;
    gl_FragColor = vec4(color, 1.0);
  }
`

const haloVertexShader = /* glsl */ `
  varying vec2 vUv;

  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const haloFragmentShader = /* glsl */ `
  uniform vec3 uGoldColor;
  uniform vec3 uPinkColor;

  varying vec2 vUv;

  void main() {
    vec2 centered = vec2((vUv.x - 0.5) * 0.82, vUv.y - 0.5);
    float distanceFromCenter = length(centered);
    float glow = 1.0 - smoothstep(0.08, 0.5, distanceFromCenter);
    float alpha = pow(max(glow, 0.0), 1.7) * 0.34;
    vec3 color = mix(uPinkColor, uGoldColor, smoothstep(0.18, 0.82, vUv.y));

    if (alpha < 0.01) discard;
    gl_FragColor = vec4(color, alpha);
  }
`

// Conservative per-frame submission ceilings, including transparent double-sided passes.
// Geometry is resident in both modes; Lite reduces particles and visible companions.
export const HERO_RESOURCE_BUDGET = Object.freeze({
  geometries: 61,
  drawCalls: 80,
  particles: Object.freeze({ full: 1526, lite: 466 }),
})

export class HeroScene {
  constructor() {
    this.group = new Group()
    this.group.name = 'shared-hero-environment'
    this.depthLayers = Object.fromEntries(['far', 'middle', 'near'].map((name) => {
      const layer = new Group()
      layer.name = `hero-depth-${name}`
      this.group.add(layer)
      return [name, layer]
    }))
    this.viewport = { width: 1440, height: 900 }
    this.elapsedSeconds = 0
    this.context = null
    this.baseMascotPosition = new Vector3()
    this.currentPointer = new Vector2()
    this.pointerTarget = new Vector2()
    this.pointerEnergy = 0
    this.scrollEnergy = 0
    this.scrollProgress = 0
    this.scrollTarget = 0
    this.trailEmissionTimer = 0
    this.wandStar = null
    this.anchorDisposers = []
    this.trailPosition = new Vector3()
    this.wandWorldPosition = new Vector3()
    this.isActive = true
    this.qualityMode = 'full'
    this.mascot = null
    this.mascotHalo = null
    this.companionStory = null
    this.staticDecorations = null
    this.magicTrail = null
    this.shootingStar = null
    this.starField = null
    this.sky = null
    this.handlePointerLeave = this.handlePointerLeave.bind(this)
    this.handlePointerMove = this.handlePointerMove.bind(this)
  }

  mount(context) {
    this.context = context
    this.qualityMode = context.qualityMode
    const skyGeometry = new SphereGeometry(42, 32, 18)
    const skyMaterial = new ShaderMaterial({
      depthWrite: false,
      fragmentShader: skyFragmentShader,
      side: BackSide,
      uniforms: {
        uBottomColor: { value: new Color(0xffddea) },
        uHorizonColor: { value: new Color(0xe7b5d6) },
        uTopColor: { value: new Color(0xa99cda) },
      },
      vertexShader: skyVertexShader,
    })

    this.sky = new Mesh(skyGeometry, skyMaterial)
    this.sky.name = 'pink-lavender-gradient-sky'
    this.depthLayers.far.add(this.sky)

    this.starField = new ParticleSystem({
      colorA: 0xfffbff,
      colorB: 0xffdda0,
      counts: { full: 1_400, lite: 420 },
      qualityMode: context.qualityMode,
      radius: { min: 8, max: 30 },
      seed: 1_111,
    })
    this.starField.points.name = 'shared-star-particles'
    this.depthLayers.far.add(this.starField.points)

    const hemisphereLight = new HemisphereLight(0xfff3fc, 0x9d729d, 1.55)
    hemisphereLight.name = 'shared-hemisphere-light'
    const ambientLight = new AmbientLight(0xffe8f3, 0.58)
    ambientLight.name = 'shared-ambient-light'
    const keyLight = new DirectionalLight(0xffe1a6, 1.9)
    keyLight.name = 'shared-key-light'
    keyLight.position.set(4, 6, 5)

    this.group.add(hemisphereLight, ambientLight, keyLight)

    this.mascot = new FairyMascot()
    this.mascotHalo = new Mesh(
      new PlaneGeometry(3.6, 4.4),
      new ShaderMaterial({
        depthWrite: false,
        fragmentShader: haloFragmentShader,
        transparent: true,
        uniforms: {
          uGoldColor: { value: new Color(0xffe6a8) },
          uPinkColor: { value: new Color(0xffb8da) },
        },
        vertexShader: haloVertexShader,
      }),
    )
    this.mascotHalo.name = 'fairy-mascot-halo'
    this.mascotHalo.position.set(0, 0.48, -0.55)
    this.mascotHalo.renderOrder = -10
    this.wandStar = this.mascot.parts.wand.getObjectByName('fairy-wand-star')
    if (context.journeyAnchors) {
      this.anchorDisposers = [
        context.journeyAnchors.registerWorldAnchor(
          JOURNEY_ANCHOR_IDS.HERO_WAND_TIP,
          (target) => this.getWandWorldPosition(target),
        ),
      ]
    }
    this.mascot.group.add(this.mascotHalo)
    this.depthLayers.middle.add(this.mascot.group)
    this.staticDecorations = new HeroDecorations({ qualityMode: context.qualityMode })
    this.depthLayers.near.add(this.staticDecorations.group)
    this.companionStory = new HeroCompanions({ qualityMode: context.qualityMode })
    this.depthLayers.middle.add(this.companionStory.group)
    this.magicTrail = new MagicTrail({ qualityMode: context.qualityMode })
    this.depthLayers.near.add(this.magicTrail.points)
    this.shootingStar = new ShootingStarTrail({ qualityMode: context.qualityMode })
    this.depthLayers.far.add(this.shootingStar.points)
    context.scene.add(this.group)
    this.resize()

    if (typeof window !== 'undefined') {
      window.addEventListener('pointermove', this.handlePointerMove, { passive: true })
      window.addEventListener('pointerleave', this.handlePointerLeave)
      window.addEventListener('blur', this.handlePointerLeave)
      document.documentElement.addEventListener('pointerleave', this.handlePointerLeave)
      document.addEventListener('visibilitychange', this.handlePointerLeave)
    }
  }

  handlePointerMove(event) {
    if (!this.isActive || this.context?.reducedMotion || event.pointerType === 'touch' || typeof window === 'undefined') return

    const nextX = Math.max(-1, Math.min(1, event.clientX / Math.max(1, window.innerWidth) * 2 - 1))
    const nextY = Math.max(-1, Math.min(1, 1 - event.clientY / Math.max(1, window.innerHeight) * 2))
    const movement = Math.hypot(nextX - this.pointerTarget.x, nextY - this.pointerTarget.y)

    this.pointerTarget.set(nextX, nextY)
    this.pointerEnergy = Math.min(1, this.pointerEnergy + movement * 2.4)
  }

  handlePointerLeave() {
    this.pointerTarget.set(0, 0)
    this.pointerEnergy = 0
    if (typeof document !== 'undefined' && document.hidden) this.resetParallax()
  }

  resetParallax() {
    this.pointerTarget.set(0, 0)
    this.currentPointer.set(0, 0)
    this.pointerEnergy = 0
    Object.values(this.depthLayers).forEach((layer) => layer.position.set(0, 0, 0))
  }

  updateParallax(reducedMotion) {
    if (reducedMotion) {
      this.resetParallax()
      return
    }
    // Pixel caps preserve the existing safe composition, including compact viewports.
    const camera = this.context.camera
    const worldPerPixel = camera
      ? 2 * Math.tan(camera.fov * Math.PI / 360) * Math.max(1, camera.position.z - 0.5) / this.viewport.height
      : 0.004
    const strength = (1 - this.scrollProgress * 0.65) * (this.qualityMode === 'lite' ? 0.7 : 1)
    const compact = this.viewport.width < 700 ? 0.45 : 1
    for (const [name, pixels] of Object.entries({ far: 2, middle: 6, near: 10 })) {
      const offset = pixels * worldPerPixel * strength * compact
      this.depthLayers[name].position.set(this.currentPointer.x * offset, this.currentPointer.y * offset * 0.65, 0)
    }
  }

  getWandWorldPosition(target = new Vector3()) {
    if (!this.wandStar) return null
    return this.wandStar.getWorldPosition(target)
  }
  setScrollProgress(progress) {
    const nextProgress = Math.max(0, Math.min(1, progress))
    const movement = Math.abs(nextProgress - this.scrollTarget)
    this.scrollTarget = nextProgress
    this.scrollEnergy = Math.min(1, this.scrollEnergy + movement * 7)
  }

  setActive(isActive) {
    this.isActive = Boolean(isActive)
    if (!this.isActive) this.resetParallax()
    this.group.visible = this.isActive
    if (this.mascot) this.mascot.group.visible = this.isActive
    if (this.magicTrail) this.magicTrail.points.visible = this.isActive
    this.companionStory?.setActive(this.isActive)
    this.shootingStar?.setActive(this.isActive)
  }

  resize({ height = 900, width = 1_440 } = {}) {
    this.viewport = { height, width }
    if (!this.context || !this.starField) {
      return
    }

    this.starField.setPixelRatio(this.context.renderer.getPixelRatio())
    this.magicTrail?.setPixelRatio(this.context.renderer.getPixelRatio())
    this.shootingStar?.setPixelRatio(this.context.renderer.getPixelRatio())

    this.staticDecorations?.resize({ height, width })
    this.companionStory?.resize({ height, width })
    if (!this.mascot) {
      return
    }

    const aspect = width / Math.max(1, height)
    if (width < 700) {
      this.mascot.group.position.set(1.05, -0.66, 0.25)
      this.mascot.group.scale.setScalar(0.48)
    } else if (aspect < 1.35) {
      this.mascot.group.position.set(1.62, -0.43, 0.18)
      this.mascot.group.scale.setScalar(0.64)
    } else {
      this.mascot.group.position.set(1.95, -0.32, 0.12)
      this.mascot.group.scale.setScalar(0.78)
    }
    this.baseMascotPosition.copy(this.mascot.group.position)
  }

  setQualityMode(nextMode) {
    this.qualityMode = nextMode
    this.starField?.setQualityMode(nextMode)
    this.magicTrail?.setQualityMode(nextMode)
    this.shootingStar?.setQualityMode(nextMode)
    this.companionStory?.setQualityMode(nextMode)
    this.resize(this.viewport)
    this.staticDecorations?.setQualityMode(nextMode)
  }

  update({ delta, reducedMotion }) {
    if (!this.isActive) return
    this.elapsedSeconds += delta
    this.starField?.update({ elapsedSeconds: this.elapsedSeconds, reducedMotion })
    this.magicTrail?.update(delta)
    this.staticDecorations?.update({ elapsedSeconds: this.elapsedSeconds, reducedMotion })
    this.shootingStar?.update(delta, { reducedMotion })

    if (!this.mascot || !this.isActive) return

    const smoothing = 1 - Math.exp(-delta * 5)
    this.currentPointer.lerp(this.pointerTarget, smoothing)
    this.scrollProgress += (this.scrollTarget - this.scrollProgress) * smoothing
    this.updateParallax(reducedMotion)
    this.pointerEnergy = Math.max(0, this.pointerEnergy - delta * 1.7)
    this.scrollEnergy = Math.max(0, this.scrollEnergy - delta * 1.4)

    if (reducedMotion) {
      this.mascot.group.position.copy(this.baseMascotPosition)
      this.mascot.group.position.y += this.scrollProgress * 0.06
      this.mascot.group.rotation.set(0, -0.08, 0)
      if (this.wandStar) this.wandStar.scale.setScalar(1)
      this.companionStory?.update({
        elapsedSeconds: this.elapsedSeconds,
        reducedMotion: true,
      })
      return
    }

    const time = this.elapsedSeconds
    const scrollArc = Math.sin(this.scrollProgress * Math.PI)
    const gestureDuration = 1.8
    const gestureTime = (time + 0.45) % 7.2
    const gestureProgress = Math.max(0, Math.min(1, gestureTime / gestureDuration))
    const gestureEnvelope = gestureTime <= gestureDuration
      ? Math.sin(gestureProgress * Math.PI) ** 2
      : 0
    const bob = Math.sin(time * 1.15) * 0.07

    this.mascot.group.position.set(
      this.baseMascotPosition.x + Math.sin(time * 0.38) * 0.025,
      this.baseMascotPosition.y + bob + scrollArc * 0.12,
      this.baseMascotPosition.z,
    )
    this.mascot.group.rotation.y = -0.08 + this.currentPointer.x * 0.1
    this.mascot.group.rotation.x = -this.currentPointer.y * 0.025
    this.mascot.group.rotation.z = Math.sin(time * 0.72) * 0.025 - this.currentPointer.x * 0.035

    const wingBeat = Math.sin(time * 7.2) * 0.13
    this.mascot.parts.wingMeshes.forEach((wing, index) => {
      const direction = index % 2 === 0 ? -1 : 1
      const strength = index < 2 ? 1 : 0.72
      wing.rotation.z = wing.userData.restRotationZ + wingBeat * direction * strength
    })

    const wandWave = Math.sin(gestureProgress * Math.PI * 2) * gestureEnvelope * 0.34 + Math.sin(this.scrollProgress * Math.PI * 2) * 0.11
    this.mascot.parts.wandArm.rotation.z = wandWave + this.currentPointer.y * 0.055
    this.mascot.parts.wand.rotation.z = -0.07 + Math.sin(gestureProgress * Math.PI * 2 + 0.5) * gestureEnvelope * 0.11
    // Nghiêng nhẹ theo x/y để đầu đũa không luôn phẳng đối diện camera,
    // tự nhiên hơn khi phối với MagicTrail phát ra từ fairy-wand-star.
    this.mascot.parts.wand.rotation.x = Math.sin(gestureProgress * Math.PI) * gestureEnvelope * 0.08 + this.currentPointer.y * 0.04
    this.mascot.parts.wand.rotation.y = Math.cos(gestureProgress * Math.PI * 2) * gestureEnvelope * 0.07 + this.currentPointer.x * 0.05
    if (this.wandStar) this.wandStar.scale.setScalar(1 + gestureEnvelope * 0.38)

    this.companionStory?.update({
      elapsedSeconds: this.elapsedSeconds,
      reducedMotion: false,
    })


    this.trailEmissionTimer -= delta
    if (gestureEnvelope > 0.14 && this.trailEmissionTimer <= 0) {
      const wandStar = this.wandStar
      this.group.updateWorldMatrix(true, true)
      wandStar.getWorldPosition(this.wandWorldPosition)
      this.trailPosition.copy(this.wandWorldPosition)
      this.magicTrail.points.worldToLocal(this.trailPosition)

      const motionEnergy = Math.max(0.68 + gestureEnvelope * 0.32, this.pointerEnergy, this.scrollEnergy)
      this.magicTrail.emit(this.trailPosition, motionEnergy, { cascade: true })
      this.trailEmissionTimer = this.qualityMode === 'lite' ? 0.1 : 0.055
    } else if (gestureEnvelope <= 0.14) {
      this.trailEmissionTimer = 0
    }
  }

  dispose() {
    this.anchorDisposers.forEach((disposeAnchor) => disposeAnchor())
    this.anchorDisposers = []
    this.group.parent?.remove(this.group)
    this.starField?.dispose()
    this.magicTrail?.dispose()
    this.mascot?.dispose()
    this.staticDecorations?.dispose()
    this.companionStory?.dispose()
    this.shootingStar?.dispose()
    this.sky?.geometry.dispose()
    this.sky?.material.dispose()
    this.group.clear()
    this.wandStar = null
    this.context = null

    if (typeof window !== 'undefined') {
      window.removeEventListener('pointermove', this.handlePointerMove)
      window.removeEventListener('pointerleave', this.handlePointerLeave)
      window.removeEventListener('blur', this.handlePointerLeave)
      document.documentElement.removeEventListener('pointerleave', this.handlePointerLeave)
      document.removeEventListener('visibilitychange', this.handlePointerLeave)
    }
  }
}
