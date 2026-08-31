import {
  PerspectiveCamera,
  Scene,
  SRGBColorSpace,
  WebGLRenderer,
} from 'three'

const QUALITY_PROFILES = {
  full: {
    maxPixelRatio: 2,
    powerPreference: 'high-performance',
  },
  lite: {
    maxPixelRatio: 1,
    powerPreference: 'low-power',
  },
}

export class SceneManager {
  constructor({ canvas, qualityMode = 'full', reducedMotion = false }) {
    if (!canvas) {
      throw new Error('SceneManager requires a canvas element.')
    }

    this.canvas = canvas
    this.qualityMode = qualityMode
    this.reducedMotion = reducedMotion
    this.scene = new Scene()
    this.camera = new PerspectiveCamera(45, 1, 0.1, 100)
    this.camera.position.set(0, 0, 5)
    this.frameTasks = new Set()
    this.sceneModules = new Map()
    this.activeSectionIds = new Set()
    this.sectionProgress = {}
    this.animationFrameId = null
    this.lastFrameTime = null
    this.isRunning = false
    this.isDisposed = false

    const profile = QUALITY_PROFILES[this.qualityMode]
    this.renderer = new WebGLRenderer({
      canvas: this.canvas,
      alpha: true,
      antialias: this.qualityMode === 'full',
      powerPreference: profile.powerPreference,
    })
    this.renderer.setClearColor(0x000000, 0)
    this.renderer.outputColorSpace = SRGBColorSpace
    this.renderer.shadowMap.enabled = false
    this.canvas.dataset.quality = this.qualityMode

    this.handleResize = this.handleResize.bind(this)
    this.handleVisibilityChange = this.handleVisibilityChange.bind(this)
    this.renderFrame = this.renderFrame.bind(this)

    window.addEventListener('resize', this.handleResize, { passive: true })
    document.addEventListener('visibilitychange', this.handleVisibilityChange)
    this.handleResize()
  }

  addFrameTask(task) {
    this.frameTasks.add(task)
    return () => this.frameTasks.delete(task)
  }

  addSceneModule(sceneModule, { sectionId = null } = {}) {
    if (!sceneModule || typeof sceneModule.mount !== 'function') {
      throw new TypeError('Scene modules must provide a mount(context) method.')
    }

    const context = {
      camera: this.camera,
      qualityMode: this.qualityMode,
      reducedMotion: this.reducedMotion,
      renderer: this.renderer,
      scene: this.scene,
    }

    sceneModule.mount(context)
    this.sceneModules.set(sceneModule, { sectionId })
    if (sectionId) {
      sceneModule.setScrollProgress?.(this.sectionProgress[sectionId] ?? 0)
      sceneModule.setActive?.(this.activeSectionIds.has(sectionId))
    }
    sceneModule.resize?.({
      height: Math.max(1, window.innerHeight),
      width: Math.max(1, window.innerWidth),
    })

    return () => this.removeSceneModule(sceneModule)
  }

  removeSceneModule(sceneModule) {
    if (!this.sceneModules.delete(sceneModule)) {
      return
    }

    sceneModule.dispose?.()
  }

  setQualityMode(nextMode) {
    if (!QUALITY_PROFILES[nextMode] || this.qualityMode === nextMode) {
      return
    }

    this.qualityMode = nextMode
    this.canvas.dataset.quality = nextMode
    this.sceneModules.forEach((_, sceneModule) => sceneModule.setQualityMode?.(nextMode))
    this.handleResize()
  }

  setSectionSnapshot({ presentSectionIds = [], sectionProgress = {} } = {}) {
    this.activeSectionIds = new Set(presentSectionIds)
    this.sectionProgress = sectionProgress
    this.sceneModules.forEach(({ sectionId }, sceneModule) => {
      if (!sectionId) return
      sceneModule.setActive?.(this.activeSectionIds.has(sectionId))
      sceneModule.setScrollProgress?.(sectionProgress[sectionId] ?? 0)
    })
  }

  handleResize() {
    if (this.isDisposed) {
      return
    }

    const width = Math.max(1, window.innerWidth)
    const height = Math.max(1, window.innerHeight)
    const { maxPixelRatio } = QUALITY_PROFILES[this.qualityMode]
    const pixelRatio = Math.min(window.devicePixelRatio || 1, maxPixelRatio)

    this.camera.aspect = width / height
    this.camera.updateProjectionMatrix()
    this.renderer.setPixelRatio(pixelRatio)
    this.renderer.setSize(width, height, false)
    this.sceneModules.forEach((_, sceneModule) => sceneModule.resize?.({ height, width }))
  }

  handleVisibilityChange() {
    if (document.hidden) {
      this.pause()
      return
    }

    if (!this.isDisposed) {
      this.start()
    }
  }

  renderFrame(timestamp) {
    if (!this.isRunning || this.isDisposed) {
      return
    }

    const rawDelta = this.lastFrameTime === null ? 0 : (timestamp - this.lastFrameTime) / 1000
    const delta = Math.min(rawDelta, 0.1)
    this.lastFrameTime = timestamp

    const frame = {
      camera: this.camera,
      delta,
      qualityMode: this.qualityMode,
      reducedMotion: this.reducedMotion,
      renderer: this.renderer,
      scene: this.scene,
      timestamp,
    }

    this.frameTasks.forEach((task) => task(frame))
    this.sceneModules.forEach(({ sectionId }, sceneModule) => {
      if (!sectionId || this.activeSectionIds.has(sectionId)) sceneModule.update?.(frame)
    })
    this.renderer.render(this.scene, this.camera)
    this.animationFrameId = window.requestAnimationFrame(this.renderFrame)
  }

  start() {
    if (this.isRunning || this.isDisposed || document.hidden) {
      return
    }

    this.isRunning = true
    this.lastFrameTime = null
    this.animationFrameId = window.requestAnimationFrame(this.renderFrame)
  }

  pause() {
    this.isRunning = false
    this.lastFrameTime = null

    if (this.animationFrameId !== null) {
      window.cancelAnimationFrame(this.animationFrameId)
      this.animationFrameId = null
    }
  }

  dispose() {
    if (this.isDisposed) {
      return
    }

    this.pause()
    this.isDisposed = true
    this.frameTasks.clear()
    this.sceneModules.forEach((_, sceneModule) => sceneModule.dispose?.())
    this.sceneModules.clear()
    window.removeEventListener('resize', this.handleResize)
    document.removeEventListener('visibilitychange', this.handleVisibilityChange)
    this.renderer.dispose()
  }
}
