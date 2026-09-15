import { useEffect, useRef, useState } from 'react'
import { useSectionStage } from '../core/SectionManagerContext.js'
import {
  LETTER_PAGE_STATE_EVENT,
  LETTER_STATE_EVENT,
  requestLetterPage,
  requestLetterToggle,
} from '../scenes/letterEvents.js'
import { getLetterContentModel } from './letterContentModel.js'

export function LetterInteractionSurface({ copy, sentences }) {
  const [letterState, setLetterState] = useState({
    isOpen: false,
    status: 'closed',
  })
  const openRef = useRef(false)
  const [pageState, setPageState] = useState({
    pageCount: 1,
    pageIndex: 0,
    typingStatus: 'idle',
  })
  const stage = useSectionStage('letter')
  const isInteractive = stage.state === 'active' && stage.presence >= 0.999
  const isFullyOpen = letterState.status === 'open'
  const letterContent = getLetterContentModel(sentences)
  const canNavigatePages = isInteractive
    && isFullyOpen
    && pageState.pageCount > 1
    && pageState.typingStatus === 'complete'

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

    function handlePageState({ detail }) {
      if (!detail) return
      setPageState({
        pageCount: Math.max(1, Number(detail.pageCount) || 1),
        pageIndex: Math.max(0, Number(detail.pageIndex) || 0),
        typingStatus: detail.typingStatus ?? 'idle',
      })
    }

    window.addEventListener(LETTER_STATE_EVENT, handleLetterState)
    window.addEventListener(LETTER_PAGE_STATE_EVENT, handlePageState)
    return () => {
      window.removeEventListener(LETTER_STATE_EVENT, handleLetterState)
      window.removeEventListener(LETTER_PAGE_STATE_EVENT, handlePageState)
    }
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
      <button
        aria-controls="letter-semantic-content"
        aria-label={`Trang trước, trang ${pageState.pageIndex + 1} trên ${pageState.pageCount}`}
        className="letter-page-control letter-page-control-previous"
        data-page-active={isInteractive && isFullyOpen && pageState.pageCount > 1}
        disabled={!canNavigatePages || pageState.pageIndex === 0}
        onClick={() => requestLetterPage('previous')}
        tabIndex={canNavigatePages && pageState.pageIndex > 0 ? 0 : -1}
        type="button"
      />
      <button
        aria-controls="letter-semantic-content"
        aria-label={`Trang sau, trang ${pageState.pageIndex + 1} trên ${pageState.pageCount}`}
        className="letter-page-control letter-page-control-next"
        data-page-active={isInteractive && isFullyOpen && pageState.pageCount > 1}
        disabled={!canNavigatePages || pageState.pageIndex >= pageState.pageCount - 1}
        onClick={() => requestLetterPage('next')}
        tabIndex={canNavigatePages && pageState.pageIndex < pageState.pageCount - 1 ? 0 : -1}
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
