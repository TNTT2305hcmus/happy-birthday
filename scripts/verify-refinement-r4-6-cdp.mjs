import assert from 'node:assert/strict'

const port = Number(process.argv[2])
const origin = process.argv[3] ?? 'http://127.0.0.1:4176'
if (!Number.isInteger(port)) throw new Error('Usage: node verify-refinement-r4-6-cdp.mjs <port> [origin]')
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

let page
for (let attempt = 0; attempt < 50; attempt += 1) {
  try {
    const targets = await fetch(`http://127.0.0.1:${port}/json/list`).then((response) => response.json())
    page = targets.find((target) => target.type === 'page')
    if (page) break
  } catch { /* Browser is starting. */ }
  await delay(200)
}
if (!page) throw new Error('No browser page found')

const socket = new WebSocket(page.webSocketDebuggerUrl)
const pending = new Map()
const errors = []
let id = 0
await new Promise((resolve, reject) => {
  socket.addEventListener('open', resolve, { once: true })
  socket.addEventListener('error', reject, { once: true })
})
socket.addEventListener('message', ({ data }) => {
  const message = JSON.parse(data)
  if (message.method === 'Runtime.exceptionThrown') errors.push(message.params.exceptionDetails.text)
  const handler = pending.get(message.id)
  if (!handler) return
  pending.delete(message.id)
  message.error ? handler.reject(new Error(message.error.message)) : handler.resolve(message.result)
})
function request(method, params = {}) {
  const requestId = ++id
  socket.send(JSON.stringify({ id: requestId, method, params }))
  return new Promise((resolve, reject) => pending.set(requestId, { reject, resolve }))
}
async function evaluate(expression, awaitPromise = false) {
  const result = await request('Runtime.evaluate', { awaitPromise, expression, returnByValue: true })
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.text)
  return result.result.value
}
async function waitFor(expression, label) {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    if (await evaluate(`Boolean(${expression})`)) return
    await delay(100)
  }
  throw new Error(`Timed out waiting for ${label}`)
}

async function prepare(webgl = true) {
  await request('Page.navigate', { url: `${origin}/?section=cake&quality=full${webgl ? '' : '&webgl=off'}` })
  await waitFor(`document.documentElement.dataset.webglReady === '${webgl ? 'true' : 'fallback'}'`, 'runtime')
  await evaluate("document.querySelector('#cake').scrollIntoView({block:'start'})")
  await delay(250)
  await evaluate(`(() => {
    const textarea = document.querySelector('.wish-form textarea');
    Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set.call(textarea, 'Điều ước R4.6');
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
    document.querySelector('.wish-form').requestSubmit();
  })()`)
  await waitFor("document.querySelector('.cake-visual-stage').dataset.candleInteraction === 'ready'", 'candle controls')
}

async function press(selector, key) {
  await evaluate(`document.querySelector('${selector}').focus()`)
  assert.equal(await evaluate(`document.activeElement.matches('${selector}')`), true)
  const code = key === 'Enter' ? 'Enter' : 'Space'
  const virtualKey = key === 'Enter' ? 13 : 32
  await request('Input.dispatchKeyEvent', {
    code, key, nativeVirtualKeyCode: virtualKey,
    text: key === 'Enter' ? '\r' : ' ',
    type: 'keyDown',
    unmodifiedText: key === 'Enter' ? '\r' : ' ',
    windowsVirtualKeyCode: virtualKey,
  })
  await request('Input.dispatchKeyEvent', { code, key, nativeVirtualKeyCode: virtualKey, type: 'keyUp', windowsVirtualKeyCode: virtualKey })
}
async function measureFps() {
  return evaluate(`new Promise((resolve) => { let frames = 0; const start = performance.now();
    function tick(now) { frames += 1; if (now - start > 1500) resolve(Math.round(frames / ((now-start)/1000))); else requestAnimationFrame(tick); }
    requestAnimationFrame(tick); })`, true)
}

await request('Page.enable')
await request('Runtime.enable')
await request('Page.bringToFront')
await request('Emulation.setDeviceMetricsOverride', { deviceScaleFactor: 2, height: 850, mobile: false, width: 1470 })
await prepare(true)
assert.equal(await evaluate("document.querySelectorAll('.cake-keyboard-candle').length"), 5)
assert.equal(await evaluate("[...document.querySelectorAll('.cake-keyboard-candle')].every((item) => !item.disabled)"), true)
await press('.cake-keyboard-candle:nth-child(1)', 'Enter')
await waitFor("document.querySelector('.cake-keyboard-candle:nth-child(1)').disabled", 'Enter activation')
await press('.cake-keyboard-candle:nth-child(2)', ' ')
await waitFor("document.querySelector('.cake-keyboard-candle:nth-child(2)').disabled", 'Space activation')
await waitFor("document.querySelector('.cake-controls').dataset.cakeStatus === 'idle'", 'partial candles idle')

await request('Browser.setPermission', { origin, permission: { name: 'microphone' }, setting: 'denied' })
await evaluate("document.querySelector('.cake-mic-button').click()")
await waitFor("document.querySelector('.cake-mic-fallback')?.dataset.micFailure === 'denied'", 'denied mic fallback')
assert.equal(await evaluate("document.querySelector('.cake-keyboard-candle:nth-child(3)').disabled"), false)
for (const index of [3, 4, 5]) {
  await press(`.cake-keyboard-candle:nth-child(${index})`, 'Enter')
  await waitFor(`document.querySelector('.cake-keyboard-candle:nth-child(${index})').disabled`, `candle ${index}`)
}
await waitFor("document.querySelector('.cake-controls').dataset.cakeStatus === 'complete'", 'WebGL completion')
const webglFps = await measureFps()
assert.ok(webglFps >= 30)

await prepare(false)
assert.equal(await evaluate("document.querySelectorAll('.cake-fallback-candle').length"), 5)
await evaluate("document.querySelector('.cake-fallback-candle:nth-child(1)').click()")
await press('.cake-fallback-candle:nth-child(2)', 'Enter')
for (const index of [3, 4, 5]) await evaluate(`document.querySelector('.cake-fallback-candle:nth-child(${index})').click()`)
await waitFor("document.querySelector('.cake-controls').dataset.cakeStatus === 'complete'", 'fallback completion')
assert.equal(await evaluate("[...document.querySelectorAll('.cake-fallback-candle')].every((item) => item.disabled && item.dataset.lit === 'false')"), true)
await waitFor("document.querySelector('.cake-reset-button') && !document.querySelector('.cake-reset-button').disabled", 'fallback reset')
await evaluate("document.querySelector('.cake-reset-button').click()")
assert.equal(await evaluate("[...document.querySelectorAll('.cake-fallback-candle')].every((item) => item.dataset.lit === 'true')"), true)
assert.equal(await evaluate("document.querySelector('.cake-controls').dataset.cakeStatus"), 'idle')
assert.equal(await evaluate('document.body.scrollWidth <= innerWidth'), true)
const fallbackFps = await measureFps()
assert.ok(fallbackFps >= 30)
assert.deepEqual(errors, [])

console.log(JSON.stringify({ deniedMicNonBlocking: true, fallbackFps, keyboard: ['Enter', 'Space'], webglFps }))
socket.close()
