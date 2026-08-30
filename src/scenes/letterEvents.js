export const LETTER_TOGGLE_REQUEST_EVENT = 'twinkle:letter-toggle-request'
export const LETTER_STATE_EVENT = 'twinkle:letter-state'

export function requestLetterToggle(isOpen) {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent(LETTER_TOGGLE_REQUEST_EVENT, {
    detail: { isOpen: Boolean(isOpen) },
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
