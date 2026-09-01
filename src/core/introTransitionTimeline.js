export const INTRO_TRANSITION_PHASES = Object.freeze({
  FADE_OUT: 'fade-out',
  HERO_REVEAL: 'hero-reveal',
  COMPLETE: 'complete',
})

function normalizeDuration(value) {
  return Number.isFinite(value) ? Math.max(0, value) : 0
}

export function getIntroTransitionSnapshot(elapsedMs, fadeOutMs, fadeInMs) {
  const elapsed = Math.max(0, Number.isFinite(elapsedMs) ? elapsedMs : 0)
  const fadeOutDuration = normalizeDuration(fadeOutMs)
  const fadeInDuration = normalizeDuration(fadeInMs)
  const totalDuration = fadeOutDuration + fadeInDuration

  if (elapsed >= totalDuration) {
    return {
      elapsedMs: elapsed,
      phase: INTRO_TRANSITION_PHASES.COMPLETE,
      phaseElapsedMs: fadeInDuration,
      remainingMs: 0,
    }
  }

  if (elapsed >= fadeOutDuration) {
    return {
      elapsedMs: elapsed,
      phase: INTRO_TRANSITION_PHASES.HERO_REVEAL,
      phaseElapsedMs: elapsed - fadeOutDuration,
      remainingMs: totalDuration - elapsed,
    }
  }

  return {
    elapsedMs: elapsed,
    phase: INTRO_TRANSITION_PHASES.FADE_OUT,
    phaseElapsedMs: elapsed,
    remainingMs: fadeOutDuration - elapsed,
  }
}
