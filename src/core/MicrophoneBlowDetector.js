const DEFAULT_CALIBRATION_MS = 1_200
const DEFAULT_PERMISSION_TIMEOUT_MS = 8_000
const DEFAULT_REQUIRED_FRAMES = 8
const MIN_THRESHOLD = 0.055
const MAX_THRESHOLD = 0.24

export function calculateRms(samples) {
  if (!samples.length) return 0
  let sumSquares = 0
  for (let index = 0; index < samples.length; index += 1) {
    const normalizedSample = (samples[index] - 128) / 128
    sumSquares += normalizedSample * normalizedSample
  }
  return Math.sqrt(sumSquares / samples.length)
}

export function calibrateBlowThreshold(noiseSamples) {
  if (!noiseSamples.length) return MIN_THRESHOLD
  const sorted = [...noiseSamples].sort((left, right) => left - right)
  const percentileIndex = Math.min(sorted.length - 1, Math.floor(sorted.length * 0.8))
  const ambientLevel = sorted[percentileIndex]
  return Math.min(MAX_THRESHOLD, Math.max(MIN_THRESHOLD, ambientLevel * 2.8 + 0.015))
}

export function classifyMicrophoneError(error) {
  switch (error?.name) {
    case 'NotAllowedError':
    case 'PermissionDeniedError':
      return 'denied'
    case 'NotFoundError':
    case 'DevicesNotFoundError':
      return 'not-found'
    case 'NotReadableError':
    case 'TrackStartError':
      return 'busy'
    case 'SecurityError':
      return 'security'
    case 'TimeoutError':
      return 'timeout'
    case 'NotSupportedError':
      return 'unsupported'
    default:
      return 'unknown'
  }
}

function createTimeoutError() {
  const error = new Error('Microphone permission request timed out.')
  error.name = 'TimeoutError'
  return error
}

export class MicrophoneBlowDetector {
  constructor({
    audioContextFactory,
    calibrationDurationMs = DEFAULT_CALIBRATION_MS,
    mediaDevices = globalThis.navigator?.mediaDevices,
    now = () => globalThis.performance.now(),
    onBlow = () => {},
    onLevel = () => {},
    onStateChange = () => {},
    permissionTimeoutMs = DEFAULT_PERMISSION_TIMEOUT_MS,
    requestFrame = globalThis.requestAnimationFrame?.bind(globalThis),
    cancelFrame = globalThis.cancelAnimationFrame?.bind(globalThis),
    setTimer = globalThis.setTimeout?.bind(globalThis),
    clearTimer = globalThis.clearTimeout?.bind(globalThis),
    requiredFrames = DEFAULT_REQUIRED_FRAMES,
  } = {}) {
    Object.assign(this, {
      audioContextFactory, calibrationDurationMs, mediaDevices, now, onBlow, onLevel,
      onStateChange, permissionTimeoutMs, requestFrame, cancelFrame, setTimer, clearTimer,
      requiredFrames,
    })
    this.context = null
    this.stream = null
    this.source = null
    this.analyser = null
    this.samples = null
    this.frameId = null
    this.state = 'inactive'
    this.threshold = MIN_THRESHOLD
    this.aboveThresholdFrames = 0
    this.calibrationSamples = []
    this.calibrationStartedAt = 0
    this.hasDetectedBlow = false
    this.stopRequested = false
    this.requestGeneration = 0
    this.cancelPendingRequest = null
    this.tick = this.tick.bind(this)
  }

  static isSupported() {
    const AudioContext = globalThis.AudioContext ?? globalThis.webkitAudioContext
    return Boolean(globalThis.isSecureContext && globalThis.navigator?.mediaDevices?.getUserMedia && AudioContext)
  }

  setState(state, detail = {}) {
    this.state = state
    this.onStateChange({ state, threshold: this.threshold, ...detail })
  }

  async requestStream() {
    const generation = ++this.requestGeneration
    const mediaRequest = this.mediaDevices.getUserMedia({
      audio: {
        autoGainControl: false,
        channelCount: 1,
        echoCancellation: false,
        noiseSuppression: false,
      },
      video: false,
    })

    mediaRequest.then((lateStream) => {
      if (this.stopRequested || generation !== this.requestGeneration) {
        lateStream.getTracks().forEach((track) => track.stop())
      }
    }).catch(() => {})

    let timeoutId = null
    try {
      return await new Promise((resolve, reject) => {
        this.cancelPendingRequest = () => {
          const error = new Error('Microphone request cancelled.')
          error.name = 'AbortError'
          reject(error)
        }
        timeoutId = this.setTimer(() => {
          if (generation === this.requestGeneration) this.requestGeneration += 1
          this.stopRequested = true
          reject(createTimeoutError())
        }, this.permissionTimeoutMs)
        mediaRequest.then(resolve, reject)
      })
    } finally {
      this.cancelPendingRequest = null
      if (timeoutId !== null) this.clearTimer?.(timeoutId)
    }
  }

  async start() {
    if (!['inactive', 'stopped', 'error'].includes(this.state)) return
    if (!this.mediaDevices?.getUserMedia || !this.requestFrame || !this.setTimer) {
      const error = new Error('Microphone input is not supported in this browser.')
      error.name = 'NotSupportedError'
      this.setState('error', { error, reason: classifyMicrophoneError(error) })
      throw error
    }

    this.stopRequested = false
    this.setState('requesting')
    try {
      const stream = await this.requestStream()
      if (this.stopRequested) {
        stream.getTracks().forEach((track) => track.stop())
        return
      }
      this.stream = stream
      const AudioContext = globalThis.AudioContext ?? globalThis.webkitAudioContext
      this.context = this.audioContextFactory?.() ?? new AudioContext()
      if (this.context.state === 'suspended') await this.context.resume()
      if (this.stopRequested) {
        await this.releaseResources()
        return
      }
      this.source = this.context.createMediaStreamSource(this.stream)
      this.analyser = this.context.createAnalyser()
      this.analyser.fftSize = 1_024
      this.analyser.smoothingTimeConstant = 0.12
      this.samples = new Uint8Array(this.analyser.fftSize)
      this.source.connect(this.analyser)
      this.calibrationSamples = []
      this.calibrationStartedAt = this.now()
      this.aboveThresholdFrames = 0
      this.hasDetectedBlow = false
      this.setState('calibrating')
      this.frameId = this.requestFrame(this.tick)
    } catch (error) {
      await this.releaseResources()
      if (error.name === 'AbortError' && this.stopRequested) return
      const reason = classifyMicrophoneError(error)
      this.setState('error', { error, reason })
      throw error
    }
  }

  tick() {
    if (!this.analyser || !this.samples) return
    this.analyser.getByteTimeDomainData(this.samples)
    const rms = calculateRms(this.samples)

    if (this.state === 'calibrating') {
      this.calibrationSamples.push(rms)
      const progress = Math.min(1, (this.now() - this.calibrationStartedAt) / this.calibrationDurationMs)
      this.onLevel({ level: rms, progress, threshold: this.threshold })
      if (progress >= 1) {
        this.threshold = calibrateBlowThreshold(this.calibrationSamples)
        this.setState('listening')
      }
    } else if (this.state === 'listening') {
      this.onLevel({ level: rms, progress: Math.min(1, rms / this.threshold), threshold: this.threshold })
      this.aboveThresholdFrames = rms >= this.threshold
        ? this.aboveThresholdFrames + 1
        : Math.max(0, this.aboveThresholdFrames - 2)
      if (this.aboveThresholdFrames >= this.requiredFrames && !this.hasDetectedBlow) {
        this.hasDetectedBlow = true
        this.setState('detected')
        this.onBlow({ level: rms, threshold: this.threshold })
        this.stop()
        return
      }
    }
    this.frameId = this.requestFrame(this.tick)
  }

  async releaseResources() {
    if (this.frameId !== null && this.cancelFrame) this.cancelFrame(this.frameId)
    this.frameId = null
    this.source?.disconnect()
    this.analyser?.disconnect()
    this.stream?.getTracks().forEach((track) => track.stop())
    if (this.context && this.context.state !== 'closed') await this.context.close()
    this.source = null
    this.analyser = null
    this.samples = null
    this.stream = null
    this.context = null
  }

  async stop() {
    this.stopRequested = true
    this.requestGeneration += 1
    this.cancelPendingRequest?.()
    await this.releaseResources()
    if (this.state !== 'error') this.setState('stopped')
  }
}
