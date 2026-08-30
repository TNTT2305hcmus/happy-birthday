import { useEffect, useState } from 'react'

function readRuntimeStatus() {
  const { dataset } = document.documentElement

  return {
    fps: dataset.fps ?? 'measuring',
    introLocked: dataset.introLocked === 'true' ? 'yes' : 'no',
    quality: dataset.quality ?? 'unknown',
    webgl: dataset.webgl ?? 'checking',
    webglReady: dataset.webglReady ?? 'checking',
  }
}

export function PerformanceDebugHud() {
  const [status, setStatus] = useState(readRuntimeStatus)

  useEffect(() => {
    const timerId = window.setInterval(() => setStatus(readRuntimeStatus()), 250)
    return () => window.clearInterval(timerId)
  }, [])

  return (
    <aside className="performance-debug-hud" aria-label="Thông tin hiệu năng">
      <strong>Runtime diagnostics</strong>
      <span>FPS <b>{status.fps}</b></span>
      <span>Quality <b>{status.quality}</b></span>
      <span>WebGL <b>{status.webgl}</b></span>
      <span>Renderer <b>{status.webglReady}</b></span>
      <span>Intro locked <b>{status.introLocked}</b></span>
    </aside>
  )
}
