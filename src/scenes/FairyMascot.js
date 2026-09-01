import {
  CapsuleGeometry,
  ConeGeometry,
  CylinderGeometry,
  DoubleSide,
  ExtrudeGeometry,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  Quaternion,
  Shape,
  SphereGeometry,
  TorusGeometry,
  Vector3,
} from 'three'

export const FAIRY_PALETTE = {
  blush: 0xf49ab7,
  cream: 0xfff9f3,
  eye: 0x4b3653,
  gold: 0xffd98a,
  hair: 0x754967,
  lavender: 0xc9b6ff,
  pink: 0xff9ecf,
  skin: 0xffdccb,
  white: 0xfffbff,
}

function createStarGeometry(outerRadius = 0.2, innerRadius = 0.09, depth = 0.055) {
  const shape = new Shape()

  for (let point = 0; point < 10; point += 1) {
    const radius = point % 2 === 0 ? outerRadius : innerRadius
    const angle = Math.PI / 2 + point * Math.PI / 5
    const x = Math.cos(angle) * radius
    const y = Math.sin(angle) * radius

    if (point === 0) shape.moveTo(x, y)
    else shape.lineTo(x, y)
  }

  shape.closePath()
  return new ExtrudeGeometry(shape, {
    bevelEnabled: true,
    bevelSegments: 1,
    bevelSize: 0.018,
    bevelThickness: 0.014,
    curveSegments: 1,
    depth,
  })
}

function createWingGeometry() {
  const shape = new Shape()
  shape.moveTo(0, -0.05)
  shape.bezierCurveTo(0.05, 0.34, 0.22, 0.7, 0.5, 0.82)
  shape.bezierCurveTo(0.7, 0.48, 0.58, 0.12, 0.08, -0.18)
  shape.bezierCurveTo(0.04, -0.2, 0.01, -0.14, 0, -0.05)

  return new ExtrudeGeometry(shape, {
    bevelEnabled: true,
    bevelSegments: 1,
    bevelSize: 0.012,
    bevelThickness: 0.01,
    curveSegments: 4,
    depth: 0.025,
  })
}

function createLimb({ end, material, name, radius = 0.065, start }) {
  const direction = new Vector3().subVectors(end, start)
  const length = direction.length()
  const geometry = new CapsuleGeometry(radius, Math.max(0.01, length - radius * 2), 3, 8)
  const limb = new Mesh(geometry, material)

  limb.name = name
  limb.position.copy(start).add(end).multiplyScalar(0.5)
  limb.quaternion.copy(new Quaternion().setFromUnitVectors(
    new Vector3(0, 1, 0),
    direction.normalize(),
  ))
  return limb
}

function createMaterial(color, options = {}) {
  return new MeshStandardMaterial({
    color,
    flatShading: true,
    metalness: 0,
    roughness: 0.68,
    ...options,
  })
}

function addNamedMesh(parent, geometry, material, name, position, scale) {
  const mesh = new Mesh(geometry, material)
  mesh.name = name
  mesh.position.set(...position)
  if (scale) mesh.scale.set(...scale)
  parent.add(mesh)
  return mesh
}

export class FairyMascot {
  constructor() {
    this.group = new Group()
    this.group.name = 'original-fairy-mascot'
    this.parts = {}
    this.materials = this.createMaterials()
    this.buildWings()
    this.buildBody()
    this.buildHead()
    this.buildHat()
    this.buildArmsAndWand()
    this.buildLegs()
    this.group.rotation.y = -0.08
  }

  createMaterials() {
    return {
      blush: createMaterial(FAIRY_PALETTE.blush, { roughness: 0.8 }),
      cream: createMaterial(FAIRY_PALETTE.cream),
      eye: createMaterial(FAIRY_PALETTE.eye, { roughness: 0.38 }),
      gold: createMaterial(FAIRY_PALETTE.gold, {
        emissive: FAIRY_PALETTE.gold,
        emissiveIntensity: 0.24,
        metalness: 0.12,
        roughness: 0.38,
      }),
      hair: createMaterial(FAIRY_PALETTE.hair, { roughness: 0.84 }),
      lavender: createMaterial(FAIRY_PALETTE.lavender, { roughness: 0.58 }),
      pink: createMaterial(FAIRY_PALETTE.pink, { roughness: 0.55 }),
      skin: createMaterial(FAIRY_PALETTE.skin, { roughness: 0.8 }),
      white: createMaterial(FAIRY_PALETTE.white),
      wing: new MeshPhysicalMaterial({
        color: 0xf5eaff,
        depthWrite: false,
        opacity: 0.58,
        roughness: 0.16,
        side: DoubleSide,
        transparent: true,
      }),
      wingVein: new MeshBasicMaterial({
        color: FAIRY_PALETTE.white,
        opacity: 0.65,
        side: DoubleSide,
        transparent: true,
      }),
    }
  }

  buildWings() {
    const wingGeometry = createWingGeometry()
    const leftWing = addNamedMesh(
      this.group,
      wingGeometry,
      this.materials.wing,
      'fairy-wing-left',
      [-0.31, 0.34, -0.22],
      [-1, 1, 1],
    )
    leftWing.rotation.set(-0.08, 0.22, -0.32)

    const rightWing = addNamedMesh(
      this.group,
      wingGeometry.clone(),
      this.materials.wing,
      'fairy-wing-right',
      [0.31, 0.34, -0.22],
    )
    rightWing.rotation.set(-0.08, -0.22, 0.32)

    const lowerLeftWing = addNamedMesh(
      this.group,
      wingGeometry.clone(),
      this.materials.wing,
      'fairy-wing-lower-left',
      [-0.27, 0.02, -0.24],
      [-0.72, 0.7, 0.72],
    )
    lowerLeftWing.rotation.set(0.04, 0.18, -0.72)

    const lowerRightWing = addNamedMesh(
      this.group,
      wingGeometry.clone(),
      this.materials.wing,
      'fairy-wing-lower-right',
      [0.27, 0.02, -0.24],
      [0.72, 0.7, 0.72],
    )
    lowerRightWing.rotation.set(0.04, -0.18, 0.72)

    this.parts.wings = new Group()
    this.parts.wings.name = 'fairy-wings'
    this.parts.wingMeshes = [leftWing, rightWing, lowerLeftWing, lowerRightWing]
    this.parts.wingMeshes.forEach((wing) => {
      this.parts.wings.attach(wing)
      wing.userData.restRotationZ = wing.rotation.z
    })
    this.group.add(this.parts.wings)
  }

  buildBody() {
    addNamedMesh(
      this.group,
      new ConeGeometry(0.5, 0.88, 10),
      this.materials.pink,
      'fairy-skirt',
      [0, -0.27, 0],
    )
    addNamedMesh(
      this.group,
      new SphereGeometry(0.34, 10, 7),
      this.materials.lavender,
      'fairy-bodice',
      [0, 0.28, 0.02],
      [1, 1.25, 0.78],
    )
    addNamedMesh(
      this.group,
      new TorusGeometry(0.29, 0.035, 5, 12),
      this.materials.gold,
      'fairy-waist-ribbon',
      [0, 0.08, 0.03],
      [1, 1, 0.76],
    ).rotation.x = Math.PI / 2
    addNamedMesh(
      this.group,
      new SphereGeometry(0.08, 8, 5),
      this.materials.gold,
      'fairy-ribbon-knot',
      [0, 0.05, 0.31],
      [1.25, 0.78, 0.55],
    )
    addNamedMesh(
      this.group,
      new CylinderGeometry(0.09, 0.1, 0.14, 8),
      this.materials.skin,
      'fairy-neck',
      [0, 0.67, 0.01],
    )
  }

  buildHead() {
    addNamedMesh(
      this.group,
      new SphereGeometry(0.46, 12, 8),
      this.materials.hair,
      'fairy-hair-cap',
      [0, 1.06, -0.035],
      [1.03, 1.08, 0.96],
    )
    addNamedMesh(
      this.group,
      new SphereGeometry(0.4, 12, 8),
      this.materials.skin,
      'fairy-face',
      [0, 1.05, 0.105],
      [0.96, 1, 0.91],
    )

    ;[-1, 1].forEach((side) => {
      addNamedMesh(
        this.group,
        new SphereGeometry(0.13, 8, 6),
        this.materials.hair,
        side < 0 ? 'fairy-hair-curl-left' : 'fairy-hair-curl-right',
        [side * 0.37, 0.86, 0.04],
        [0.8, 1.5, 0.72],
      ).rotation.z = side * 0.22

      addNamedMesh(
        this.group,
        new SphereGeometry(0.052, 8, 5),
        this.materials.eye,
        side < 0 ? 'fairy-eye-left' : 'fairy-eye-right',
        [side * 0.145, 1.09, 0.46],
        [0.78, 1.08, 0.48],
      )
      addNamedMesh(
        this.group,
        new SphereGeometry(0.013, 6, 4),
        this.materials.white,
        side < 0 ? 'fairy-eye-glint-left' : 'fairy-eye-glint-right',
        [side * 0.135, 1.105, 0.488],
      )
      addNamedMesh(
        this.group,
        new SphereGeometry(0.055, 8, 5),
        this.materials.blush,
        side < 0 ? 'fairy-cheek-left' : 'fairy-cheek-right',
        [side * 0.25, 0.95, 0.425],
        [1.15, 0.48, 0.28],
      )
    })

    const smile = addNamedMesh(
      this.group,
      new TorusGeometry(0.055, 0.011, 4, 8, Math.PI),
      this.materials.blush,
      'fairy-smile',
      [0, 0.93, 0.482],
    )
    smile.rotation.z = Math.PI

    ;[-0.18, 0, 0.18].forEach((x, index) => {
      addNamedMesh(
        this.group,
        new SphereGeometry(0.115, 8, 5),
        this.materials.hair,
        `fairy-fringe-${index + 1}`,
        [x, 1.36 - Math.abs(x) * 0.22, 0.23],
        [1.18, 0.62, 0.62],
      ).rotation.z = -x * 0.9
    })
  }

  buildHat() {
    const brim = addNamedMesh(
      this.group,
      new CylinderGeometry(0.42, 0.47, 0.09, 12),
      this.materials.lavender,
      'fairy-pointed-hat-brim',
      [0, 1.47, -0.01],
      [1, 1, 0.82],
    )
    brim.rotation.z = -0.08

    const crown = addNamedMesh(
      this.group,
      new ConeGeometry(0.39, 0.78, 10),
      this.materials.pink,
      'fairy-pointed-hat',
      [-0.045, 1.87, -0.035],
      [1, 1, 0.86],
    )
    crown.rotation.z = -0.13

    const crownAxis = new Vector3(0, 1, 0).applyQuaternion(crown.quaternion).normalize()
    const crownTip = crown.position.clone().addScaledVector(crownAxis, 0.39)

    const hatStar = addNamedMesh(
      this.group,
      createStarGeometry(0.105, 0.048, 0.035),
      this.materials.gold,
      'fairy-hat-star',
      [crownTip.x, crownTip.y, 0.02],
    )
    hatStar.position.addScaledVector(crownAxis, 0.045)
    hatStar.rotation.z = crown.rotation.z
    this.parts.hatCrown = crown
    this.parts.hatStar = hatStar
    this.parts.hatAxis = crownAxis
  }

  buildArmsAndWand() {
    const leftArm = createLimb({
      end: new Vector3(-0.56, 0.2, 0.16),
      material: this.materials.skin,
      name: 'fairy-arm-left',
      start: new Vector3(-0.28, 0.48, 0.04),
    })
    const rightArm = createLimb({
      end: new Vector3(0.6, 0.28, 0.18),
      material: this.materials.skin,
      name: 'fairy-arm-wand',
      start: new Vector3(0.28, 0.49, 0.04),
    })
    this.group.add(leftArm)

    addNamedMesh(
      this.group,
      new SphereGeometry(0.075, 8, 5),
      this.materials.skin,
      'fairy-hand-left',
      [-0.57, 0.19, 0.16],
    )
    const rightHand = addNamedMesh(
      this.group,
      new SphereGeometry(0.075, 8, 5),
      this.materials.skin,
      'fairy-hand-wand',
      [0.61, 0.28, 0.18],
    )

    this.parts.wand = new Group()
    this.parts.wand.name = 'fairy-star-wand'
    const wandStem = createLimb({
      end: new Vector3(0.24, 0.68, 0),
      material: this.materials.gold,
      name: 'fairy-wand-stem',
      radius: 0.025,
      start: new Vector3(-0.04, -0.14, 0),
    })
    this.parts.wand.add(wandStem)
    addNamedMesh(
      this.parts.wand,
      createStarGeometry(0.19, 0.085, 0.06),
      this.materials.gold,
      'fairy-wand-star',
      [0.24, 0.72, -0.03],
    )
    this.parts.wand.position.set(0.62, 0.39, 0.2)
    this.parts.wand.rotation.z = -0.07

    this.parts.wandArm = new Group()
    this.parts.wandArm.name = 'fairy-wand-arm-pivot'
    this.parts.wandArm.position.set(0.28, 0.49, 0.04)
    ;[rightArm, rightHand, this.parts.wand].forEach((part) => {
      part.position.sub(this.parts.wandArm.position)
      this.parts.wandArm.add(part)
    })
    this.group.add(this.parts.wandArm)
  }

  buildLegs() {
    ;[-1, 1].forEach((side) => {
      const leg = createLimb({
        end: new Vector3(side * 0.17, -1.02, 0.02),
        material: this.materials.skin,
        name: side < 0 ? 'fairy-leg-left' : 'fairy-leg-right',
        radius: 0.06,
        start: new Vector3(side * 0.13, -0.62, 0.01),
      })
      this.group.add(leg)
      const shoe = addNamedMesh(
        this.group,
        new SphereGeometry(0.12, 8, 5),
        this.materials.lavender,
        side < 0 ? 'fairy-shoe-left' : 'fairy-shoe-right',
        [side * 0.18, -1.08, 0.08],
        [0.82, 0.55, 1.25],
      )
      shoe.rotation.z = side * 0.08
    })
  }

  dispose() {
    const geometries = new Set()
    const materials = new Set()

    this.group.traverse((object) => {
      if (!object.isMesh) return
      geometries.add(object.geometry)
      const objectMaterials = Array.isArray(object.material) ? object.material : [object.material]
      objectMaterials.forEach((material) => materials.add(material))
    })

    geometries.forEach((geometry) => geometry.dispose())
    materials.forEach((material) => material.dispose())
    this.group.parent?.remove(this.group)
    this.group.clear()
  }
}
