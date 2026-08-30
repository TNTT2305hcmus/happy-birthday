export class PerformanceMonitor {
  constructor({ durationMs = 2_000, fpsThreshold = 40, onSample }) {
    this.durationMs = durationMs
    this.fpsThreshold = fpsThreshold
    this.onSample = onSample
    this.startedAt = null
    this.frameCount = 0
    this.isComplete = false
  }

  recordFrame(timestamp) {
    if (this.isComplete) {
      return
    }

    if (this.startedAt === null) {
      this.startedAt = timestamp
    }

    this.frameCount += 1
    const elapsed = timestamp - this.startedAt

    if (elapsed < this.durationMs) {
      return
    }

    const fps = Math.round(this.frameCount / (elapsed / 1_000))
    this.isComplete = true
    this.onSample?.({
      fps,
      shouldEnableLiteMode: fps < this.fpsThreshold,
    })
  }
}
