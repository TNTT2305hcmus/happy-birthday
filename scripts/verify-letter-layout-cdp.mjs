import assert from 'node:assert/strict'

/* global document, getComputedStyle, innerHeight, innerWidth, requestAnimationFrame */

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
    page = targets.find((target) => target.type === 'page' && target.url.includes('section=letter'))
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
for (let attempt = 0; attempt < 40; attempt += 1) {
  const ready = await evaluate(
    "document.readyState === 'complete' && document.querySelector('.letter-toggle-button') !== null && ['true', 'fallback'].includes(document.documentElement.dataset.webglReady)",
  )
  if (ready) break
  await delay(200)
}
await evaluate('document.fonts.ready', true)
await delay(350)
await evaluate('(' + (() => {
  const button = document.querySelector('.letter-toggle-button')
  if (button.getAttribute('aria-expanded') !== 'true') button.click()
}).toString() + ')()')
await delay(1_250)

const layout = await evaluate('(' + (() => {
  const panel = document.querySelector('.letter-copy-panel')
  const button = document.querySelector('.letter-toggle-button')
  const preview = document.querySelector('.letter-preview')
  const scroll = document.querySelector('.letter-preview-scroll')
  const line = document.querySelector('.letter-handwriting-line')
  const panelRect = panel.getBoundingClientRect()
  const buttonRect = button.getBoundingClientRect()
  const previewRect = preview.getBoundingClientRect()
  return {
    animationName: getComputedStyle(line).animationName,
    buttonRect: { top: buttonRect.top, bottom: buttonRect.bottom },
    documentWidth: document.documentElement.scrollWidth,
    expanded: button.getAttribute('aria-expanded'),
    lineCount: document.querySelectorAll('.letter-handwriting-line').length,
    motion: document.documentElement.dataset.motion,
    panelRect: {
      left: panelRect.left,
      right: panelRect.right,
      top: panelRect.top,
      bottom: panelRect.bottom,
    },
    previewRect: { top: previewRect.top, bottom: previewRect.bottom },
    scrollClientHeight: scroll.clientHeight,
    scrollHeight: scroll.scrollHeight,
    viewport: { width: innerWidth, height: innerHeight },
  }
}).toString() + ')()')

assert.equal(layout.expanded, 'true')
assert.equal(layout.lineCount, 10)
assert.ok(layout.documentWidth <= layout.viewport.width + 1, 'Page must not overflow horizontally')
assert.ok(layout.panelRect.left >= -1 && layout.panelRect.right <= layout.viewport.width + 1)
assert.ok(layout.buttonRect.top >= 0 && layout.buttonRect.bottom <= layout.viewport.height)
assert.ok(layout.scrollHeight > layout.scrollClientHeight, 'Long letter must use its own scroll region')
assert.ok(Math.abs(layout.viewport.width - expectedWidth) <= 1)
assert.ok(Math.abs(layout.viewport.height - expectedHeight) <= 1)

if (expectedWidth >= 1_100) {
  assert.ok(layout.panelRect.top >= 0 && layout.panelRect.bottom <= layout.viewport.height + 1)
  assert.ok(layout.previewRect.bottom <= layout.viewport.height + 1)
}
if (expectedMotion === 'reduced') {
  assert.equal(layout.motion, 'reduced')
  assert.equal(layout.animationName, 'none')
} else {
  assert.equal(layout.motion, 'full')
  assert.ok(layout.animationName.includes('letter-ink-reveal'))
}

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

socket.close()
console.log(JSON.stringify({ fps, layout }))
