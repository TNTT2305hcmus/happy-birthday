function canCreateWebGL2Context(forceDisabled = false) {
  if (forceDisabled || !window.WebGL2RenderingContext) {
    return false
  }

  const probeCanvas = document.createElement('canvas')
  const context = probeCanvas.getContext('webgl2', {
    failIfMajorPerformanceCaveat: false,
  })

  context?.getExtension('WEBGL_lose_context')?.loseContext()
  return Boolean(context)
}

export function detectRuntimeCapabilities(search = window.location.search) {
  const params = new URLSearchParams(search)
  const forcedQuality = params.get('quality')
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const connection = navigator.connection ?? navigator.mozConnection ?? navigator.webkitConnection
  const deviceMemory = navigator.deviceMemory ?? null
  const logicalCores = navigator.hardwareConcurrency ?? null
  const liteModeReasons = []

  if (forcedQuality === 'lite') {
    liteModeReasons.push('manual-override')
  } else if (forcedQuality !== 'full') {
    if (reducedMotion) liteModeReasons.push('reduced-motion')
    if (connection?.saveData) liteModeReasons.push('save-data')
    if (deviceMemory !== null && deviceMemory <= 4) liteModeReasons.push('limited-memory')
    if (logicalCores !== null && logicalCores <= 4) liteModeReasons.push('limited-cpu')
  }

  return {
    deviceMemory,
    forcedQuality,
    initialQualityMode: liteModeReasons.length > 0 ? 'lite' : 'full',
    liteModeReasons,
    logicalCores,
    reducedMotion,
    webglAvailable: canCreateWebGL2Context(params.get('webgl') === 'off'),
  }
}

export function applyRuntimeAttributes(capabilities) {
  const root = document.documentElement
  root.dataset.webgl = capabilities.webglAvailable ? 'available' : 'unavailable'
  root.dataset.quality = capabilities.initialQualityMode
  root.dataset.motion = capabilities.reducedMotion ? 'reduced' : 'full'
  root.dataset.webglReady = capabilities.webglAvailable ? 'loading' : 'fallback'

  return () => {
    delete root.dataset.webgl
    delete root.dataset.quality
    delete root.dataset.motion
    delete root.dataset.fps
    delete root.dataset.webglReady
  }
}
