export const CAKE_BLOW_REQUEST_EVENT = 'twinkle:cake-blow-request'
export const CAKE_STATUS_EVENT = 'twinkle:cake-status'
export const CAKE_RESET_REQUEST_EVENT = 'twinkle:cake-reset-request'
export const CAKE_WISH_SUBMIT_EVENT = 'twinkle:cake-wish-submit'

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

export function announceCakeStatus({ litCount, status }, target = window) {
  target.dispatchEvent(createDetailEvent(target, CAKE_STATUS_EVENT, { litCount, status }))
}
