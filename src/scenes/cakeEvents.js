export const CAKE_BLOW_REQUEST_EVENT = 'twinkle:cake-blow-request'
export const CAKE_STATUS_EVENT = 'twinkle:cake-status'
export const CAKE_RESET_REQUEST_EVENT = 'twinkle:cake-reset-request'
export const CAKE_WISH_SUBMIT_EVENT = 'twinkle:cake-wish-submit'
export const CAKE_FLAME_POINTER_EVENT = 'twinkle:cake-flame-pointer'
export const CAKE_FLAME_ACTIVATE_EVENT = 'twinkle:cake-flame-activate'
export const CAKE_INTERACTION_READY_EVENT = 'twinkle:cake-interaction-ready'
export const CAKE_WISH_JOURNEY_EVENT = 'twinkle:cake-wish-journey'

function createDetailEvent(target, type, detail) {
  const EventConstructor = target.CustomEvent ?? globalThis.CustomEvent
  if (!EventConstructor) {
    throw new Error('CustomEvent is required for cake interactions.')
  }
  return new EventConstructor(type, { detail })
}

export function requestCakeBlow(target = window, source = 'manual') {
  target.dispatchEvent(createDetailEvent(target, CAKE_BLOW_REQUEST_EVENT, { source }))
}

export function requestCakeReset(target = window) {
  target.dispatchEvent(createDetailEvent(target, CAKE_RESET_REQUEST_EVENT, { source: 'demo-reset' }))
}

export function requestCakeWish(wish, target = window) {
  target.dispatchEvent(createDetailEvent(target, CAKE_WISH_SUBMIT_EVENT, { wish }))
}

export function requestCakeFlamePointer({ clientX, clientY, pointerId, pointerType, timeStamp }, target = window) {
  target.dispatchEvent(createDetailEvent(target, CAKE_FLAME_POINTER_EVENT, {
    clientX,
    clientY,
    pointerId,
    pointerType,
    timeStamp,
  }))
}

export function requestCakeFlameActivation(index, source = 'keyboard', target = window) {
  target.dispatchEvent(createDetailEvent(target, CAKE_FLAME_ACTIVATE_EVENT, {
    index: Number(index),
    source,
  }))
}

export function requestCakeInteractionReady(isReady, target = window) {
  target.dispatchEvent(createDetailEvent(target, CAKE_INTERACTION_READY_EVENT, { isReady: Boolean(isReady) }))
}

export function announceCakeStatus({ candleStates, litCount, status }, target = window) {
  target.dispatchEvent(createDetailEvent(target, CAKE_STATUS_EVENT, {
    ...(Array.isArray(candleStates) ? { candleStates: candleStates.map(Boolean) } : {}),
    litCount,
    status,
  }))
}
export function announceCakeWishJourney(stage, options = {}, target = globalThis.window) {
  if (!target?.dispatchEvent) return false
  target.dispatchEvent(createDetailEvent(target, CAKE_WISH_JOURNEY_EVENT, {
    ...options,
    stage,
  }))
  return true
}
