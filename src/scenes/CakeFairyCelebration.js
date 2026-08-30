import { FairyMascot } from './FairyMascot.js'

export class CakeFairyCelebration {
  constructor() {
    this.fairy = new FairyMascot()
    this.group = this.fairy.group
    this.group.name = 'cake-fairy-celebration'
    this.group.visible = false
    this.active = false
    this.elapsed = 0
    this.wandRestRotation = this.fairy.parts.wandArm.rotation.z
  }

  celebrate() {
    this.active = true
    this.elapsed = 0
    this.group.visible = true
    this.group.position.set(-1.8, -0.25, -0.35)
    this.group.scale.setScalar(0.001)
  }

  update(delta, reducedMotion = false) {
    if (!this.active) return
    this.elapsed += delta
    const entranceDuration = reducedMotion ? 0.25 : 0.9
    const entrance = Math.min(1, this.elapsed / entranceDuration)
    const eased = 1 - Math.pow(1 - entrance, 3)
    const scale = 0.54 * eased
    this.group.scale.setScalar(scale)
    this.group.position.y = -0.25 + eased * 0.78 + (reducedMotion ? 0 : Math.sin(this.elapsed * 3.2) * 0.08)
    this.group.rotation.y = -0.12 + Math.sin(this.elapsed * 1.7) * 0.08

    const flap = reducedMotion ? 0 : Math.sin(this.elapsed * 15) * 0.22
    this.fairy.parts.wingMeshes.forEach((wing, index) => {
      const direction = index % 2 === 0 ? -1 : 1
      wing.rotation.z = wing.userData.restRotationZ + flap * direction
    })
    this.fairy.parts.wandArm.rotation.z = this.wandRestRotation
      + (reducedMotion ? -0.18 : -0.38 + Math.sin(this.elapsed * 7) * 0.28)
  }

  reset() {
    this.active = false
    this.elapsed = 0
    this.group.visible = false
    this.group.scale.setScalar(0.001)
    this.fairy.parts.wandArm.rotation.z = this.wandRestRotation
    this.fairy.parts.wingMeshes.forEach((wing) => {
      wing.rotation.z = wing.userData.restRotationZ
    })
  }

  dispose() {
    this.fairy.dispose()
  }
}
