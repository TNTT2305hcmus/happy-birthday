import assert from 'node:assert/strict'

/* global document, getComputedStyle, innerHeight, innerWidth, requestAnimationFrame, window */

const port = Number(process.argv[2])
const expectedWidth = Number(process.argv[3])
const expectedHeight = Number(process.argv[4])
const expectedMotion = process.argv[5] ?? 'full'
if (!Number.isInteger(port)) {
  throw new Error('Usage: node scripts/verify-letter-layout-cdp.mjs <port> <width> <height> <full|reduced>')
}

const delay = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds))
let page
for (let attempt = 0; attempt < 40; attempt += 1) {
  try {
    const targets = await fetch('http://127.0.0.1:' + port + '/json/list').then((response) => response.json())
    page = targets.find((target) => target.type === 'page' && target.url.includes('section=all'))
    if (page) break
  } catch {
    // Edge may still be starting.
  }
  await delay(250)
}
if (!page) throw new Error('Letter demo page was not found')

const socket = new WebSocket(page.webSocketDebuggerUrl)
const pending = new Map()
let requestId = 0
await new Promise((resolve, reject) => {
  socket.addEventListener('open', resolve, { once: true })
  socket.addEventListener('error', reject, { once: true })
})
socket.addEventListener('message', ({ data }) => {
  const message = JSON.parse(data)
  const handler = pending.get(message.id)
  if (!handler) return
  pending.delete(message.id)
  handler(message)
})
function request(method, params = {}) {
  const id = ++requestId
  socket.send(JSON.stringify({ id, method, params }))
  return new Promise((resolve) => pending.set(id, resolve))
}
async function evaluate(expression, awaitPromise = false) {
  const response = await request('Runtime.evaluate', {
    awaitPromise,
    expression,
    returnByValue: true,
  })
  if (response.result?.exceptionDetails) {
    throw new Error(response.result.exceptionDetails.text)
  }
  return response.result?.result?.value
}

await request('Page.enable')
await request('Emulation.setDeviceMetricsOverride', {
  deviceScaleFactor: 1,
  height: expectedHeight,
  mobile: expectedWidth < 700,
  width: expectedWidth,
})
let pageReady = false
for (let attempt = 0; attempt < 40; attempt += 1) {
  const ready = await evaluate(
    '(' + (() => {
      const section = document.getElementById('letter')
      const surface = document.querySelector('.letter-interaction-surface')
      if (document.readyState !== 'complete' || !section || !surface) return false
      if (section.dataset.sectionState !== 'active' || surface.disabled) {
        document.documentElement.style.scrollBehavior = 'auto'
        section.scrollIntoView({ behavior: 'auto', block: 'center' })
        window.dispatchEvent(new Event('scroll'))
      }
      return section.dataset.sectionState === 'active'
        && !surface.disabled
        && ['true', 'fallback'].includes(document.documentElement.dataset.webglReady)
    }).toString() + ')()',
  )
  if (ready) {
    pageReady = true
    break
  }
  await delay(200)
}
if (!pageReady) throw new Error('Letter interaction surface did not become active')
await evaluate('document.fonts.ready', true)
await delay(500)

const layout = await evaluate('(' + (() => {
  const section = document.querySelector('.letter-story-section')
  const surface = document.querySelector('.letter-interaction-surface')
  const sectionRect = section.getBoundingClientRect()
  const sectionStyle = getComputedStyle(section)
  const surfaceRect = surface.getBoundingClientRect()
  const surfaceStyle = getComputedStyle(surface)
  return {
    ariaExpanded: surface.getAttribute('aria-expanded'),
    ariaLabel: surface.getAttribute('aria-label'),
    canvasCount: document.querySelectorAll('#webgl-canvas').length,
    childElementCount: section.childElementCount,
    disabled: surface.disabled,
    documentWidth: document.documentElement.scrollWidth,
    motion: document.documentElement.dataset.motion,
    obsoleteUiCount: document.querySelectorAll(
      '#letter .section-card, #letter .letter-copy-panel, #letter .letter-controls, #letter .letter-toggle-button, #letter .letter-preview',
    ).length,
    opacity: Number(sectionStyle.opacity),
    scene: section.dataset.scene,
    sectionRect: {
      bottom: sectionRect.bottom,
      left: sectionRect.left,
      right: sectionRect.right,
      top: sectionRect.top,
    },
    state: section.dataset.sectionState,
    surfaceRect: {
      bottom: surfaceRect.bottom,
      height: surfaceRect.height,
      left: surfaceRect.left,
      right: surfaceRect.right,
      top: surfaceRect.top,
      width: surfaceRect.width,
    },
    surfaceStyle: {
      backgroundColor: surfaceStyle.backgroundColor,
      borderTopWidth: surfaceStyle.borderTopWidth,
    },
    tabIndex: surface.tabIndex,
    viewport: { width: innerWidth, height: innerHeight },
    visibility: sectionStyle.visibility,
    webglReady: document.documentElement.dataset.webglReady,
  }
}).toString() + ')()')

assert.equal(layout.canvasCount, 1)
assert.equal(layout.childElementCount, 1)
assert.equal(layout.obsoleteUiCount, 0)
assert.ok(['true', 'false'].includes(layout.ariaExpanded))
assert.ok(layout.ariaLabel.length > 0)
assert.equal(layout.disabled, false)
assert.equal(layout.tabIndex, 0)
assert.equal(layout.scene, 'LetterScene')
assert.equal(layout.state, 'active')
assert.equal(layout.visibility, 'visible')
assert.ok(layout.opacity >= 0.99)
assert.ok(layout.documentWidth <= layout.viewport.width + 1, 'Page must not overflow horizontally')
assert.ok(layout.sectionRect.left >= -1 && layout.sectionRect.right <= layout.viewport.width + 1)
assert.ok(
  Math.abs(layout.sectionRect.top) <= 32
    && Math.abs(layout.sectionRect.bottom - layout.viewport.height) <= 32,
  'Letter section must remain centered within scroll rounding: ' + JSON.stringify(layout.sectionRect),
)
assert.ok(
  Math.abs(layout.sectionRect.bottom - layout.sectionRect.top - layout.viewport.height) <= 1,
  'Letter section height must match the viewport',
)
assert.ok(layout.surfaceRect.left >= -1 && layout.surfaceRect.right <= layout.viewport.width + 1)
assert.ok(layout.surfaceRect.top >= -1 && layout.surfaceRect.bottom <= layout.viewport.height + 1)
assert.ok(layout.surfaceRect.width >= 44 && layout.surfaceRect.height >= 44)
assert.ok(layout.surfaceRect.width < layout.viewport.width * 0.9)
assert.ok(
  Math.abs((layout.surfaceRect.left + layout.surfaceRect.right) / 2 - layout.viewport.width / 2) <= 1,
  'Surface center must match viewport center: ' + JSON.stringify({
    surfaceRect: layout.surfaceRect,
    viewport: layout.viewport,
  }),
)
assert.equal(layout.surfaceStyle.backgroundColor, 'rgba(0, 0, 0, 0)')
assert.equal(layout.surfaceStyle.borderTopWidth, '0px')
assert.ok(
  layout.viewport.width <= expectedWidth && layout.viewport.width >= expectedWidth - 20,
  'Viewport width may only differ by the vertical scrollbar gutter',
)
assert.ok(Math.abs(layout.viewport.height - expectedHeight) <= 1)
assert.equal(layout.motion, expectedMotion === 'reduced' ? 'reduced' : 'full')

await evaluate("window.__letterToggleCount = 0; window.addEventListener('twinkle:letter-toggle-request', () => { window.__letterToggleCount += 1 })")
const surfaceCenter = {
  x: (layout.surfaceRect.left + layout.surfaceRect.right) / 2,
  y: (layout.surfaceRect.top + layout.surfaceRect.bottom) / 2,
}
const initialExpanded = layout.ariaExpanded === 'true'
await request('Input.dispatchMouseEvent', {
  button: 'left',
  clickCount: 1,
  type: 'mousePressed',
  x: surfaceCenter.x,
  y: surfaceCenter.y,
})
await request('Input.dispatchMouseEvent', {
  button: 'left',
  clickCount: 1,
  type: 'mouseReleased',
  x: surfaceCenter.x,
  y: surfaceCenter.y,
})
await delay(120)

const pointerState = await evaluate('(' + (() => {
  const surface = document.querySelector('.letter-interaction-surface')
  return {
    ariaExpanded: surface.getAttribute('aria-expanded'),
    count: window.__letterToggleCount,
    status: surface.dataset.letterStatus,
  }
}).toString() + ')()')
assert.equal(pointerState.count, 1, 'Pointer activation must fire exactly one toggle')
assert.equal(pointerState.ariaExpanded, String(!initialExpanded))
assert.ok(
  (initialExpanded ? ['closing', 'closed'] : ['opening', 'open']).includes(pointerState.status),
  'Pointer status must reflect the requested direction',
)

async function pressKey(key, code, virtualKeyCode) {
  const text = key === 'Enter' ? '\r' : key
  await request('Input.dispatchKeyEvent', {
    code,
    key,
    nativeVirtualKeyCode: virtualKeyCode,
    text,
    type: 'keyDown',
    unmodifiedText: text,
    windowsVirtualKeyCode: virtualKeyCode,
  })
  await request('Input.dispatchKeyEvent', {
    code,
    key,
    nativeVirtualKeyCode: virtualKeyCode,
    type: 'keyUp',
    windowsVirtualKeyCode: virtualKeyCode,
  })
  await delay(120)
}

await evaluate("document.querySelector('.letter-interaction-surface').focus()")
assert.equal(
  await evaluate("document.activeElement === document.querySelector('.letter-interaction-surface')"),
  true,
)
await pressKey('Enter', 'Enter', 13)
let keyboardState = await evaluate('(' + (() => {
  const surface = document.querySelector('.letter-interaction-surface')
  return {
    ariaExpanded: surface.getAttribute('aria-expanded'),
    count: window.__letterToggleCount,
  }
}).toString() + ')()')
assert.equal(keyboardState.count, 2, 'Enter must fire exactly one toggle')
assert.equal(keyboardState.ariaExpanded, String(initialExpanded))

await pressKey(' ', 'Space', 32)
keyboardState = await evaluate('(' + (() => {
  const surface = document.querySelector('.letter-interaction-surface')
  return {
    ariaExpanded: surface.getAttribute('aria-expanded'),
    count: window.__letterToggleCount,
  }
}).toString() + ')()')
assert.equal(keyboardState.count, 3, 'Space must fire exactly one toggle')
assert.equal(keyboardState.ariaExpanded, String(!initialExpanded))

const fps = await evaluate('(' + (() => new Promise((resolve) => {
  let frames = 0
  const startedAt = performance.now()
  function tick(now) {
    frames += 1
    if (now - startedAt >= 1200) {
      resolve(Math.round(frames * 1000 / (now - startedAt)))
      return
    }
    requestAnimationFrame(tick)
  }
  requestAnimationFrame(tick)
})).toString() + ')()', true)
assert.ok(fps >= 30, 'Letter scene should stay at or above 30 FPS, received ' + fps)

await evaluate("document.getElementById('gallery').scrollIntoView({ behavior: 'auto', block: 'center' })")
await delay(500)
const inactiveState = await evaluate('(' + (() => {
  const surface = document.querySelector('.letter-interaction-surface')
  return {
    disabled: surface.disabled,
    sectionState: document.querySelector('.letter-story-section').dataset.sectionState,
    tabIndex: surface.tabIndex,
  }
}).toString() + ')()')
assert.notEqual(inactiveState.sectionState, 'active')
assert.equal(inactiveState.disabled, true)
assert.equal(inactiveState.tabIndex, -1)

socket.close()
console.log(JSON.stringify({ fps, inactiveState, keyboardState, layout, pointerState }))
