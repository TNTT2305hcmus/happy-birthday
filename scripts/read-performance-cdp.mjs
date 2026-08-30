const port = Number(process.argv[2])

if (!Number.isInteger(port)) {
  throw new Error('Usage: node scripts/read-performance-cdp.mjs <debug-port>')
}

const delay = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds))

async function findPage() {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    try {
      const targets = await fetch(`http://127.0.0.1:${port}/json/list`).then((response) => response.json())
      const page = targets.find((target) => target.type === 'page' && target.url.includes('debug=performance'))
      if (page) return page
    } catch {
      // Browser may still be starting.
    }
    await delay(250)
  }

  throw new Error(`No performance page found on CDP port ${port}.`)
}

const page = await findPage()
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

let measurement = null
for (let attempt = 0; attempt < 20; attempt += 1) {
  const response = await request('Runtime.evaluate', {
    expression: `JSON.stringify({
      fps: document.documentElement.dataset.fps || null,
      quality: document.documentElement.dataset.quality || null,
      webgl: document.documentElement.dataset.webgl || null,
      renderer: document.documentElement.dataset.webglReady || null
    })`,
    returnByValue: true,
  })
  const serializedMeasurement = response.result?.result?.value
  if (typeof serializedMeasurement === 'string') {
    measurement = JSON.parse(serializedMeasurement)
    if (measurement.fps) break
  }
  await delay(300)
}

socket.close()

if (!measurement?.fps) {
  throw new Error('PerformanceMonitor did not finish within the measurement window.')
}

console.log(JSON.stringify(measurement))
