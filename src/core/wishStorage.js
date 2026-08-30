export function normalizeWish(value, maxLength) {
  return String(value ?? '')
    .trim()
    .replace(/\s+/g, ' ')
    .slice(0, maxLength)
}

export function loadWish({ key, storage = globalThis.localStorage } = {}) {
  if (!key || !storage) return ''
  try {
    return storage.getItem(key) ?? ''
  } catch {
    return ''
  }
}

export function saveWish({ key, storage = globalThis.localStorage, value } = {}) {
  if (!key || !storage) return false
  try {
    storage.setItem(key, value)
    return true
  } catch {
    return false
  }
}
