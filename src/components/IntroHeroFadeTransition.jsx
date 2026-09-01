import { useCallback, useEffect, useRef, useState } from 'react'
import {
  getIntroTransitionSnapshot,
  INTRO_TRANSITION_PHASES,
} from '../core/introTransitionTimeline.js'

export function IntroHeroFadeTransition({
  fadeInMs,
  fadeOutMs,
  onBlackout,
  onComplete,
}) {
  const performanceStartedAtRef = useRef(null)
  const wallStartedAtRef = useRef(null)
  const blackoutReportedRef = useRef(false)
  const completionReportedRef = useRef(false)
  const callbacksRef = useRef({ onBlackout, onComplete })
  const [snapshot, setSnapshot] = useState(() => (
    getIntroTransitionSnapshot(0, fadeOutMs, fadeInMs)
  ))

  useEffect(() => {
    callbacksRef.current = { onBlackout, onComplete }
  }, [onBlackout, onComplete])

  const reportSnapshot = useCallback((nextSnapshot) => {
    setSnapshot(nextSnapshot)

    if (
      nextSnapshot.phase !== INTRO_TRANSITION_PHASES.FADE_OUT
      && !blackoutReportedRef.current
    ) {
      blackoutReportedRef.current = true
      callbacksRef.current.onBlackout?.()
    }

    if (
      nextSnapshot.phase === INTRO_TRANSITION_PHASES.COMPLETE
      && !completionReportedRef.current
    ) {
      completionReportedRef.current = true
      callbacksRef.current.onComplete?.()
    }
  }, [])

  useEffect(() => {
    let timerId = null
    performanceStartedAtRef.current ??= performance.now()
    wallStartedAtRef.current ??= Date.now()

    function syncWithClock() {
      if (timerId !== null) window.clearTimeout(timerId)
      const elapsedMs = Math.max(
        performance.now() - performanceStartedAtRef.current,
        Date.now() - wallStartedAtRef.current,
      )
      const nextSnapshot = getIntroTransitionSnapshot(elapsedMs, fadeOutMs, fadeInMs)
      reportSnapshot(nextSnapshot)

      if (nextSnapshot.phase !== INTRO_TRANSITION_PHASES.COMPLETE) {
        timerId = window.setTimeout(syncWithClock, Math.max(0, nextSnapshot.remainingMs) + 16)
      }
    }

    syncWithClock()
    document.addEventListener('visibilitychange', syncWithClock)
    window.addEventListener('pageshow', syncWithClock)

    return () => {
      if (timerId !== null) window.clearTimeout(timerId)
      document.removeEventListener('visibilitychange', syncWithClock)
      window.removeEventListener('pageshow', syncWithClock)
    }
  }, [fadeInMs, fadeOutMs, reportSnapshot])

  if (snapshot.phase === INTRO_TRANSITION_PHASES.COMPLETE) return null

  return (
    <div
      aria-hidden={true}
      className={'intro-hero-fade'}
      data-transition-phase={snapshot.phase}
      style={{
        '--intro-fade-in-duration': `${fadeInMs}ms`,
        '--intro-fade-out-duration': `${fadeOutMs}ms`,
        '--intro-phase-delay': `${-snapshot.phaseElapsedMs}ms`,
      }}
    />
  )
}
