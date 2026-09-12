import assert from 'node:assert/strict'

const port = Number(process.argv[2])
const origin = process.argv[3] ?? 'http://127.0.0.1:4174'
if (!Number.isInteger(port)) throw new Error('Usage: node verify-refinement-r4-5-cdp.mjs <port> [origin]')

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
if (!page) throw new Error('No browser page found')

const socket = new WebSocket(page.webSocketDebuggerUrl)
const pending = new Map()
let requestId = 0
const consoleErrors = []
await new Promise((resolve, reject) => {
  socket.addEventListener('open', resolve, { once: true })
  socket.addEventListener('error', reject, { once: true })
})
socket.addEventListener('message', ({ data }) => {
  const message = JSON.parse(data)
  if (message.method === 'Runtime.exceptionThrown') consoleErrors.push(message.params.exceptionDetails.text)
  const handler = pending.get(message.id)
  if (!handler) return
  pending.delete(message.id)
  if (message.error) handler.reject(new Error(message.error.message))
  else handler.resolve(message.result)
})

function request(method, params = {}) {
  const id = ++requestId
  socket.send(JSON.stringify({ id, method, params }))
  return new Promise((resolve, reject) => pending.set(id, { reject, resolve }))
}

async function evaluate(expression, awaitPromise = false) {
  const result = await request('Runtime.evaluate', { awaitPromise, expression, returnByValue: true })
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.text)
  return result.result.value
}

async function waitFor(expression, label, attempts = 60) {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    if (await evaluate(`Boolean(${expression})`)) return
    await delay(100)
  }
  throw new Error(`Timed out waiting for ${label}`)
}

async function prepare(width, height, pointerType) {
  await request('Emulation.setDeviceMetricsOverride', {
    deviceScaleFactor: 2,
    height,
    mobile: width < 900,
    screenHeight: height,
    screenWidth: width,
    width,
  })
  await request('Page.navigate', { url: `${origin}/?section=cake&quality=full` })
  await waitFor("document.documentElement.dataset.webglReady === 'true' && document.querySelector('.cake-visual-stage')", 'Cake WebGL')
  await evaluate("document.querySelector('#cake').scrollIntoView({block:'start'})")
  await delay(300)
  await evaluate(`(() => {
    window.__r45Statuses = [];
    window.addEventListener('twinkle:cake-status', (event) => window.__r45Statuses.push(event.detail));
    const textarea = document.querySelector('.wish-form textarea');
    const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set;
    setter.call(textarea, 'Điều ước kiểm thử R4.5');
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
    document.querySelector('.wish-form').requestSubmit();
  })()`)
  await waitFor("document.querySelector('.cake-visual-stage').dataset.candleInteraction === 'ready'", 'candle interaction ready')
  assert.equal(await evaluate("Boolean(document.querySelector('.cake-blow-button'))"), false)
  assert.equal(await evaluate("document.querySelector('.cake-mic-button') !== null"), true)
  return pointerType
}

async function extinguishOne(pointerType, pointerId, expectedBefore) {
  const hit = await evaluate(`(() => {
    const stage = document.querySelector('.cake-visual-stage');
    const rect = stage.getBoundingClientRect();
    for (let y = rect.top + 4; y < rect.bottom - 4; y += 6) {
      for (let x = rect.left + 4; x < rect.right - 4; x += 6) {
        const before = window.__r45Statuses.length;
        stage.dispatchEvent(new PointerEvent('pointerup', {
          bubbles: true, clientX: x, clientY: y, pointerId: ${pointerId}, pointerType: '${pointerType}',
        }));
        if (window.__r45Statuses.length > before && window.__r45Statuses.at(-1).status === 'extinguishing') {
          return { x, y };
        }
      }
    }
    return null;
  })()`)
  assert.ok(hit, `No ${pointerType} hit found for candle ${6 - expectedBefore}`)
  await evaluate(`document.querySelector('.cake-visual-stage').dispatchEvent(new PointerEvent('pointerup', {
    bubbles: true, clientX: ${hit.x}, clientY: ${hit.y}, pointerId: ${pointerId}, pointerType: '${pointerType}',
  }))`)
  await waitFor(`window.__r45Statuses.some((item) => item.litCount === ${expectedBefore - 1} && ['idle', 'complete'].includes(item.status))`, 'single candle completion')
  const latest = await evaluate('window.__r45Statuses.at(-1)')
  assert.equal(latest.litCount, expectedBefore - 1, 'Duplicate pointer event extinguished more than one candle')
  return hit
}

async function measureFps() {
  return evaluate(`new Promise((resolve) => {
    let frames = 0; const start = performance.now();
    function tick(now) { frames += 1; if (now - start >= 1800) resolve(Math.round(frames / ((now - start) / 1000))); else requestAnimationFrame(tick); }
    requestAnimationFrame(tick);
  })`, true)
}

await request('Page.enable')
await request('Runtime.enable')
await prepare(1470, 850, 'mouse')
for (let lit = 5; lit > 0; lit -= 1) await extinguishOne('mouse', 1, lit)
assert.equal(await evaluate("document.querySelector('.cake-controls').dataset.cakeStatus"), 'complete')
const desktopFps = await measureFps()
assert.ok(desktopFps >= 30)

await prepare(390, 844, 'touch')
await extinguishOne('touch', 9, 5)
const mobileFps = await measureFps()
assert.ok(mobileFps >= 30)
assert.equal(await evaluate('document.body.scrollWidth <= innerWidth'), true)
assert.deepEqual(consoleErrors, [])

console.log(JSON.stringify({ desktopFps, mobileFps, pointer: true, touch: true, duplicateDebounce: true }))
socket.close()
