import { useEffect, useState } from 'react'
import { useSectionStage } from '../core/SectionManagerContext.js'
import { useRef } from 'react'
import {
  announceCakeStatus,
  CAKE_BLOW_REQUEST_EVENT,
  CAKE_FLAME_ACTIVATE_EVENT,
  CAKE_INTERACTION_READY_EVENT,
  CAKE_RESET_REQUEST_EVENT,
  CAKE_STATUS_EVENT,
  requestCakeFlameActivation,
  requestCakeFlamePointer,
} from '../scenes/cakeEvents.js'

const INITIAL_CANDLES = [true, true, true, true, true]

export function CakeVisualStage({ copy }) {
  const [litCount, setLitCount] = useState(5)
  const [candleStates, setCandleStates] = useState(INITIAL_CANDLES)
  const [interactionReady, setInteractionReady] = useState(false)
  const candleStatesRef = useRef(INITIAL_CANDLES)
  const stage = useSectionStage('cake')
  useEffect(() => {
    const fallback = () => document.documentElement.dataset.webgl === 'unavailable'
    const status = ({ detail }) => {
      setLitCount(detail.litCount)
      if (Array.isArray(detail.candleStates) && detail.candleStates.length === 5) {
        candleStatesRef.current = detail.candleStates.map(Boolean)
        setCandleStates(candleStatesRef.current)
      }
    }
    const interaction = ({ detail }) => setInteractionReady(detail.isReady)
    const blow = () => {
      if (fallback() && stage.state === 'active') {
        candleStatesRef.current = INITIAL_CANDLES.map(() => false)
        announceCakeStatus({ candleStates: candleStatesRef.current, litCount: 0, status: 'complete' })
      }
    }
    const activate = ({ detail }) => {
      if (!fallback() || stage.state !== 'active' || stage.presence < 0.999 || !interactionReady) return
      const index = Number(detail?.index)
      if (!Number.isInteger(index) || !candleStatesRef.current[index]) return
      const nextStates = candleStatesRef.current.map((isLit, candleIndex) => candleIndex === index ? false : isLit)
      const nextCount = nextStates.filter(Boolean).length
      candleStatesRef.current = nextStates
      announceCakeStatus({ candleStates: nextStates, litCount: nextCount, status: nextCount === 0 ? 'complete' : 'idle' })
    }
    const reset = () => {
      if (fallback()) {
        candleStatesRef.current = [...INITIAL_CANDLES]
        announceCakeStatus({ candleStates: candleStatesRef.current, litCount: 5, status: 'idle' })
      }
    }
    window.addEventListener(CAKE_STATUS_EVENT, status)
    window.addEventListener(CAKE_INTERACTION_READY_EVENT, interaction)
    window.addEventListener(CAKE_BLOW_REQUEST_EVENT, blow)
    window.addEventListener(CAKE_FLAME_ACTIVATE_EVENT, activate)
    window.addEventListener(CAKE_RESET_REQUEST_EVENT, reset)
    return () => {
      window.removeEventListener(CAKE_STATUS_EVENT, status)
      window.removeEventListener(CAKE_INTERACTION_READY_EVENT, interaction)
      window.removeEventListener(CAKE_BLOW_REQUEST_EVENT, blow)
      window.removeEventListener(CAKE_FLAME_ACTIVATE_EVENT, activate)
      window.removeEventListener(CAKE_RESET_REQUEST_EVENT, reset)
    }
  }, [interactionReady, stage.presence, stage.state])

  function handlePointerUp(event) {
    if (!interactionReady || stage.state !== 'active' || document.documentElement.dataset.webgl === 'unavailable') return
    requestCakeFlamePointer({
      clientX: event.clientX,
      clientY: event.clientY,
      pointerId: event.pointerId,
      pointerType: event.pointerType,
      timeStamp: event.timeStamp,
    })
  }

  const controlsLocked = !interactionReady || stage.state !== 'active' || stage.presence < 0.999
  const candleLabel = (index, isLit) => (isLit ? copy.candleLitLabel : copy.candleOutLabel)
    .replace('{number}', String(index + 1))

  function renderCandleButton(index, className) {
    const isLit = Boolean(candleStates[index])
    return (
      <button
        aria-label={candleLabel(index, isLit)}
        className={className}
        data-candle-index={index}
        data-lit={isLit}
        disabled={controlsLocked || !isLit}
        key={index}
        onClick={() => requestCakeFlameActivation(index, className.includes('fallback') ? 'fallback' : 'keyboard')}
        onPointerUp={(event) => event.stopPropagation()}
        type="button"
      >
        <b aria-hidden="true" />
      </button>
    )
  }

  return (
    <div
      className="cake-visual-stage"
      aria-label={copy.candleGroupLabel.replace('{count}', String(litCount))}
      data-candle-interaction={interactionReady ? 'ready' : 'locked'}
      onPointerUp={handlePointerUp}
      role="group"
    >
      <div className="cake-keyboard-candles">
        {INITIAL_CANDLES.map((_, index) => renderCandleButton(index, 'cake-keyboard-candle'))}
      </div>
      <div className="cake-fallback-model">
        <div className="cake-fallback-topper">&#9733;</div>
        <div className="cake-fallback-candles">
          {INITIAL_CANDLES.map((_, index) => renderCandleButton(index, 'cake-fallback-candle'))}
        </div>
        <div className="cake-fallback-tier cake-fallback-tier-top" />
        <div className="cake-fallback-tier cake-fallback-tier-middle" />
        <div className="cake-fallback-tier cake-fallback-tier-bottom" />
        <div className="cake-fallback-platter" />
      </div>
    </div>
  )
}
