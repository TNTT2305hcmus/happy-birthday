import assert from 'node:assert/strict'

const port = Number(process.argv[2])
const origin = process.argv[3] ?? 'http://127.0.0.1:4179'
if (!Number.isInteger(port)) throw new Error('Usage: node verify-refinement-r5-3-cdp.mjs <port> [origin]')
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
async function waitFor(expression, label, attempts = 100) {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    if (await evaluate(`Boolean(${expression})`)) return
    await delay(100)
  }
  throw new Error(`Timed out waiting for ${label}`)
}
async function measureFps(duration = 2500) {
  return evaluate(`new Promise((resolve) => { let frames = 0; const start = performance.now();
    function tick(now) { frames += 1; if (now - start > ${duration}) resolve(Math.round(frames / ((now-start)/1000))); else requestAnimationFrame(tick); }
    requestAnimationFrame(tick); })`, true)
}

await request('Page.enable')
await request('Runtime.enable')
await request('Page.bringToFront')
await request('Emulation.setDeviceMetricsOverride', { deviceScaleFactor: 2, height: 850, mobile: false, width: 1470 })
await request('Page.navigate', { url: `${origin}/?section=cake&quality=full` })
await waitFor("document.documentElement.dataset.webglReady === 'true'", 'WebGL runtime')
await evaluate("document.querySelector('#cake').scrollIntoView({block:'start'})")
await delay(250)
await evaluate(`(() => {
  window.__wishJourneyStages = [];
  window.addEventListener('twinkle:cake-wish-journey', (event) => window.__wishJourneyStages.push(event.detail.stage));
  const textarea = document.querySelector('.wish-form textarea');
  Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set.call(textarea, 'Điều ước R5.3');
  textarea.dispatchEvent(new Event('input', { bubbles: true }));
  document.querySelector('.wish-form').requestSubmit();
})()`)
await waitFor("document.querySelector('.cake-visual-stage').dataset.candleInteraction === 'ready'", 'candle controls')

for (let index = 1; index <= 5; index += 1) {
  await evaluate(`document.querySelector('.cake-keyboard-candle:nth-child(${index})').click()`)
  await waitFor(`document.querySelector('.cake-keyboard-candle:nth-child(${index})').disabled`, `candle ${index}`)
  if (index < 5) await waitFor("document.querySelector('.cake-controls').dataset.cakeStatus === 'idle'", 'partial candles idle')
}
await waitFor("window.__wishJourneyStages.includes('source-to-topper')", 'source-to-topper stage')
const scrollAtLaunch = await evaluate('scrollY')
const journeyFps = await measureFps()
await waitFor("window.__wishJourneyStages.includes('complete')", 'complete journey')
const stages = await evaluate('window.__wishJourneyStages')
assert.deepEqual(stages.slice(0, 3), ['source-to-topper', 'topper-to-wand', 'complete'])
assert.equal(await evaluate('scrollY'), scrollAtLaunch, 'R5.3 must not auto-scroll before R5.4')
assert.ok(journeyFps >= 30)
assert.equal(await evaluate('document.body.scrollWidth <= innerWidth'), true)
assert.deepEqual(errors, [])

await evaluate("document.querySelector('.cake-reset-button').click()")
await waitFor("window.__wishJourneyStages.at(-1) === 'idle'", 'journey reset')
assert.equal(await evaluate("document.querySelector('.cake-controls').dataset.cakeStatus"), 'idle')

console.log(JSON.stringify({
  journeyFps,
  particleBudget: { full: 96, lite: 40 },
  scrollStable: true,
  stages,
}))
socket.close()
