import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import {
  calculateRms,
  calibrateBlowThreshold,
  MicrophoneBlowDetector,
} from '../src/core/MicrophoneBlowDetector.js'
import { requestCakeBlow, CAKE_BLOW_REQUEST_EVENT } from '../src/scenes/cakeEvents.js'

const [componentSource, configSource, stylesheet] = await Promise.all([
  readFile(new URL('../src/components/CakeControls.jsx', import.meta.url), 'utf8'),
  readFile(new URL('../src/content/config.js', import.meta.url), 'utf8'),
  readFile(new URL('../src/styles/global.css', import.meta.url), 'utf8'),
])

assert.ok(componentSource.includes('MicrophoneBlowDetector'))
assert.ok(componentSource.includes("requestCakeBlow(window, 'microphone')"))
assert.ok(configSource.includes('micCalibratingLabel'))
assert.ok(configSource.includes('không ghi âm'))
assert.ok(stylesheet.includes('.cake-mic-meter'))

assert.equal(calculateRms(new Uint8Array(32).fill(128)), 0)
assert.ok(calculateRms(new Uint8Array([64, 192])) > 0.49)
assert.equal(calibrateBlowThreshold([0.004, 0.006, 0.008]), 0.055)
assert.equal(calibrateBlowThreshold([0.2, 0.21, 0.22]), 0.24)

class TestCustomEvent {
  constructor(type, options) {
    this.type = type
    this.detail = options.detail
  }
}
const dispatchedEvents = []
const eventTarget = {
  CustomEvent: TestCustomEvent,
  dispatchEvent: (event) => dispatchedEvents.push(event),
}
requestCakeBlow(eventTarget, 'microphone')
assert.equal(dispatchedEvents[0].type, CAKE_BLOW_REQUEST_EVENT)
assert.equal(dispatchedEvents[0].detail.source, 'microphone')

let now = 0
let pendingFrame = null
let blowCount = 0
const track = { stopped: false, stop() { this.stopped = true } }
const quietSamples = new Uint8Array(1_024).fill(130)
const loudSamples = new Uint8Array(1_024).fill(176)
let currentSamples = quietSamples
const analyser = {
  disconnect() {},
  fftSize: 0,
  getByteTimeDomainData(target) { target.set(currentSamples) },
  smoothingTimeConstant: 0,
}
const context = {
  close: async () => {},
  createAnalyser: () => analyser,
  createMediaStreamSource: () => ({ connect() {}, disconnect() {} }),
  state: 'running',
}
const detector = new MicrophoneBlowDetector({
  audioContextFactory: () => context,
  calibrationDurationMs: 30,
  mediaDevices: { getUserMedia: async () => ({ getTracks: () => [track] }) },
  now: () => now,
  onBlow: () => { blowCount += 1 },
  requestFrame: (callback) => { pendingFrame = callback; return 1 },
  cancelFrame: () => { pendingFrame = null },
  requiredFrames: 3,
})

await detector.start()
for (let frame = 0; frame < 4; frame += 1) {
  now += 10
  const callback = pendingFrame
  callback()
}
assert.equal(detector.state, 'listening')
currentSamples = loudSamples
for (let frame = 0; frame < 3; frame += 1) {
  now += 16
  const callback = pendingFrame
  callback()
}
await Promise.resolve()
assert.equal(blowCount, 1)
assert.equal(track.stopped, true)

console.log('Phase 3.3 verification passed:', {
  analyserNode: true,
  ambientCalibration: true,
  microphoneEvent: true,
  sustainedDetection: true,
})
