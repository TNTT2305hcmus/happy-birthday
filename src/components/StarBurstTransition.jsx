import { useEffect, useRef } from 'react'

const COLORS = ['#ff8fb1', '#ffd9e9', '#e9e1ff', '#ffd98a', '#fff8f1']

function drawStar(context, particle) {
  const outerRadius = particle.size
  const innerRadius = outerRadius * 0.42

  context.beginPath()

  for (let point = 0; point < 10; point += 1) {
    const radius = point % 2 === 0 ? outerRadius : innerRadius
    const angle = particle.rotation + point * (Math.PI / 5) - Math.PI / 2
    const x = particle.x + Math.cos(angle) * radius
    const y = particle.y + Math.sin(angle) * radius

    if (point === 0) context.moveTo(x, y)
    else context.lineTo(x, y)
  }

  context.closePath()
  context.fill()
}

export function StarBurstTransition({ durationMs, onComplete }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const context = canvas.getContext('2d')
    let animationFrameId = null
    let hasCompleted = false

    function complete() {
      if (hasCompleted) return
      hasCompleted = true
      onComplete()
    }

    const recoveryTimer = window.setTimeout(complete, durationMs + 500)

    if (!context) {
      return () => window.clearTimeout(recoveryTimer)
    }

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const liteMode = document.documentElement.dataset.quality === 'lite'
    const particleCount = reducedMotion ? 55 : liteMode ? 110 : 220
    const pixelRatio = Math.min(window.devicePixelRatio || 1, liteMode ? 1 : 1.5)
    const width = window.innerWidth
    const height = window.innerHeight
    const speedBase = Math.min(width, height)
    const particles = Array.from({ length: particleCount }, (_, index) => {
      const angle = (index / particleCount) * Math.PI * 2 + (Math.random() - 0.5) * 0.45
      const speed = speedBase * (0.14 + Math.random() * 0.48)

      return {
        color: COLORS[index % COLORS.length],
        drag: 0.982 + Math.random() * 0.01,
        rotation: Math.random() * Math.PI,
        rotationSpeed: (Math.random() - 0.5) * 5,
        size: 2.5 + Math.random() * (liteMode ? 5 : 8),
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        x: width / 2 + (Math.random() - 0.5) * 80,
        y: height / 2 + (Math.random() - 0.5) * 50,
      }
    })

    canvas.width = Math.floor(width * pixelRatio)
    canvas.height = Math.floor(height * pixelRatio)
    canvas.style.width = `${width}px`
    canvas.style.height = `${height}px`
    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0)

    const startedAt = performance.now()
    let previousTime = startedAt

    function render(timestamp) {
      const elapsed = timestamp - startedAt
      const progress = Math.min(1, elapsed / durationMs)
      const delta = Math.min((timestamp - previousTime) / 1_000, 0.05)
      previousTime = timestamp

      context.clearRect(0, 0, width, height)
      context.fillStyle = `rgba(2, 7, 5, ${Math.max(0, 1 - progress * 1.35)})`
      context.fillRect(0, 0, width, height)

      particles.forEach((particle) => {
        particle.vx *= particle.drag
        particle.vy = particle.vy * particle.drag + speedBase * 0.09 * delta
        particle.x += particle.vx * delta
        particle.y += particle.vy * delta
        particle.rotation += particle.rotationSpeed * delta

        context.globalAlpha = Math.max(0, 1 - progress * 0.72)
        context.fillStyle = particle.color
        drawStar(context, particle)
      })

      context.globalAlpha = 1

      if (progress >= 1) {
        complete()
        return
      }

      animationFrameId = window.requestAnimationFrame(render)
    }

    animationFrameId = window.requestAnimationFrame(render)

    return () => {
      window.clearTimeout(recoveryTimer)
      if (animationFrameId !== null) window.cancelAnimationFrame(animationFrameId)
    }
  }, [durationMs, onComplete])

  return (
    <div className="star-burst-transition" aria-hidden="true">
      <div className="shatter-fragments">
        {Array.from({ length: 8 }, (_, index) => <span key={index} />)}
      </div>
      <canvas ref={canvasRef} />
      <div className="transition-flash" />
    </div>
  )
}
