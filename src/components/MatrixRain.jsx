import { useEffect, useRef } from 'react'

const GLYPHS = '01アイウエオカキクケコサシスセソ$#@%&ONLYYOU1111'

export function MatrixRain() {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const context = canvas.getContext('2d')

    if (!context) {
      return undefined
    }

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const fontSize = reducedMotion ? 18 : 15
    const frameInterval = reducedMotion ? 180 : 55
    let columns = 0
    let drops = []
    let animationFrameId = null
    let lastDrawAt = 0

    function resize() {
      const pixelRatio = Math.min(window.devicePixelRatio || 1, 1.5)
      canvas.width = Math.floor(window.innerWidth * pixelRatio)
      canvas.height = Math.floor(window.innerHeight * pixelRatio)
      canvas.style.width = `${window.innerWidth}px`
      canvas.style.height = `${window.innerHeight}px`
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0)
      columns = Math.ceil(window.innerWidth / fontSize)
      drops = Array.from(
        { length: columns },
        () => Math.random() * (window.innerHeight / fontSize),
      )
    }

    function draw(timestamp) {
      animationFrameId = window.requestAnimationFrame(draw)

      if (timestamp - lastDrawAt < frameInterval) {
        return
      }

      lastDrawAt = timestamp
      context.fillStyle = 'rgba(3, 10, 8, 0.12)'
      context.fillRect(0, 0, window.innerWidth, window.innerHeight)
      context.font = `600 ${fontSize}px ui-monospace, SFMono-Regular, Consolas, monospace`

      drops.forEach((drop, index) => {
        const glyph = GLYPHS[Math.floor(Math.random() * GLYPHS.length)]
        const x = index * fontSize
        const y = drop * fontSize
        context.fillStyle = Math.random() > 0.96 ? '#effff7' : '#57f59a'
        context.fillText(glyph, x, y)

        if (y > window.innerHeight && Math.random() > 0.975) {
          drops[index] = Math.random() * -20
        } else {
          drops[index] += reducedMotion ? 0.35 : 0.85
        }
      })
    }

    resize()
    window.addEventListener('resize', resize, { passive: true })
    animationFrameId = window.requestAnimationFrame(draw)

    return () => {
      window.removeEventListener('resize', resize)
      window.cancelAnimationFrame(animationFrameId)
    }
  }, [])

  return <canvas className="matrix-rain" ref={canvasRef} aria-hidden="true" />
}
