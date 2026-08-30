import { useCallback, useEffect, useState } from 'react'
import { audioManager } from '../core/AudioManager.js'
import { HackIntro } from './HackIntro.jsx'
import { StarBurstTransition } from './StarBurstTransition.jsx'

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

export function ExperienceGate({ content, initialStage = 'landing' }) {
  const [stage, setStage] = useState(initialStage)
  const [isActivating, setIsActivating] = useState(false)

  const beginTransition = useCallback(() => {
    setStage((currentStage) => currentStage === 'hacker' ? 'transition' : currentStage)
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
    if (stage !== 'hacker' && stage !== 'transition') {
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

  async function activateExperience() {
    if (isActivating) {
      return
    }

    setIsActivating(true)

    try {
      await audioManager.unlock()
      audioManager.playTone({ duration: 0.08, frequency: 880, volume: 0.025 })
    } catch (error) {
      console.warn('Audio could not be unlocked; continuing silently.', error)
    }

    setStage('hacker')
  }

  if (stage === 'complete') {
    return null
  }

  if (stage === 'hacker' || stage === 'transition') {
    return (
      <>
        <HackIntro
          content={content.intro}
          completeHoldMs={content.experience.introCompleteHoldMs}
          durationMs={content.experience.introLockDurationMs}
          isExiting={stage === 'transition'}
          onComplete={beginTransition}
        />
        {stage === 'transition' && (
          <StarBurstTransition
            durationMs={content.experience.transitionDurationMs}
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
