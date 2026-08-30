import assert from 'node:assert/strict'
import { writeFile } from 'node:fs/promises'

const port = Number(process.argv[2])
const screenshotPath = process.argv[3]
if (!Number.isInteger(port)) throw new Error('Usage: node scripts/verify-letter-interaction-cdp.mjs <port> [screenshot]')

const delay = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds))
let page
for (let attempt = 0; attempt < 30; attempt += 1) {
  try {
    const targets = await fetch(`http://127.0.0.1:${port}/json/list`).then((response) => response.json())
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
async function evaluate(expression) {
  const response = await request('Runtime.evaluate', { expression, returnByValue: true })
  return response.result?.result?.value
}

await request('Page.enable')
for (let attempt = 0; attempt < 30; attempt += 1) {
  if (await evaluate("document.documentElement.dataset.webglReady === 'true'")) break
  await delay(200)
}
await delay(500)

const readState = `(() => {
  const button = document.querySelector('.letter-toggle-button')
  return {
    expanded: button?.getAttribute('aria-expanded'),
    status: button?.dataset.letterStatus,
    sceneState: document.documentElement.dataset.letterState,
  }
})()`
const initial = await evaluate(readState)
assert.ok(initial?.expanded, 'Letter control is missing')
await evaluate("document.querySelector('.letter-toggle-button').click()")
await delay(1_500)
const final = await evaluate(readState)
assert.notEqual(final.expanded, initial.expanded, 'Click should toggle aria-expanded')
assert.ok(['open', 'closed'].includes(final.sceneState), `Unexpected scene state: ${final.sceneState}`)

if (screenshotPath) {
  const capture = await request('Page.captureScreenshot', { format: 'png', fromSurface: true })
  await writeFile(screenshotPath, Buffer.from(capture.result.data, 'base64'))
}
socket.close()
console.log(JSON.stringify({ initial, final }))
