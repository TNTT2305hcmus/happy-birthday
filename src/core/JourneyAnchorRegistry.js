import {
  Plane,
  Raycaster,
  Vector2,
  Vector3,
} from 'three'

export const JOURNEY_ANCHOR_IDS = Object.freeze({
  CAKE_TOPPER: 'cake-topper',
  HERO_WAND_TIP: 'hero-wand-tip',
  WISH_SOURCE: 'wish-source',
})

function isFiniteVector2(value) {
  return value && Number.isFinite(value.x) && Number.isFinite(value.y)
}

function isFiniteVector3(value) {
  return isFiniteVector2(value) && Number.isFinite(value.z)
}

export class JourneyAnchorRegistry {
  constructor({ camera = null, canvas = null } = {}) {
    this.camera = camera
    this.canvas = canvas
    this.domAnchors = new Map()
    this.worldAnchors = new Map()
    this.raycaster = new Raycaster()
    this.projectionPlane = new Plane(new Vector3(0, 0, 1), 0)
    this.clientScratch = new Vector2()
    this.worldScratch = new Vector3()
    this.isDisposed = false
  }

  setViewport({ camera = this.camera, canvas = this.canvas } = {}) {
    if (this.isDisposed) return
    this.camera = camera
    this.canvas = canvas
  }

  registerDomAnchor(id, provider) {
    return this.register(this.domAnchors, id, provider)
  }

  registerWorldAnchor(id, provider) {
    return this.register(this.worldAnchors, id, provider)
  }

  register(collection, id, provider) {
    if (this.isDisposed || !id || (typeof provider !== 'function' && !provider)) return () => {}
    const registration = { provider }
    collection.set(id, registration)
    return () => {
      if (collection.get(id) === registration) collection.delete(id)
    }
  }

  resolveProvider(registration, target) {
    if (!registration) return null
    try {
      return typeof registration.provider === 'function'
        ? registration.provider(target)
        : registration.provider
    } catch {
      return null
    }
  }

  getCanvasRect() {
    const rect = this.canvas?.getBoundingClientRect?.()
    if (!rect || rect.width <= 0 || rect.height <= 0) return null
    return rect
  }

  clientToNdc(client, target = new Vector2()) {
    const rect = this.getCanvasRect()
    if (!rect || !isFiniteVector2(client)) return null
    return target.set(
      (client.x - rect.left) / rect.width * 2 - 1,
      1 - (client.y - rect.top) / rect.height * 2,
    )
  }

  ndcToClient(ndc, target = new Vector2()) {
    const rect = this.getCanvasRect()
    if (!rect || !isFiniteVector2(ndc)) return null
    return target.set(
      rect.left + (ndc.x + 1) * rect.width / 2,
      rect.top + (1 - ndc.y) * rect.height / 2,
    )
  }

  worldToClient(world, target = new Vector2()) {
    if (!this.camera || !isFiniteVector3(world)) return null
    this.camera.updateMatrixWorld()
    this.worldScratch.copy(world).project(this.camera)
    return this.ndcToClient(this.worldScratch, target)
  }

  clientToWorld(client, target = new Vector3(), { planeZ = 0 } = {}) {
    if (!this.camera || !Number.isFinite(planeZ)) return null
    const ndc = this.clientToNdc(client, this.clientScratch)
    if (!ndc) return null
    this.camera.updateMatrixWorld()
    this.raycaster.setFromCamera(ndc, this.camera)
    this.projectionPlane.constant = -planeZ
    return this.raycaster.ray.intersectPlane(this.projectionPlane, target)
  }

  getClientPosition(id, target = new Vector2()) {
    const domAnchor = this.resolveProvider(this.domAnchors.get(id))
    if (domAnchor) {
      const rect = domAnchor.getBoundingClientRect?.()
      if (!rect || rect.width < 0 || rect.height < 0) return null
      return target.set(rect.left + rect.width / 2, rect.top + rect.height / 2)
    }

    const world = this.resolveProvider(this.worldAnchors.get(id), this.worldScratch)
    return isFiniteVector3(world) ? this.worldToClient(world, target) : null
  }

  getWorldPosition(id, target = new Vector3(), { planeZ = 0 } = {}) {
    const world = this.resolveProvider(this.worldAnchors.get(id), this.worldScratch)
    if (isFiniteVector3(world)) return target.copy(world)

    const client = this.getClientPosition(id, this.clientScratch)
    return client ? this.clientToWorld(client, target, { planeZ }) : null
  }

  has(id) {
    return this.domAnchors.has(id) || this.worldAnchors.has(id)
  }

  dispose() {
    this.domAnchors.clear()
    this.worldAnchors.clear()
    this.camera = null
    this.canvas = null
    this.isDisposed = true
  }
}
