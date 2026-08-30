import assert from 'node:assert/strict'
import { writeFile } from 'node:fs/promises'

const port = Number(process.argv[2])
const progressOutput = process.argv[3]
const completeOutput = process.argv[4]
if (!Number.isInteger(port) || !progressOutput || !completeOutput) {
  throw new Error('Usage: node scripts/verify-cake-interaction-cdp.mjs <port> <progress.png> <complete.png>')
}

const delay = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds))

let page = null
for (let attempt = 0; attempt < 30; attempt += 1) {
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
  const id = requestId
  socket.send(JSON.stringify({ id, method, params }))
  return new Promise((resolve) => pending.set(id, resolve))
}

for (let attempt = 0; attempt < 30; attempt += 1) {
  const ready = await request('Runtime.evaluate', {
    expression: `Boolean(
      document.querySelector('.cake-blow-button') &&
      document.documentElement.dataset.webglReady === 'true'
    )`,
    returnByValue: true,
  })
  if (ready.result?.result?.value) break
  await delay(200)
}

const clickResult = await request('Runtime.evaluate', {
  expression: `(() => {
    const button = document.querySelector('.cake-blow-button');
    if (!button) return false;
    button.click();
    return true;
  })()`,
  returnByValue: true,
})
assert.equal(clickResult.result.result.value, true, 'Manual blow button was not clickable')

const fpsRequest = request('Runtime.evaluate', {
  awaitPromise: true,
  expression: `new Promise((resolve) => {
    let frames = 0;
    const startedAt = performance.now();
    function measure(now) {
      frames += 1;
      const elapsed = now - startedAt;
      if (elapsed >= 2000) {
        resolve(Math.round(frames / (elapsed / 1000)));
        return;
      }
      requestAnimationFrame(measure);
    }
    requestAnimationFrame(measure);
  })`,
  returnByValue: true,
})

await delay(650)
const progressCapture = await request('Page.captureScreenshot', { format: 'png' })
await writeFile(progressOutput, Buffer.from(progressCapture.result.data, 'base64'))

const fpsResponse = await fpsRequest
const fps = fpsResponse.result.result.value
assert.ok(fps >= 30, `Cake extinguish animation dropped below 30 FPS: ${fps}`)

const statusResponse = await request('Runtime.evaluate', {
  expression: `JSON.stringify({
    buttonDisabled: document.querySelector('.cake-blow-button')?.disabled,
    status: document.querySelector('.cake-controls')?.dataset.cakeStatus,
    text: document.querySelector('.cake-status p')?.textContent
  })`,
  returnByValue: true,
})
const status = JSON.parse(statusResponse.result.result.value)
assert.equal(status.status, 'complete')
assert.equal(status.buttonDisabled, true)

const completeCapture = await request('Page.captureScreenshot', { format: 'png' })
await writeFile(completeOutput, Buffer.from(completeCapture.result.data, 'base64'))
socket.close()

console.log(JSON.stringify({ fps, status }))
