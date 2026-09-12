import assert from 'node:assert/strict'

const port = Number(process.argv[2])
const origin = process.argv[3] ?? 'http://127.0.0.1:4174'
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
let page
for (let attempt = 0; attempt < 50; attempt += 1) {
  try {
    const pages = await fetch(`http://127.0.0.1:${port}/json/list`).then((response) => response.json())
    page = pages.find(({ type }) => type === 'page')
    if (page) break
  } catch { /* Edge is starting. */ }
  await delay(200)
}
if (!page) throw new Error('R4.2 browser page was not found')
const socket = new WebSocket(page.webSocketDebuggerUrl)
const pending = new Map()
const consoleErrors = []
let id = 0
await new Promise((resolve, reject) => {
  socket.addEventListener('open', resolve, { once: true })
  socket.addEventListener('error', reject, { once: true })
})
socket.addEventListener('message', ({ data }) => {
  const message = JSON.parse(data)
  if (message.id) {
    const handler = pending.get(message.id)
    if (!handler) return
    pending.delete(message.id)
    if (message.error) handler.reject(new Error(message.error.message))
    else handler.resolve(message.result)
  } else if (message.method === 'Runtime.exceptionThrown') {
    consoleErrors.push(message.params?.exceptionDetails?.text ?? 'Runtime exception')
  } else if (message.method === 'Runtime.consoleAPICalled' && message.params?.type === 'error') {
    consoleErrors.push(message.params.args.map((item) => item.value ?? item.description ?? '').join(' '))
  }
})
function request(method, params = {}) {
  const requestId = ++id
  socket.send(JSON.stringify({ id: requestId, method, params }))
  return new Promise((resolve, reject) => pending.set(requestId, { reject, resolve }))
}
async function evaluate(expression, awaitPromise = false) {
  const response = await request('Runtime.evaluate', { awaitPromise, expression, returnByValue: true })
  if (response.exceptionDetails) throw new Error(response.exceptionDetails.text)
  return response.result.value
}
async function navigate(path) {
  await request('Page.navigate', { url: `${origin}${path}` })
  for (let attempt = 0; attempt < 60; attempt += 1) {
    if (await evaluate("document.readyState === 'complete' && document.querySelector('#cake') && ['true','fallback'].includes(document.documentElement.dataset.webglReady)")) break
    await delay(150)
  }
  await evaluate('document.fonts.ready', true)
  await delay(400)
}
async function sample(segmentProgress) {
  return evaluate(`new Promise((resolve) => {
    const hero = document.getElementById('hero');
    const cake = document.getElementById('cake');
    const heroCenter = hero.offsetTop + hero.offsetHeight / 2;
    const cakeCenter = cake.offsetTop + cake.offsetHeight / 2;
    const target = heroCenter + (cakeCenter - heroCenter) * ${segmentProgress} - innerHeight / 2;
    document.documentElement.style.scrollBehavior = 'auto';
    scrollTo(0, target);
    window.dispatchEvent(new Event('scroll'));
    window.dispatchEvent(new Event('twinkle:section-refresh'));
    setTimeout(() => {
      const fallback = document.querySelector('.cake-fallback-model');
      resolve({
        active: document.documentElement.dataset.activeSection,
        direction: document.documentElement.dataset.scrollDirection,
        fallbackOpacity: fallback ? Number(getComputedStyle(fallback).opacity) : null,
        presence: Number(getComputedStyle(cake).getPropertyValue('--scene-presence')),
        revealed: cake.dataset.sceneRevealed,
        sectionState: cake.dataset.sectionState,
        target,
      });
    }, 180);
  })`, true)
}
async function measureFps() {
  return evaluate(`new Promise((resolve) => {
    let frames = 0; const start = performance.now();
    function tick(now) { frames += 1; if (now - start >= 1800) resolve(Math.round(frames * 1000 / (now - start))); else requestAnimationFrame(tick); }
    requestAnimationFrame(tick);
  })`, true)
}

await request('Page.enable')
await request('Runtime.enable')
await request('Emulation.setDeviceMetricsOverride', { deviceScaleFactor: 1, height: 850, mobile: false, width: 1470 })
await navigate('/?experience=off&quality=full')
const forward = []
for (const progress of [0.4, 0.52, 0.53, 0.548, 0.6]) forward.push(await sample(progress))
assert.equal(forward[0].presence, 0)
assert.equal(forward[1].active, 'cake')
assert.equal(forward[1].sectionState, 'active')
assert.equal(forward[1].presence, 0)
assert.equal(forward[1].revealed, 'false')
assert.ok(forward[2].presence > 0 && forward[2].presence < 1)
assert.equal(forward[2].revealed, 'true')
assert.ok(forward[3].presence > 0.999)
assert.equal(forward[4].presence, 1)
const reverse = []
for (const progress of [0.548, 0.53, 0.52, 0.4]) reverse.push(await sample(progress))
assert.ok(reverse[0].presence > 0.999)
assert.ok(reverse[1].presence > 0 && reverse[1].presence < 1)
assert.equal(reverse[2].presence, 0)
assert.ok(reverse[2].target < reverse[1].target, 'Reverse samples must move toward Hero')
const fps = await measureFps()
assert.ok(fps >= 30, `Cake reveal dropped below 30 FPS: ${fps}`)

await navigate('/?section=cake&quality=full')
const deepLink = await evaluate(`(() => {
  const cake = document.getElementById('cake');
  return { active: document.documentElement.dataset.activeSection, presence: Number(getComputedStyle(cake).getPropertyValue('--scene-presence')), revealed: cake.dataset.sceneRevealed };
})()`)
assert.deepEqual(deepLink, { active: 'cake', presence: 1, revealed: 'true' })

await navigate('/?experience=off&webgl=off')
const fallbackEarly = await sample(0.52)
const fallbackFull = await sample(0.548)
assert.equal(fallbackEarly.fallbackOpacity, 0)
assert.ok(fallbackFull.fallbackOpacity > 0.999)
assert.deepEqual(consoleErrors, [])
socket.close()
console.log(JSON.stringify({ deepLink, fallback: [fallbackEarly, fallbackFull], forward, fps, reverse }))