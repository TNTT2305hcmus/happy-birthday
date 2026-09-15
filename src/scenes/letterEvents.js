export const LETTER_TOGGLE_REQUEST_EVENT = 'twinkle:letter-toggle-request'
export const LETTER_STATE_EVENT = 'twinkle:letter-state'
export const LETTER_PAGE_REQUEST_EVENT = 'twinkle:letter-page-request'
export const LETTER_PAGE_STATE_EVENT = 'twinkle:letter-page-state'

export function requestLetterToggle(isOpen) {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent(LETTER_TOGGLE_REQUEST_EVENT, {
    detail: { isOpen: Boolean(isOpen) },
  }))
}

export function requestLetterPage(direction) {
  if (typeof window === 'undefined' || !['next', 'previous'].includes(direction)) return
  window.dispatchEvent(new CustomEvent(LETTER_PAGE_REQUEST_EVENT, { detail: { direction } }))
}

export function announceLetterPage({ pageCount, pageIndex, typingStatus }) {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent(LETTER_PAGE_STATE_EVENT, {
    detail: { pageCount, pageIndex, typingStatus },
  }))
}

export function announceLetterState({ isOpen, progress, source = 'scroll', status }) {
  if (typeof window === 'undefined') return
  const detail = {
    isOpen: Boolean(isOpen),
    progress: Math.max(0, Math.min(1, Number(progress) || 0)),
    source,
    status,
  }
  document.documentElement.dataset.letterState = status
  window.dispatchEvent(new CustomEvent(LETTER_STATE_EVENT, { detail }))
}
