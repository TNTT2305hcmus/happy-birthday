import assert from 'node:assert/strict'

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
    `document.querySelector('.cake-blow-button') && document.documentElement.dataset.webglReady === 'true'`,
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

async function inspectLayout(viewport) {
  await setViewport(viewport.width, viewport.height, viewport.dpr)
  await evaluate(`document.querySelector('#cake')?.scrollIntoView({ block: 'start' })`)
  await delay(250)
  const selectors = [
    '.cake-copy-panel',
    '.wish-form textarea',
    '.wish-form button',
    '.cake-status',
    '.cake-mic-button',
    '.cake-blow-button',
  ]
  const entries = await Promise.all(selectors.map(async (selector) => [selector, await getRect(selector)]))
  entries.forEach(([selector, rect]) => assertInsideViewport(rect, viewport, selector))
  const metrics = await evaluate(`JSON.stringify({
    bodyWidth: document.body.scrollWidth,
    canvasHeight: document.querySelector('#webgl-canvas')?.height,
    canvasWidth: document.querySelector('#webgl-canvas')?.width,
    dpr: window.devicePixelRatio,
    innerHeight: window.innerHeight,
    innerWidth: window.innerWidth
  })`)
  const parsed = JSON.parse(metrics)
  assert.equal(parsed.innerWidth, viewport.width)
  assert.equal(parsed.innerHeight, viewport.height)
  assert.equal(parsed.dpr, viewport.dpr)
  assert.ok(parsed.bodyWidth <= viewport.width, `Horizontal overflow at ${viewport.width}x${viewport.height}`)
  assert.ok(parsed.canvasWidth <= viewport.width * 2)
  assert.ok(parsed.canvasHeight <= viewport.height * 2)
  return { controls: Object.fromEntries(entries), ...parsed }
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
await request('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 1 })
await request('Page.addScriptToEvaluateOnNewDocument', {
  source: `(() => {
    const media = navigator.mediaDevices;
    if (!media?.getUserMedia) return;
    const original = media.getUserMedia.bind(media);
    window.__phase37MicRequests = 0;
    window.__phase37MicConstraints = null;
    media.getUserMedia = (constraints) => {
      window.__phase37MicRequests += 1;
      window.__phase37MicConstraints = constraints;
      return original(constraints);
    };
  })();`,
})

await setViewport(1470, 850, 2)
await navigate()
const layouts = []
for (const viewport of [
  { width: 1470, height: 956, dpr: 2 },
  { width: 1470, height: 850, dpr: 2 },
  { width: 1440, height: 900, dpr: 2 },
]) {
  layouts.push({ viewport, snapshot: await inspectLayout(viewport) })
}

await setViewport(1470, 850, 2)
await submitWish()
const manualRect = await getRect('.cake-blow-button')
const touchX = manualRect.left + manualRect.width / 2
const touchY = manualRect.top + manualRect.height / 2
await evaluate(`(() => {
  window.__phase37TouchEvents = [];
  const button = document.querySelector('.cake-blow-button');
  ['touchstart', 'touchend', 'click'].forEach((type) => {
    button.addEventListener(type, () => window.__phase37TouchEvents.push(type), { once: true });
  });
})()`)
await request('Input.dispatchTouchEvent', {
  touchPoints: [{ id: 1, radiusX: 1, radiusY: 1, x: touchX, y: touchY }],
  type: 'touchStart',
})
await delay(80)
await request('Input.dispatchTouchEvent', { touchPoints: [], type: 'touchEnd' })
await waitFor(`document.querySelector('.cake-controls')?.dataset.cakeStatus === 'complete'`, 'touch candle completion')
assert.deepEqual(await evaluate('window.__phase37TouchEvents'), ['touchstart', 'touchend', 'click'])
await waitFor(`document.querySelector('.cake-reset-button') && !document.querySelector('.cake-reset-button').disabled`, 'reset action')
assertInsideViewport(await getRect('.cake-reset-button'), { width: 1470, height: 850 }, '.cake-reset-button')
const celebrationFps = await measureFps()
assert.ok(celebrationFps >= 30, `Celebration dropped below 30 FPS: ${celebrationFps}`)

await request('Browser.setPermission', {
  origin,
  permission: { name: 'microphone' },
  setting: 'denied',
})
await navigate()
await submitWish('Mong mọi điều dịu dàng sẽ đến.')
assert.equal(await evaluate('window.__phase37MicRequests'), 0, 'Microphone was requested before user action')
await clickWithMouse('.cake-mic-button')
await waitFor(`document.querySelector('.cake-mic-fallback')?.dataset.micFailure === 'denied'`, 'denied microphone fallback')
assert.equal(await evaluate('window.__phase37MicRequests'), 1)
assert.equal(await evaluate(`document.querySelector('.cake-blow-button')?.disabled`), false)
assertInsideViewport(await getRect('.cake-mic-fallback'), { width: 1470, height: 850 }, '.cake-mic-fallback')
assertInsideViewport(await getRect('.cake-blow-button'), { width: 1470, height: 850 }, '.cake-blow-button after denial')

await request('Browser.setPermission', {
  origin,
  permission: { name: 'microphone' },
  setting: 'granted',
})
await navigate()
await submitWish('Mong tuổi mới luôn rực rỡ.')
assert.equal(await evaluate('window.__phase37MicRequests'), 0)
await clickWithMouse('.cake-mic-button')
await waitFor(
  `['calibrating', 'listening', 'detected', 'stopped'].includes(document.querySelector('.cake-mic-button')?.dataset.micState)`,
  'microphone calibration',
)
assert.equal(await evaluate('window.__phase37MicRequests'), 1)
const constraints = await evaluate('window.__phase37MicConstraints')
assert.ok(constraints?.audio)
assert.ok(!constraints?.video)
const microphoneFps = await measureFps(2100)
assert.ok(microphoneFps >= 30, `Microphone monitoring dropped below 30 FPS: ${microphoneFps}`)

await setViewport(390, 844, 1, true)
await navigate('/?section=cake&quality=lite')
const mobileMetrics = JSON.parse(await evaluate(`JSON.stringify({
  bodyWidth: document.body.scrollWidth,
  innerWidth: window.innerWidth,
  manualHeight: document.querySelector('.cake-blow-button')?.getBoundingClientRect().height,
  micHeight: document.querySelector('.cake-mic-button')?.getBoundingClientRect().height
})`))
assert.ok(mobileMetrics.bodyWidth <= mobileMetrics.innerWidth, 'Mobile Cake has horizontal overflow')
assert.ok(mobileMetrics.manualHeight >= 44, 'Manual touch target is below 44px')
assert.ok(mobileMetrics.micHeight >= 44, 'Microphone touch target is below 44px')

socket.close()
console.log(JSON.stringify({
  celebrationFps,
  layouts: layouts.map(({ snapshot, viewport }) => ({
    canvas: `${snapshot.canvasWidth}x${snapshot.canvasHeight}`,
    panelBottom: Math.round(snapshot.controls['.cake-copy-panel'].bottom),
    viewport: `${viewport.width}x${viewport.height}@${viewport.dpr}`,
  })),
  microphoneFps,
  microphonePrivacy: { constraints, requestCount: 1 },
  mobile: mobileMetrics,
  touchCompletion: true,
}))
