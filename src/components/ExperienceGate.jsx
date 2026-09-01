import { useCallback, useEffect, useState } from 'react'
import { audioManager } from '../core/AudioManager.js'
import { HackIntro } from './HackIntro.jsx'
import { IntroHeroFadeTransition } from './IntroHeroFadeTransition.jsx'

const LOCKED_KEYS = new Set([
  ' ',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
  'ArrowUp',
  'End',
  'Escape',
  'Home',
  'PageDown',
  'PageUp',
  'Tab',
])

export function ExperienceGate({ content, initialStage = 'landing', onStageChange }) {
  const [stage, setStage] = useState(initialStage)
  const [isActivating, setIsActivating] = useState(false)

  useEffect(() => {
    onStageChange?.(stage)
  }, [onStageChange, stage])

  useEffect(() => {
    const root = document.documentElement
    root.dataset.experienceStage = stage
    return () => {
      if (root.dataset.experienceStage === stage) delete root.dataset.experienceStage
    }
  }, [stage])

  const beginTransition = useCallback(() => {
    setStage((currentStage) => currentStage === 'hacker' ? 'fade-out' : currentStage)
  }, [])

  const revealHero = useCallback(() => {
    setStage((currentStage) => currentStage === 'fade-out' ? 'hero-reveal' : currentStage)
  }, [])

  const completeTransition = useCallback(() => {
    setStage('complete')
  }, [])

  useEffect(() => {
    if (stage !== 'hacker') {
      return undefined
    }

    const watchdogId = window.setTimeout(
      beginTransition,
      content.experience.introLockDurationMs + content.experience.introCompleteHoldMs + 1_000,
    )

    return () => window.clearTimeout(watchdogId)
  }, [
    beginTransition,
    content.experience.introCompleteHoldMs,
    content.experience.introLockDurationMs,
    stage,
  ])

  useEffect(() => {
    if (!['hacker', 'fade-out', 'hero-reveal'].includes(stage)) {
      return undefined
    }

    const root = document.documentElement
    const body = document.body
    const previousRootOverflow = root.style.overflow
    const previousBodyOverflow = body.style.overflow
    const previousTouchAction = body.style.touchAction
    const previousOverscrollBehavior = body.style.overscrollBehavior

    function preventMotion(event) {
      event.preventDefault()
    }

    function preventLockedKey(event) {
      if (LOCKED_KEYS.has(event.key)) event.preventDefault()
    }

    root.dataset.introLocked = 'true'
    root.style.overflow = 'hidden'
    body.style.overflow = 'hidden'
    body.style.touchAction = 'none'
    body.style.overscrollBehavior = 'none'
    window.addEventListener('wheel', preventMotion, { passive: false })
    window.addEventListener('touchmove', preventMotion, { passive: false })
    window.addEventListener('keydown', preventLockedKey, true)

    return () => {
      delete root.dataset.introLocked
      root.style.overflow = previousRootOverflow
      body.style.overflow = previousBodyOverflow
      body.style.touchAction = previousTouchAction
      body.style.overscrollBehavior = previousOverscrollBehavior
      window.removeEventListener('wheel', preventMotion)
      window.removeEventListener('touchmove', preventMotion)
      window.removeEventListener('keydown', preventLockedKey, true)
    }
  }, [stage])

  function activateExperience() {
    if (isActivating) {
      return
    }

    setIsActivating(true)
    setStage('hacker')
    audioManager.unlock()
      .then((isUnlocked) => {
        if (isUnlocked) {
          audioManager.playTone({ duration: 0.08, frequency: 880, volume: 0.025 })
        }
      })
      .catch((error) => {
        console.warn('Audio could not be unlocked; continuing silently.', error)
      })
  }

  if (stage === 'complete') {
    return null
  }

  if (stage === 'hacker' || stage === 'fade-out' || stage === 'hero-reveal') {
    return (
      <>
        {(stage === 'hacker' || stage === 'fade-out') && (
          <HackIntro
            key={'hack-intro'}
            content={content.intro}
            completeHoldMs={content.experience.introCompleteHoldMs}
            durationMs={content.experience.introLockDurationMs}
            onComplete={beginTransition}
          />
        )}
        {(stage === 'fade-out' || stage === 'hero-reveal') && (
          <IntroHeroFadeTransition
            key={'intro-hero-fade'}
            fadeInMs={content.experience.heroFadeInDurationMs}
            fadeOutMs={content.experience.introFadeToBlackDurationMs}
            onBlackout={revealHero}
            onComplete={completeTransition}
          />
        )}
      </>
    )
  }

  const { emailLanding, recipient } = content

  return (
    <div className="experience-gate" role="dialog" aria-labelledby="access-title" aria-modal="true">
      <div className="access-ambient" aria-hidden="true" />
      <main className="access-panel">
        <header className="access-header">
          <div className="access-brand">
            <span className="access-brand-mark" aria-hidden="true">11</span>
            <span>{emailLanding.senderLabel}</span>
          </div>
          <span className="access-status">Restricted access</span>
        </header>

        <div className="access-content">
          <p className="access-kicker">Private record · {emailLanding.recordCode}</p>
          <h1 id="access-title">{emailLanding.headline}</h1>
          <p className="access-copy">{emailLanding.description}</p>

          <dl className="access-record">
            <div>
              <dt>Recipient</dt>
              <dd>{recipient.fullName}</dd>
            </div>
            <div>
              <dt>Clearance</dt>
              <dd>Single-use</dd>
            </div>
            <div>
              <dt>Record</dt>
              <dd>{emailLanding.recordCode}</dd>
            </div>
          </dl>

          <button
            className="access-cta"
            disabled={isActivating}
            onClick={activateExperience}
            type="button"
          >
            <span>{isActivating ? 'Đang xác nhận…' : emailLanding.callToAction}</span>
            <span aria-hidden="true">→</span>
          </button>

          <p className="access-footnote">{emailLanding.footnote}</p>
        </div>
      </main>
    </div>
  )
}
