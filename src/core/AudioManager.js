class AudioManager {
  constructor() {
    this.context = null
    this.isUnlocked = false
  }

  async unlock() {
    const AudioContext = window.AudioContext ?? window.webkitAudioContext

    if (!AudioContext) {
      return false
    }

    this.context ??= new AudioContext()

    if (this.context.state === 'suspended') {
      await this.context.resume()
    }

    this.isUnlocked = this.context.state === 'running'
    return this.isUnlocked
  }

  playTone({ duration = 0.045, frequency = 720, volume = 0.018 } = {}) {
    if (!this.isUnlocked || !this.context) {
      return
    }

    const now = this.context.currentTime
    const oscillator = this.context.createOscillator()
    const gain = this.context.createGain()

    oscillator.type = 'square'
    oscillator.frequency.setValueAtTime(frequency, now)
    gain.gain.setValueAtTime(0.0001, now)
    gain.gain.exponentialRampToValueAtTime(volume, now + 0.006)
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration)
    oscillator.connect(gain)
    gain.connect(this.context.destination)
    oscillator.start(now)
    oscillator.stop(now + duration + 0.01)
  }
}

export const audioManager = new AudioManager()
