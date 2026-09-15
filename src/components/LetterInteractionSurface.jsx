import { useEffect, useRef, useState } from 'react'
import { useSectionStage } from '../core/SectionManagerContext.js'
import {
  LETTER_STATE_EVENT,
  requestLetterToggle,
} from '../scenes/letterEvents.js'
import { getLetterContentModel } from './letterContentModel.js'

export function LetterInteractionSurface({ copy, sentences }) {
  const [letterState, setLetterState] = useState({
    isOpen: false,
    status: 'closed',
  })
  const openRef = useRef(false)
  const stage = useSectionStage('letter')
  const isInteractive = stage.state === 'active' && stage.presence >= 0.999
  const isFullyOpen = letterState.status === 'open'
  const letterContent = getLetterContentModel(sentences)

  useEffect(() => {
    function handleLetterState({ detail }) {
      if (!detail) return
      const nextState = {
        isOpen: Boolean(detail.isOpen),
        status: detail.status ?? (detail.isOpen ? 'open' : 'closed'),
      }
      openRef.current = nextState.isOpen
      setLetterState(nextState)
    }

    window.addEventListener(LETTER_STATE_EVENT, handleLetterState)
    return () => window.removeEventListener(LETTER_STATE_EVENT, handleLetterState)
  }, [])

  function handleToggle() {
    if (!isInteractive) return
    const nextOpen = !openRef.current
    openRef.current = nextOpen
    requestLetterToggle(nextOpen)
  }

  return (
    <>
      <button
        aria-controls={'letter-semantic-content'}
        aria-expanded={letterState.isOpen}
        aria-label={letterState.isOpen ? copy.closeLabel : copy.openLabel}
        className="letter-interaction-surface"
        data-letter-status={letterState.status}
        disabled={!isInteractive}
        onClick={handleToggle}
        tabIndex={isInteractive ? 0 : -1}
        type="button"
      />
      <article
        aria-hidden={!isFullyOpen}
        aria-label={copy.previewLabel}
        className={'letter-semantic-content'}
        id={'letter-semantic-content'}
      >
        <p>{copy.salutation}</p>
        {letterContent.sentences.map((sentence, index) => <p key={index}>{sentence}</p>)}
        {letterContent.isEmpty && <p>{copy.emptyMessage}</p>}
        <footer>
          <span>{copy.signOff}</span>
          <strong>{copy.signature}</strong>
        </footer>
      </article>
    </>
  )
}
