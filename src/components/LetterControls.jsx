import { useEffect, useState } from 'react'
import {
  LETTER_STATE_EVENT,
  requestLetterToggle,
} from '../scenes/letterEvents.js'

export function LetterControls({ copy }) {
  const [isOpen, setIsOpen] = useState(false)
  const [status, setStatus] = useState('closed')

  useEffect(() => {
    function handleLetterState({ detail }) {
      if (!detail) return
      setIsOpen(Boolean(detail.isOpen))
      setStatus(detail.status ?? (detail.isOpen ? 'open' : 'closed'))
    }

    window.addEventListener(LETTER_STATE_EVENT, handleLetterState)
    return () => window.removeEventListener(LETTER_STATE_EVENT, handleLetterState)
  }, [])

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
  )
}
