import {
  AmbientLight,
  BackSide,
  Color,
  DirectionalLight,
  Group,
  HemisphereLight,
  Mesh,
  ShaderMaterial,
  SphereGeometry,
  Vector2,
  Vector3,
} from 'three'
import { MagicTrail } from '../core/MagicTrail.js'
import { ParticleSystem } from '../core/ParticleSystem.js'
import { FairyMascot } from './FairyMascot.js'

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

export class HeroScene {
  constructor() {
    this.group = new Group()
    this.group.name = 'shared-hero-environment'
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
    this.trailPosition = new Vector3()
    this.wandWorldPosition = new Vector3()
    this.isActive = true
    this.qualityMode = 'full'
    this.mascot = null
    this.magicTrail = null
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
    this.group.add(this.sky)

    this.starField = new ParticleSystem({
      colorA: 0xfffbff,
      colorB: 0xffdda0,
      counts: { full: 1_400, lite: 420 },
      qualityMode: context.qualityMode,
      radius: { min: 8, max: 30 },
      seed: 1_111,
    })
    this.starField.points.name = 'shared-star-particles'
    this.group.add(this.starField.points)

    const hemisphereLight = new HemisphereLight(0xfff3fc, 0x9d729d, 1.55)
    hemisphereLight.name = 'shared-hemisphere-light'
    const ambientLight = new AmbientLight(0xffe8f3, 0.58)
    ambientLight.name = 'shared-ambient-light'
    const keyLight = new DirectionalLight(0xffe1a6, 1.9)
    keyLight.name = 'shared-key-light'
    keyLight.position.set(4, 6, 5)

    this.group.add(hemisphereLight, ambientLight, keyLight)

    this.mascot = new FairyMascot()
    this.group.add(this.mascot.group)
    this.magicTrail = new MagicTrail({ qualityMode: context.qualityMode })
    this.group.add(this.magicTrail.points)
    context.scene.add(this.group)
    this.resize()

    if (typeof window !== 'undefined') {
      window.addEventListener('pointermove', this.handlePointerMove, { passive: true })
      window.addEventListener('pointerleave', this.handlePointerLeave)
    }
  }

  handlePointerMove(event) {
    if (!this.isActive || typeof window === 'undefined') return

    const nextX = event.clientX / Math.max(1, window.innerWidth) * 2 - 1
    const nextY = 1 - event.clientY / Math.max(1, window.innerHeight) * 2
    const movement = Math.hypot(nextX - this.pointerTarget.x, nextY - this.pointerTarget.y)

    this.pointerTarget.set(nextX, nextY)
    this.pointerEnergy = Math.min(1, this.pointerEnergy + movement * 2.4)
  }

  handlePointerLeave() {
    this.pointerTarget.set(0, 0)
  }

  setScrollProgress(progress) {
    const nextProgress = Math.max(0, Math.min(1, progress))
    const movement = Math.abs(nextProgress - this.scrollTarget)
    this.scrollTarget = nextProgress
    this.scrollEnergy = Math.min(1, this.scrollEnergy + movement * 7)
  }

  setActive(isActive) {
    this.isActive = Boolean(isActive)
    this.group.visible = this.isActive
    if (this.mascot) this.mascot.group.visible = this.isActive
    if (this.magicTrail) this.magicTrail.points.visible = this.isActive
  }

  resize({ height = 900, width = 1_440 } = {}) {
    if (!this.context || !this.starField) {
      return
    }

    this.starField.setPixelRatio(this.context.renderer.getPixelRatio())
    this.magicTrail?.setPixelRatio(this.context.renderer.getPixelRatio())

    if (!this.mascot) {
      return
    }

    const aspect = width / Math.max(1, height)
    if (width < 700) {
      this.mascot.group.position.set(1.05, -0.66, 0.25)
      this.mascot.group.scale.setScalar(0.48)
    } else if (aspect < 1.35) {
      this.mascot.group.position.set(1.72, -0.45, 0.18)
      this.mascot.group.scale.setScalar(0.61)
    } else {
      this.mascot.group.position.set(2.25, -0.34, 0.12)
      this.mascot.group.scale.setScalar(0.72)
    }
    this.baseMascotPosition.copy(this.mascot.group.position)
  }

  setQualityMode(nextMode) {
    this.qualityMode = nextMode
    this.starField?.setQualityMode(nextMode)
    this.magicTrail?.setQualityMode(nextMode)
    this.resize()
  }

  update({ delta, reducedMotion }) {
    this.elapsedSeconds += delta
    this.starField?.update({ elapsedSeconds: this.elapsedSeconds, reducedMotion })
    this.magicTrail?.update(delta)

    if (!this.mascot || !this.isActive) return

    const smoothing = 1 - Math.exp(-delta * 5)
    this.currentPointer.lerp(this.pointerTarget, smoothing)
    this.scrollProgress += (this.scrollTarget - this.scrollProgress) * smoothing
    this.pointerEnergy = Math.max(0, this.pointerEnergy - delta * 1.7)
    this.scrollEnergy = Math.max(0, this.scrollEnergy - delta * 1.4)

    if (reducedMotion) {
      this.mascot.group.position.copy(this.baseMascotPosition)
      this.mascot.group.position.y += this.scrollProgress * 0.06
      this.mascot.group.rotation.set(0, -0.08, 0)
      return
    }

    const time = this.elapsedSeconds
    const scrollArc = Math.sin(this.scrollProgress * Math.PI)
    const bob = Math.sin(time * 1.15) * 0.07

    this.mascot.group.position.set(
      this.baseMascotPosition.x + this.currentPointer.x * 0.11 + Math.sin(time * 0.38) * 0.025,
      this.baseMascotPosition.y + bob + this.currentPointer.y * 0.075 + scrollArc * 0.12,
      this.baseMascotPosition.z + this.currentPointer.x * 0.035,
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

    const wandWave = Math.sin(time * 2.1) * 0.055 + Math.sin(this.scrollProgress * Math.PI * 2) * 0.16
    this.mascot.parts.wandArm.rotation.z = wandWave + this.currentPointer.y * 0.055
    this.mascot.parts.wand.rotation.z = -0.07 + Math.sin(time * 2.7) * 0.045

    this.trailEmissionTimer -= delta
    if (this.trailEmissionTimer <= 0) {
      const wandStar = this.mascot.parts.wand.getObjectByName('fairy-wand-star')
      this.group.updateWorldMatrix(true, true)
      wandStar.getWorldPosition(this.wandWorldPosition)
      this.trailPosition.copy(this.wandWorldPosition)
      this.group.worldToLocal(this.trailPosition)

      const motionEnergy = Math.max(0.18, this.pointerEnergy, this.scrollEnergy)
      this.magicTrail.emit(this.trailPosition, motionEnergy)
      this.trailEmissionTimer = this.qualityMode === 'lite' ? 0.075 : 0.04
    }
  }

  dispose() {
    this.group.parent?.remove(this.group)
    this.starField?.dispose()
    this.magicTrail?.dispose()
    this.mascot?.dispose()
    this.sky?.geometry.dispose()
    this.sky?.material.dispose()
    this.group.clear()
    this.context = null

    if (typeof window !== 'undefined') {
      window.removeEventListener('pointermove', this.handlePointerMove)
      window.removeEventListener('pointerleave', this.handlePointerLeave)
    }
  }
}
