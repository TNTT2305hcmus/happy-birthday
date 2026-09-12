import assert from 'node:assert/strict'
import { writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const port = Number(process.argv[2])
const origin = process.argv[3] ?? 'http://127.0.0.1:4174'
if (!Number.isInteger(port)) {
  throw new Error('Usage: node scripts/verify-phase3-7-browser-cdp.mjs <debug-port> [origin]')
}

const delay = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds))
let page = null
for (let attempt = 0; attempt < 50; attempt += 1) {
  try {
    const targets = await fetch(`http://127.0.0.1:${port}/json/list`).then((response) => response.json())
    page = targets.find((target) => target.type === 'page')
    if (page) break
  } catch {
    // Edge may still be starting.
  }
  await delay(200)
}
if (!page) throw new Error(`No browser page found on CDP port ${port}.`)

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
  if (message.error) handler.reject(new Error(`${message.error.message}: ${message.error.data ?? ''}`))
  else handler.resolve(message.result)
})

function request(method, params = {}) {
  requestId += 1
  const id = requestId
  socket.send(JSON.stringify({ id, method, params }))
  return new Promise((resolve, reject) => pending.set(id, { reject, resolve }))
}

async function evaluate(expression, { awaitPromise = false } = {}) {
  const result = await request('Runtime.evaluate', { awaitPromise, expression, returnByValue: true })
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.text)
  return result.result.value
}

async function waitFor(expression, label, attempts = 40) {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    if (await evaluate(`Boolean(${expression})`)) return
    await delay(150)
  }
  throw new Error(`Timed out waiting for ${label}`)
}

async function navigate(path = '/?section=cake&quality=full') {
  await request('Page.navigate', { url: `${origin}${path}` })
  await waitFor(
    `document.querySelector('.cake-blow-button') && ['true', 'fallback'].includes(document.documentElement.dataset.webglReady)`,
    'Cake UI and WebGL',
  )
  await evaluate(`document.querySelector('#cake')?.scrollIntoView({ block: 'start' })`)
  await delay(350)
}

async function setViewport(width, height, deviceScaleFactor = 2, mobile = false) {
  await request('Emulation.setDeviceMetricsOverride', {
    deviceScaleFactor,
    height,
    mobile,
    screenHeight: height,
    screenWidth: width,
    width,
  })
  await delay(300)
}

async function submitWish(wish = 'Mong chúng mình luôn bình an và hạnh phúc.') {
  const submitted = await evaluate(`(() => {
    const textarea = document.querySelector('.wish-form textarea');
    const form = document.querySelector('.wish-form');
    if (!textarea || !form) return false;
    const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set;
    setter.call(textarea, ${JSON.stringify(wish)});
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
    form.requestSubmit();
    return true;
  })()`)
  assert.equal(submitted, true)
  await waitFor(`document.querySelector('.cake-controls')?.dataset.wishReady === 'true'`, 'prepared wish')
}

async function getRect(selector) {
  return evaluate(`(() => {
    const element = document.querySelector(${JSON.stringify(selector)});
    if (!element) return null;
    const rect = element.getBoundingClientRect();
    return { bottom: rect.bottom, height: rect.height, left: rect.left, right: rect.right, top: rect.top, width: rect.width };
  })()`)
}

function assertInsideViewport(rect, viewport, label) {
  assert.ok(rect, `${label} is missing`)
  assert.ok(rect.left >= -1, `${label} overflows left: ${rect.left}`)
  assert.ok(rect.right <= viewport.width + 1, `${label} overflows right: ${rect.right}`)
  assert.ok(rect.top >= -1, `${label} overflows top: ${rect.top}`)
  assert.ok(rect.bottom <= viewport.height + 1, `${label} overflows bottom: ${rect.bottom}`)
}

async function clickWithMouse(selector) {
  const rect = await getRect(selector)
  assert.ok(rect, `${selector} is missing`)
  const x = rect.left + rect.width / 2
  const y = rect.top + rect.height / 2
  await request('Input.dispatchMouseEvent', { button: 'left', buttons: 1, clickCount: 1, type: 'mousePressed', x, y })
  await request('Input.dispatchMouseEvent', { button: 'left', buttons: 0, clickCount: 1, type: 'mouseReleased', x, y })
}

async function measureFps(duration = 2400) {
  return evaluate(`new Promise((resolve) => {
    let frames = 0;
    const startedAt = performance.now();
    function measure(now) {
      frames += 1;
      const elapsed = now - startedAt;
      if (elapsed >= ${duration}) return resolve(Math.round(frames / (elapsed / 1000)));
      requestAnimationFrame(measure);
    }
    requestAnimationFrame(measure);
  })`, { awaitPromise: true })
}


await request('Page.enable')
await request('Runtime.enable')
const results = []
for (const [width, height, mode] of [
  [1470, 956, 'full'], [1470, 850, 'full'], [1440, 900, 'full'],
  [1280, 720, 'lite'], [1470, 850, 'reduced'], [820, 1180, 'full'], [390, 844, 'lite'],
  [1470, 850, 'fallback'], [390, 844, 'fallback'],
]) {
  await request('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: mode === 'reduced' ? 'reduce' : 'no-preference' }] })
  await setViewport(width, height, 1, width < 900)
  await navigate(`/?section=cake&${mode === 'fallback' ? 'webgl=off' : 'quality=' + (mode === 'reduced' ? 'full' : mode)}`)
  await evaluate('document.fonts.ready', { awaitPromise: true })
  await delay(350)
  const slot = await getRect('.cake-visual-stage')
  const panel = await getRect('.cake-copy-panel')
  assert.ok(await evaluate('document.body.scrollWidth <= innerWidth'), 'Horizontal overflow')
  if (width >= 900) {
    assert.ok(slot.right < panel.left, 'Cake must be left of card')
    assertInsideViewport(panel, {width, height}, 'Card')
    assertInsideViewport(slot, {width, height}, 'Cake slot')
  } else {
    assert.ok(slot.bottom <= panel.top, 'Mobile cake must be above card')
  }
  await submitWish('Layout verification wish')
  await evaluate("document.querySelector('.cake-blow-button').scrollIntoView({block: 'center'})")
  await delay(350)
  await clickWithMouse('.cake-blow-button')
  await waitFor("document.querySelector('.cake-controls').dataset.cakeStatus === 'complete'", 'candle completion')
  if (mode === 'fallback') assert.equal(await evaluate("document.querySelectorAll('.cake-fallback-candles i[data-lit=true]').length"), 0)
  await waitFor("document.querySelector('.cake-reset-button') && !document.querySelector('.cake-reset-button').disabled", 'reset enabled')
  await evaluate("document.querySelector('.cake-reset-button').click()")
  await waitFor("document.querySelector('.cake-controls').dataset.cakeStatus === 'idle'", 'reset')
  await evaluate("document.querySelector('#cake').scrollIntoView({block:'start'})")
  await delay(350)
  const fps = await measureFps()
  assert.ok(fps >= 30, `FPS ${fps}`)
  const shot = await request('Page.captureScreenshot', {format: 'png'})
  await writeFile(join(tmpdir(), `twinkle-r41-${width}-${height}-${mode}.png`), Buffer.from(shot.data, 'base64'))
  results.push({width, height, mode, fps, slot, panel})
  console.log(JSON.stringify(results.at(-1)))
}
socket.close()
