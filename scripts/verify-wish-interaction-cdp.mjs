import assert from 'node:assert/strict'
import { writeFile } from 'node:fs/promises'

const port = Number(process.argv[2])
const screenshotOutput = process.argv[3]
if (!Number.isInteger(port)) throw new Error('Usage: node scripts/verify-wish-interaction-cdp.mjs <port>')
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

for (let attempt = 0; attempt < 30; attempt += 1) {
  const ready = await request('Runtime.evaluate', {
    expression: `Boolean(document.querySelector('.cake-blow-button') && document.documentElement.dataset.webglReady === 'true')`,
    returnByValue: true,
  })
  if (ready.result?.result?.value) break
  await delay(200)
}

const initialOrderResponse = await request('Runtime.evaluate', {
  expression: `JSON.stringify({
    blowDisabled: document.querySelector('.cake-blow-button')?.disabled,
    formBeforeBlow: Boolean(
      document.querySelector('.wish-input-shell')?.compareDocumentPosition(
        document.querySelector('.cake-blow-button')
      ) & Node.DOCUMENT_POSITION_FOLLOWING
    ),
    formVisible: Boolean(document.querySelector('.wish-form textarea'))
  })`,
  returnByValue: true,
})
const initialOrder = JSON.parse(initialOrderResponse.result.result.value)
assert.equal(initialOrder.formVisible, true, 'Wish form must be visible before candle controls')
assert.equal(initialOrder.formBeforeBlow, true, 'Wish form must be positioned above candle controls')
assert.equal(initialOrder.blowDisabled, true, 'Blow control must stay locked before the wish is ready')

const wish = 'Mong chúng mình luôn bình an và hạnh phúc.'
const submitted = await request('Runtime.evaluate', {
  expression: `(() => {
    const textarea = document.querySelector('.wish-form textarea');
    const form = document.querySelector('.wish-form');
    if (!textarea || !form) return false;
    const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set;
    setter.call(textarea, ${JSON.stringify(wish)});
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
    form.requestSubmit();
    return true;
  })()`,
  returnByValue: true,
})
assert.equal(submitted.result.result.value, true)
await delay(100)

const preparedResponse = await request('Runtime.evaluate', {
  expression: `JSON.stringify({
    blowDisabled: document.querySelector('.cake-blow-button')?.disabled,
    flightAbsent: !document.querySelector('.wish-flight-copy'),
    state: document.querySelector('.wish-input-shell')?.dataset.wishState,
    storedWish: localStorage.getItem('twinkle-birthday:wish')
  })`,
  returnByValue: true,
})
const prepared = JSON.parse(preparedResponse.result.result.value)
assert.equal(prepared.blowDisabled, false)
assert.equal(prepared.flightAbsent, true, 'Wish must wait for candles before flying')
assert.equal(prepared.state, 'ready')
assert.equal(prepared.storedWish, wish)

await request('Runtime.evaluate', {
  expression: `document.querySelector('.cake-blow-button')?.click()`,
  returnByValue: true,
})

let initial = null
for (let attempt = 0; attempt < 30; attempt += 1) {
  const response = await request('Runtime.evaluate', {
    expression: `JSON.stringify({
      flightCopy: document.querySelector('.wish-flight-copy')?.textContent,
      state: document.querySelector('.wish-input-shell')?.dataset.wishState,
      status: document.querySelector('.cake-controls')?.dataset.cakeStatus
    })`,
    returnByValue: true,
  })
  initial = JSON.parse(response.result.result.value)
  if (initial.flightCopy) break
  await delay(100)
}
assert.equal(initial.flightCopy, wish)
assert.equal(initial.state, 'sent')
assert.equal(initial.status, 'complete')

if (screenshotOutput) {
  const screenshot = await request('Page.captureScreenshot', { format: 'png' })
  await writeFile(screenshotOutput, Buffer.from(screenshot.result.data, 'base64'))
}

const fpsResponse = await request('Runtime.evaluate', {
  awaitPromise: true,
  expression: `new Promise((resolve) => {
    let frames = 0;
    const startedAt = performance.now();
    function measure(now) {
      frames += 1;
      const elapsed = now - startedAt;
      if (elapsed >= 2400) return resolve(Math.round(frames / (elapsed / 1000)));
      requestAnimationFrame(measure);
    }
    requestAnimationFrame(measure);
  })`,
  returnByValue: true,
})
const fps = fpsResponse.result.result.value
assert.ok(fps >= 30, `Wish-to-star animation dropped below 30 FPS: ${fps}`)

const finalState = await request('Runtime.evaluate', {
  expression: `JSON.stringify({
    flightRemoved: !document.querySelector('.wish-flight-copy'),
    status: document.querySelector('.wish-form-status')?.textContent,
    textareaDisabled: document.querySelector('.wish-form textarea')?.disabled
  })`,
  returnByValue: true,
})
const final = JSON.parse(finalState.result.result.value)
assert.equal(final.flightRemoved, true)
assert.equal(final.textareaDisabled, true)
assert.ok(final.status.includes('ngôi sao'))

const celebrationState = await request('Runtime.evaluate', {
  expression: `JSON.stringify({
    celebrating: document.querySelector('.cake-controls')?.dataset.celebrating,
    resetDisabled: document.querySelector('.cake-reset-button')?.disabled,
    resetVisible: Boolean(document.querySelector('.cake-reset-button'))
  })`,
  returnByValue: true,
})
const celebration = JSON.parse(celebrationState.result.result.value)
assert.equal(celebration.celebrating, 'true')
assert.equal(celebration.resetVisible, true)
assert.equal(celebration.resetDisabled, false)

await request('Runtime.evaluate', {
  expression: `document.querySelector('.cake-reset-button')?.click()`,
  returnByValue: true,
})
await delay(100)
const resetResponse = await request('Runtime.evaluate', {
  expression: `JSON.stringify({
    blowDisabled: document.querySelector('.cake-blow-button')?.disabled,
    celebrating: document.querySelector('.cake-controls')?.dataset.celebrating,
    status: document.querySelector('.cake-controls')?.dataset.cakeStatus,
    storedDraft: document.querySelector('.wish-form textarea')?.value,
    textareaDisabled: document.querySelector('.wish-form textarea')?.disabled,
    wishReady: document.querySelector('.cake-controls')?.dataset.wishReady
  })`,
  returnByValue: true,
})
const reset = JSON.parse(resetResponse.result.result.value)
assert.equal(reset.status, 'idle')
assert.equal(reset.celebrating, 'false')
assert.equal(reset.wishReady, 'false')
assert.equal(reset.blowDisabled, true)
assert.equal(reset.textareaDisabled, false)
assert.equal(reset.storedDraft, wish)
socket.close()

console.log(JSON.stringify({ celebration, final, fps, initial, initialOrder, prepared, reset }))
