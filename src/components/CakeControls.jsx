import { useEffect, useRef, useState } from 'react'
import {
  classifyMicrophoneError,
  MicrophoneBlowDetector,
} from '../core/MicrophoneBlowDetector.js'
import {
  CAKE_STATUS_EVENT,
  requestCakeBlow,
  requestCakeInteractionReady,
  requestCakeReset,
  requestCakeWish,
} from '../scenes/cakeEvents.js'
import { WishInput } from './WishInput.jsx'

export function CakeControls({ copy }) {
  const microphoneSupported = MicrophoneBlowDetector.isSupported()
  const [status, setStatus] = useState('idle')
  const [litCount, setLitCount] = useState(5)
  const [micState, setMicState] = useState(microphoneSupported ? 'inactive' : 'unsupported')
  const [micFailure, setMicFailure] = useState(microphoneSupported ? null : 'unsupported')
  const [micLevel, setMicLevel] = useState(0)
  const [preparedWish, setPreparedWish] = useState('')
  const [wishReleased, setWishReleased] = useState(false)
  const [showWishFlight, setShowWishFlight] = useState(false)
  const [ritualCycle, setRitualCycle] = useState(0)
  const detectorRef = useRef(null)
  const preparedWishRef = useRef('')
  const wishReleasedRef = useRef(false)

  useEffect(() => {
    function handleStatus({ detail }) {
      setStatus(detail.status)
      setLitCount(detail.litCount)

      if (detail.status === 'complete' && preparedWishRef.current && !wishReleasedRef.current) {
        wishReleasedRef.current = true
        setWishReleased(true)
        setShowWishFlight(true)
        requestCakeWish(preparedWishRef.current)
      }
    }
    window.addEventListener(CAKE_STATUS_EVENT, handleStatus)
    return () => {
      window.removeEventListener(CAKE_STATUS_EVENT, handleStatus)
      const detector = detectorRef.current
      if (detector) {
        detector.onStateChange = () => {}
        detector.onLevel = () => {}
        detector.onBlow = () => {}
        detector.stop()
      }
      detectorRef.current = null
      requestCakeInteractionReady(false)
    }
  }, [])

  useEffect(() => {
    if (status !== 'idle') detectorRef.current?.stop()
  }, [status])

  function handleWishReady(wish) {
    preparedWishRef.current = wish
    wishReleasedRef.current = false
    setPreparedWish(wish)
    setWishReleased(false)
    setShowWishFlight(false)
    requestCakeInteractionReady(true)
  }

  function handleReset() {
    const detector = detectorRef.current
    if (detector) {
      detector.onStateChange = () => {}
      detector.onLevel = () => {}
      detector.onBlow = () => {}
      detector.stop()
    }
    detectorRef.current = null
    preparedWishRef.current = ''
    wishReleasedRef.current = false
    setPreparedWish('')
    setWishReleased(false)
    setShowWishFlight(false)
    setStatus('idle')
    setLitCount(5)
    setMicLevel(0)
    setMicState(microphoneSupported ? 'inactive' : 'unsupported')
    setMicFailure(microphoneSupported ? null : 'unsupported')
    setRitualCycle((cycle) => cycle + 1)
    requestCakeInteractionReady(false)
    requestCakeReset()
  }

  async function handleMicrophone() {
    if (status !== 'idle' || !preparedWish || !['inactive', 'error'].includes(micState)) return
    setMicFailure(null)
    const detector = new MicrophoneBlowDetector({
      onBlow: () => requestCakeBlow(window, 'microphone'),
      onLevel: ({ progress }) => setMicLevel(progress),
      onStateChange: ({ error, reason, state }) => {
        setMicState(state)
        if (state === 'listening') setMicLevel(0)
        if (state === 'error') setMicFailure(reason ?? classifyMicrophoneError(error))
      },
    })
    detectorRef.current = detector
    try {
      await detector.start()
    } catch {
      // The reason-specific notice and manual control keep the experience moving.
    }
  }

  const message = status === 'complete'
    ? copy.completeMessage
    : status === 'extinguishing'
      ? copy.extinguishingMessage.replace('{count}', litCount)
      : preparedWish
        ? copy.idleMessage
        : copy.awaitingWishMessage
  const micLabel = micState === 'requesting'
    ? copy.micRequestingLabel
    : micState === 'calibrating'
      ? copy.micCalibratingLabel
      : micState === 'listening'
        ? copy.micListeningLabel
        : micState === 'error'
          ? copy.micRetryLabel
          : micState === 'unsupported'
            ? copy.micUnavailableLabel
            : copy.micButtonLabel
  const micHint = micState === 'calibrating'
    ? copy.micCalibratingHint
    : micState === 'listening'
      ? copy.micListeningHint
      : micState === 'error'
        ? copy.micRetryHint
        : preparedWish
          ? copy.micPermissionHint
          : copy.awaitingWishHint
  const micIsBusy = ['requesting', 'calibrating', 'listening', 'detected'].includes(micState)
  const fallbackMessage = micFailure
    ? copy.micFallback[micFailure] ?? copy.micFallback.unknown
    : null

  return (
    <div
      className="cake-controls"
      data-cake-status={status}
      data-celebrating={wishReleased}
      data-wish-ready={Boolean(preparedWish)}
    >
      <WishInput
        key={ritualCycle}
        copy={copy.wishForm}
        isReleased={wishReleased}
        onFlightComplete={() => setShowWishFlight(false)}
        onReady={handleWishReady}
        showFlight={showWishFlight}
      />
      <div className="cake-status" aria-live="polite">
        <span className="cake-status-dot" aria-hidden="true" />
        <p>{message}</p>
      </div>
      <button
        className="cake-mic-button"
        data-mic-state={micState}
        disabled={status !== 'idle' || !preparedWish || micIsBusy || micState === 'unsupported'}
        onClick={handleMicrophone}
        type="button"
      >
        <span className="cake-mic-icon" aria-hidden="true">♫</span>
        <span className="cake-button-copy" aria-live="polite">
          <strong>{micLabel}</strong>
          <small>{micHint}</small>
        </span>
        <span className="cake-mic-meter" aria-hidden="true" style={{ '--mic-level': Math.min(1, micLevel) }}>
          <i />
        </span>
      </button>
      {fallbackMessage && status === 'idle' && (
        <div className="cake-mic-fallback" data-mic-failure={micFailure} role="status">
          <span aria-hidden="true">!</span>
          <p>
            <strong>{fallbackMessage}</strong>
            <small>{copy.micFallbackInteractionHint}</small>
          </p>
        </div>
      )}
      {status === 'complete' && (
        <button
          className="cake-reset-button"
          disabled={showWishFlight}
          onClick={handleReset}
          type="button"
        >
          <span aria-hidden="true">↻</span>
          <span>
            <strong>{copy.resetButtonLabel}</strong>
            <small>{showWishFlight ? copy.resetWaitingHint : copy.resetButtonHint}</small>
          </span>
        </button>
      )}
    </div>
  )
}
