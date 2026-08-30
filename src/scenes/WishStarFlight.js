import {
  ExtrudeGeometry,
  Group,
  Mesh,
  MeshStandardMaterial,
  PointLight,
  Shape,
} from 'three'

function createStarShape(points = 5, outerRadius = 0.34, innerRadius = 0.15) {
  const shape = new Shape()
  for (let index = 0; index < points * 2; index += 1) {
    const radius = index % 2 === 0 ? outerRadius : innerRadius
    const angle = -Math.PI / 2 + index * Math.PI / points
    const x = Math.cos(angle) * radius
    const y = Math.sin(angle) * radius
    if (index === 0) shape.moveTo(x, y)
    else shape.lineTo(x, y)
  }
  shape.closePath()
  return shape
}

export class WishStarFlight {
  constructor() {
    this.group = new Group()
    this.group.name = 'wish-star-flight'
    this.material = new MeshStandardMaterial({
      color: 0xffd98a,
      emissive: 0xff9ecf,
      emissiveIntensity: 1.8,
      metalness: 0.18,
      roughness: 0.28,
      transparent: true,
    })
    this.geometry = new ExtrudeGeometry(createStarShape(), {
      bevelEnabled: true,
      bevelSize: 0.035,
      bevelThickness: 0.035,
      depth: 0.1,
    })
    this.star = new Mesh(this.geometry, this.material)
    this.star.name = 'wish-star'
    this.light = new PointLight(0xffb8dc, 0, 3.5, 2)
    this.group.add(this.star, this.light)
    this.group.visible = false
    this.active = false
    this.elapsed = 0
    this.wish = ''
  }

  launch(wish) {
    this.wish = wish
    this.elapsed = 0
    this.active = true
    this.group.visible = true
    this.group.position.set(0, 1.45, 0.48)
    this.group.scale.setScalar(0.001)
    this.material.opacity = 1
  }

  update(delta, reducedMotion = false) {
    if (!this.active) return
    this.elapsed += delta
    const duration = reducedMotion ? 0.65 : 2.3
    const progress = Math.min(1, this.elapsed / duration)
    const eased = 1 - Math.pow(1 - progress, 3)
    const arc = Math.sin(progress * Math.PI)

    this.group.position.set(-1.25 * eased, 1.45 + 4.2 * eased + arc * 0.35, 0.48 - eased * 0.8)
    this.group.rotation.set(progress * 0.35, progress * Math.PI * 2.4, progress * 0.18)
    const scale = reducedMotion
      ? 0.55 * (1 - progress * 0.65)
      : Math.max(0.001, Math.sin(progress * Math.PI) * 0.78)
    this.group.scale.setScalar(scale)
    this.material.opacity = progress < 0.72 ? 1 : (1 - progress) / 0.28
    this.light.intensity = 5.2 * (1 - progress)

    if (progress >= 1) {
      this.active = false
      this.group.visible = false
      this.light.intensity = 0
    }
  }

  reset() {
    this.active = false
    this.elapsed = 0
    this.wish = ''
    this.group.visible = false
    this.group.scale.setScalar(0.001)
    this.material.opacity = 1
    this.light.intensity = 0
  }

  dispose() {
    this.geometry.dispose()
    this.material.dispose()
    this.group.clear()
  }
}
