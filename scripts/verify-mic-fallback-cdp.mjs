import assert from 'node:assert/strict'

const port = Number(process.argv[2])
if (!Number.isInteger(port)) throw new Error('Usage: node scripts/verify-mic-fallback-cdp.mjs <port>')
const delay = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds))

let page = null
for (let attempt = 0; attempt < 40; attempt += 1) {
  try {
    const targets = await fetch(`http://127.0.0.1:${port}/json/list`).then((response) => response.json())
    page = targets.find((target) => target.type === 'page' && target.url.includes('section=cake'))
    if (page) break
  } catch {
    // Edge may still be starting.
  }
  await delay(250)
}
if (!page) throw new Error(`No Cake page found on CDP port ${port}.`)

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
  requestId += 1
  socket.send(JSON.stringify({ id: requestId, method, params }))
  return new Promise((resolve) => pending.set(requestId, resolve))
}

await request('Browser.setPermission', {
  origin: 'http://127.0.0.1:5173',
  permission: { name: 'audioCapture' },
  setting: 'denied',
})

for (let attempt = 0; attempt < 30; attempt += 1) {
  const ready = await request('Runtime.evaluate', {
    expression: `Boolean(document.querySelector('.cake-mic-button') && document.documentElement.dataset.webglReady === 'true')`,
    returnByValue: true,
  })
  if (ready.result?.result?.value) break
  await delay(200)
}

await request('Runtime.evaluate', {
  expression: `document.querySelector('.cake-mic-button')?.click()`,
  returnByValue: true,
})

let fallback = null
for (let attempt = 0; attempt < 20; attempt += 1) {
  const response = await request('Runtime.evaluate', {
    expression: `JSON.stringify({
      failure: document.querySelector('.cake-mic-fallback')?.dataset.micFailure,
      fallbackText: document.querySelector('.cake-mic-fallback')?.textContent,
      manualDisabled: document.querySelector('.cake-blow-button')?.disabled,
      micState: document.querySelector('.cake-mic-button')?.dataset.micState,
      retryDisabled: document.querySelector('.cake-mic-button')?.disabled
    })`,
    returnByValue: true,
  })
  fallback = JSON.parse(response.result.result.value)
  if (fallback.failure) break
  await delay(100)
}

assert.equal(fallback.micState, 'error')
assert.equal(fallback.failure, 'denied')
assert.equal(fallback.manualDisabled, false)
assert.equal(fallback.retryDisabled, false)
assert.ok(fallback.fallbackText.includes('bị từ chối'))

const fpsResponse = await request('Runtime.evaluate', {
  awaitPromise: true,
  expression: `new Promise((resolve) => {
    let frames = 0;
    const startedAt = performance.now();
    function measure(now) {
      frames += 1;
      const elapsed = now - startedAt;
      if (elapsed >= 2000) return resolve(Math.round(frames / (elapsed / 1000)));
      requestAnimationFrame(measure);
    }
    requestAnimationFrame(measure);
  })`,
  returnByValue: true,
})
const fps = fpsResponse.result.result.value
assert.ok(fps >= 30, `Fallback UI dropped below 30 FPS: ${fps}`)
socket.close()
console.log(JSON.stringify({ fallback, fps }))
