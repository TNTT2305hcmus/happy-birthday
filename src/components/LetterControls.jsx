import { useEffect, useRef, useState } from 'react'
import {
  LETTER_STATE_EVENT,
  requestLetterToggle,
} from '../scenes/letterEvents.js'
import {
  getLetterContentModel,
  getLetterRevealSchedule,
} from './letterContentModel.js'

export function LetterControls({ copy, sentences }) {
  const [isOpen, setIsOpen] = useState(false)
  const [status, setStatus] = useState('closed')
  const previewScrollRef = useRef(null)
  const letterContent = getLetterContentModel(sentences)
  const revealSchedule = getLetterRevealSchedule(letterContent.sentences)

  useEffect(() => {
    function handleLetterState({ detail }) {
      if (!detail) return
      setIsOpen(Boolean(detail.isOpen))
      setStatus(detail.status ?? (detail.isOpen ? 'open' : 'closed'))
    }

    window.addEventListener(LETTER_STATE_EVENT, handleLetterState)
    return () => window.removeEventListener(LETTER_STATE_EVENT, handleLetterState)
  }, [])

  useEffect(() => {
    if (isOpen && previewScrollRef.current) {
      previewScrollRef.current.scrollTop = 0
    }
  }, [isOpen])

  function handleToggle() {
    const nextOpen = !isOpen
    setIsOpen(nextOpen)
    setStatus(nextOpen ? 'opening' : 'closing')
    requestLetterToggle(nextOpen)
  }

  const statusMessage = status === 'open'
    ? copy.openStatus
    : status === 'opening'
      ? copy.openingStatus
      : status === 'closing'
        ? copy.closingStatus
        : copy.closedStatus

  return (
    <div className="letter-experience" data-content-length={letterContent.length}>
      <div className="letter-controls">
        <button
          aria-controls="letter-preview-content"
          aria-expanded={isOpen}
          className="letter-toggle-button"
          data-letter-status={status}
          onClick={handleToggle}
          type="button"
        >
          <span className="letter-toggle-icon" aria-hidden="true">
            {isOpen ? '✦' : '♡'}
          </span>
          <span>
            <strong>{isOpen ? copy.closeLabel : copy.openLabel}</strong>
            <small>{isOpen ? copy.closeHint : copy.openHint}</small>
          </span>
        </button>
        <p className="letter-control-status" role="status" aria-live="polite">
          {statusMessage}
        </p>
      </div>

      <article
        aria-hidden={!isOpen}
        aria-label={copy.previewLabel}
        className="letter-preview"
        data-letter-content-length={letterContent.length}
        data-letter-reveal={isOpen ? 'writing' : 'hidden'}
        id="letter-preview-content"
      >
        <div
          className="letter-preview-scroll"
          ref={previewScrollRef}
          tabIndex={isOpen ? 0 : -1}
        >
          <p className="letter-salutation">{copy.salutation}</p>
          {letterContent.sentences.map((sentence, index) => (
            <p
              className="letter-handwriting-line"
              key={index}
              style={{
                '--letter-delay': String(revealSchedule.items[index].delaySeconds) + 's',
                '--letter-duration': String(revealSchedule.items[index].durationSeconds) + 's',
                '--letter-steps': revealSchedule.items[index].stepCount,
              }}
            >
              {sentence}
            </p>
          ))}
          {letterContent.isEmpty && (
            <p className="letter-empty-copy">{copy.emptyMessage}</p>
          )}
          <footer
            className="letter-signature"
            style={{
              '--letter-delay': String(revealSchedule.signatureDelaySeconds) + 's',
            }}
          >
            <span>{copy.signOff}</span>
            <strong>{copy.signature}</strong>
          </footer>
        </div>
        <p className="letter-placeholder-note">{copy.placeholderNotice}</p>
      </article>
    </div>
  )
}
