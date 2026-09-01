import { useEffect, useRef, useState } from 'react'
import { audioManager } from '../core/AudioManager.js'
import { MatrixRain } from './MatrixRain.jsx'

export function HackIntro({ content, completeHoldMs, durationMs, onComplete }) {
  const [progress, setProgress] = useState(0)
  const [visibleLineCount, setVisibleLineCount] = useState(1)
  const lastBeepLine = useRef(0)

  useEffect(() => {
    const startedAt = performance.now()
    const lineStep = durationMs / (content.terminalLines.length + 1)
    let completionTimerId = null

    const timerId = window.setInterval(() => {
      const elapsed = performance.now() - startedAt
      const nextProgress = Math.min(100, Math.floor((elapsed / durationMs) * 100))
      const nextLineCount = Math.min(
        content.terminalLines.length,
        Math.max(1, Math.floor(elapsed / lineStep) + 1),
      )

      setProgress(nextProgress)
      setVisibleLineCount(nextLineCount)

      if (nextLineCount > lastBeepLine.current) {
        lastBeepLine.current = nextLineCount
        audioManager.playTone({
          frequency: 540 + nextLineCount * 42,
          volume: 0.012,
        })
      }

      if (nextProgress >= 100) {
        window.clearInterval(timerId)
        completionTimerId = window.setTimeout(() => onComplete?.(), completeHoldMs)
      }
    }, 80)

    return () => {
      window.clearInterval(timerId)
      if (completionTimerId !== null) window.clearTimeout(completionTimerId)
    }
  }, [completeHoldMs, content.terminalLines.length, durationMs, onComplete])

  return (
    <div
      className={'hack-intro'}
      role="dialog"
      aria-labelledby="hack-title"
      aria-modal="true"
    >
      <MatrixRain />
      <div className="hack-noise" aria-hidden="true" />
      <div className="hack-scanline" aria-hidden="true" />

      <main className="hack-console">
        <header className="terminal-header">
          <span className="terminal-lights" aria-hidden="true">
            <i />
            <i />
            <i />
          </span>
          <span>{content.windowTitle}</span>
          <span className="terminal-security">SECURE_SHELL</span>
        </header>

        <section className="terminal-body">
          <p className="terminal-warning">{content.warning}</p>
          <h1 className="glitch-title" id="hack-title" aria-label={content.headline}>
            <span className="glitch-code" aria-hidden="true">SECURITY_EVENT // 0x1111</span>
            {content.headlineLines.map((line) => (
              <span className="glitch-text" data-text={line} key={line} aria-hidden="true">
                {line}
              </span>
            ))}
          </h1>

          <div className="terminal-log" aria-label="Nhật ký hệ thống giả lập">
            {content.terminalLines.slice(0, visibleLineCount).map((line, index) => (
              <p key={line}>
                <span>{String(index + 1).padStart(2, '0')}</span>
                {line}
              </p>
            ))}
            <span className="terminal-cursor" aria-hidden="true">▋</span>
          </div>

          <div className="hack-progress" aria-label={`Tiến trình ${progress}%`}>
            <div className="hack-progress-meta">
              <span>{progress < 100 ? content.progressLabel : content.completeLabel}</span>
              <strong>{String(progress).padStart(3, '0')}%</strong>
            </div>
            <div className="hack-progress-track">
              <span style={{ transform: `scaleX(${progress / 100})` }} />
            </div>
          </div>

          <p className="hack-lock-message">{content.lockMessage}</p>
        </section>
      </main>
    </div>
  )
}
