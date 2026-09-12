import { useId, useState } from 'react'
import { loadWish, normalizeWish, saveWish } from '../core/wishStorage.js'

export function WishInput({
  copy,
  isReleased,
  onFlightComplete,
  onReady,
  showFlight,
}) {
  const descriptionId = useId()
  const [value, setValue] = useState(() => normalizeWish(
    loadWish({ key: copy.storageKey }),
    copy.maxLength,
  ))
  const [submissionState, setSubmissionState] = useState('editing')
  const normalizedWish = normalizeWish(value, copy.maxLength)
  const remainingCharacters = copy.maxLength - value.length
  const isPrepared = submissionState === 'ready'

  function handleSubmit(event) {
    event.preventDefault()
    if (!normalizedWish || isPrepared) return

    const wasSaved = saveWish({ key: copy.storageKey, value: normalizedWish })
    setValue(normalizedWish)
    setSubmissionState('ready')
    onReady(normalizedWish, wasSaved)
  }

  const statusMessage = isReleased
    ? copy.sentMessage
    : isPrepared
      ? copy.readyMessage
      : value
        ? copy.draftMessage
        : copy.idleMessage

  return (
    <div className="wish-input-shell" data-wish-state={isReleased ? 'sent' : submissionState}>
      <div className="wish-divider" aria-hidden="true"><span>✦</span></div>
      <form className="wish-form" onSubmit={handleSubmit}>
        <label htmlFor={descriptionId}>{copy.label}</label>
        <p id={`${descriptionId}-hint`}>{copy.hint}</p>
        <textarea
          aria-describedby={`${descriptionId}-hint ${descriptionId}-status`}
          data-journey-anchor="wish-source"
          disabled={isPrepared}
          id={descriptionId}
          maxLength={copy.maxLength}
          onChange={(event) => setValue(event.target.value)}
          placeholder={copy.placeholder}
          rows="3"
          value={value}
        />
        {showFlight && (
          <span
            className="wish-dissolve-copy"
            aria-hidden="true"
            onAnimationEnd={onFlightComplete}
          >
            {value}
          </span>
        )}
        <div className="wish-form-footer">
          <span className="wish-character-count" aria-label={`${remainingCharacters} ${copy.charactersRemainingLabel}`}>
            {remainingCharacters}/{copy.maxLength}
          </span>
          <button disabled={!normalizedWish || isPrepared} type="submit">
            <span>{isPrepared ? copy.readyButtonLabel : copy.submitLabel}</span>
            <b aria-hidden="true">↗</b>
          </button>
        </div>
      </form>
      <p className="wish-form-status" id={`${descriptionId}-status`} role="status">
        {statusMessage}
      </p>
    </div>
  )
}
