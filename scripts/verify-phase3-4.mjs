import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import {
  classifyMicrophoneError,
  MicrophoneBlowDetector,
} from '../src/core/MicrophoneBlowDetector.js'

const [componentSource, configSource, stylesheet] = await Promise.all([
  readFile(new URL('../src/components/CakeControls.jsx', import.meta.url), 'utf8'),
  readFile(new URL('../src/content/config.js', import.meta.url), 'utf8'),
  readFile(new URL('../src/styles/global.css', import.meta.url), 'utf8'),
])

assert.ok(componentSource.includes('data-mic-failure'))
assert.ok(componentSource.includes('role="status"'))
assert.ok(componentSource.includes('micRetryLabel'))
assert.ok(configSource.includes("denied: 'Quyền microphone đã bị từ chối.'"))
assert.ok(configSource.includes("timeout: 'Đã chờ quyền microphone quá lâu.'"))
assert.ok(stylesheet.includes('.cake-mic-fallback'))

const errorNames = {
  NotAllowedError: 'denied',
  NotFoundError: 'not-found',
  NotReadableError: 'busy',
  SecurityError: 'security',
  TimeoutError: 'timeout',
  NotSupportedError: 'unsupported',
  UnexpectedError: 'unknown',
}
for (const [name, expectedReason] of Object.entries(errorNames)) {
  assert.equal(classifyMicrophoneError({ name }), expectedReason)
}

const deniedError = new Error('Permission denied')
deniedError.name = 'NotAllowedError'
let deniedState = null
const deniedDetector = new MicrophoneBlowDetector({
  audioContextFactory: () => null,
  mediaDevices: { getUserMedia: async () => { throw deniedError } },
  onStateChange: (state) => { deniedState = state },
  requestFrame: () => 1,
  setTimer: () => 1,
  clearTimer: () => {},
})
await assert.rejects(() => deniedDetector.start(), { name: 'NotAllowedError' })
assert.equal(deniedState.state, 'error')
assert.equal(deniedState.reason, 'denied')

let resolvePermission
const permissionRequest = new Promise((resolve) => { resolvePermission = resolve })
let timeoutCallback = null
let lateTrackStopped = false
let timeoutState = null
const timeoutDetector = new MicrophoneBlowDetector({
  mediaDevices: { getUserMedia: () => permissionRequest },
  onStateChange: (state) => { timeoutState = state },
  permissionTimeoutMs: 10,
  requestFrame: () => 1,
  setTimer: (callback) => { timeoutCallback = callback; return 1 },
  clearTimer: () => {},
})
const timedStart = timeoutDetector.start()
timeoutCallback()
await assert.rejects(() => timedStart, { name: 'TimeoutError' })
assert.equal(timeoutState.state, 'error')
assert.equal(timeoutState.reason, 'timeout')

resolvePermission({
  getTracks: () => [{ stop: () => { lateTrackStopped = true } }],
})
await new Promise((resolve) => setTimeout(resolve, 0))
assert.equal(lateTrackStopped, true, 'A stream resolving after timeout must be stopped')

let resolveCancelledPermission
const cancelledPermission = new Promise((resolve) => { resolveCancelledPermission = resolve })
let cancelledTrackStopped = false
const cancelledDetector = new MicrophoneBlowDetector({
  mediaDevices: { getUserMedia: () => cancelledPermission },
  requestFrame: () => 1,
  setTimer: () => 1,
  clearTimer: () => {},
})
const cancelledStart = cancelledDetector.start()
await cancelledDetector.stop()
await cancelledStart
resolveCancelledPermission({
  getTracks: () => [{ stop: () => { cancelledTrackStopped = true } }],
})
await new Promise((resolve) => setTimeout(resolve, 0))
assert.equal(cancelledTrackStopped, true, 'A stream resolving after cancellation must be stopped')

console.log('Phase 3.4 verification passed:', {
  deniedFallback: true,
  errorClassification: true,
  lateStreamCleanup: true,
  permissionTimeout: true,
  pendingRequestCancellation: true,
})
