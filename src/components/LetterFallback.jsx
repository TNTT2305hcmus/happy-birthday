import { useMemo, useState } from 'react'
import { useSectionStage } from '../core/SectionManagerContext.js'
import { getLetterContentModel } from './letterContentModel.js'

const SENTENCES_PER_PAGE = 3

export function LetterFallback({ copy, sentences }) {
  const [isOpen, setIsOpen] = useState(false)
  const [pageIndex, setPageIndex] = useState(0)
  const stage = useSectionStage('letter')
  const isInteractive = stage.state === 'active' && stage.presence >= 0.999
  const content = getLetterContentModel(sentences)
  const pages = useMemo(() => {
    const body = content.isEmpty ? [copy.emptyMessage] : content.sentences
    return Array.from(
      { length: Math.max(1, Math.ceil(body.length / SENTENCES_PER_PAGE)) },
      (_, index) => body.slice(index * SENTENCES_PER_PAGE, (index + 1) * SENTENCES_PER_PAGE),
    )
  }, [content.isEmpty, content.sentences, copy.emptyMessage])

  function toggleLetter() {
    if (!isInteractive) return
    setIsOpen((open) => {
      if (open) setPageIndex(0)
      return !open
    })
  }

  return (
    <div className="letter-fallback" data-open={isOpen}>
      <div className="letter-fallback-back" aria-hidden="true" />
      <div className="letter-fallback-flap" aria-hidden="true" />
      <article
        aria-hidden={!isOpen}
        aria-label={copy.previewLabel}
        className="letter-fallback-paper"
      >
        {pageIndex === 0 && <p className="letter-fallback-salutation">{copy.salutation}</p>}
        <div className="letter-fallback-body">
          {pages[pageIndex].map((sentence, index) => <p key={index}>{sentence}</p>)}
        </div>
        {pageIndex === pages.length - 1 && (
          <footer>
            <span>{copy.signOff}</span>
            <strong>{copy.signature}</strong>
          </footer>
        )}
        {pages.length > 1 && <small>{pageIndex + 1} / {pages.length}</small>}
      </article>
      <div className="letter-fallback-pocket" aria-hidden="true" />
      <button
        aria-expanded={isOpen}
        aria-label={isOpen ? copy.closeLabel : copy.openLabel}
        className="letter-fallback-toggle"
        disabled={!isInteractive}
        onClick={toggleLetter}
        type="button"
      />
      <button
        aria-label={`Trang trước, trang ${pageIndex + 1} trên ${pages.length}`}
        className="letter-fallback-page letter-fallback-page-previous"
        disabled={!isInteractive || !isOpen || pageIndex === 0}
        onClick={() => setPageIndex((page) => Math.max(0, page - 1))}
        type="button"
      >‹</button>
      <button
        aria-label={`Trang sau, trang ${pageIndex + 1} trên ${pages.length}`}
        className="letter-fallback-page letter-fallback-page-next"
        disabled={!isInteractive || !isOpen || pageIndex === pages.length - 1}
        onClick={() => setPageIndex((page) => Math.min(pages.length - 1, page + 1))}
        type="button"
      >›</button>
    </div>
  )
}
