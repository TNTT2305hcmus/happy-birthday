import assert from 'node:assert/strict'

const port = Number(process.argv[2])
const origin = process.argv[3] ?? 'http://127.0.0.1:4180'
if (!Number.isInteger(port)) throw new Error('Usage: node verify-refinement-r5-4-cdp.mjs <port> [origin]')
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
async function waitFor(expression, label, attempts = 120) {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    if (await evaluate(`Boolean(${expression})`)) return
    await delay(100)
  }
  throw new Error(`Timed out waiting for ${label}`)
}
async function measureFps(duration = 1600) {
  return evaluate(`new Promise((resolve) => { let frames = 0; const start = performance.now();
    function tick(now) { frames += 1; if (now - start > ${duration}) resolve(Math.round(frames / ((now-start)/1000))); else requestAnimationFrame(tick); }
    requestAnimationFrame(tick); })`, true)
}

await request('Page.enable')
await request('Runtime.enable')
await request('Page.bringToFront')
await request('Emulation.setDeviceMetricsOverride', { deviceScaleFactor: 2, height: 850, mobile: false, width: 1470 })
await request('Page.navigate', { url: `${origin}/?experience=off&quality=full` })
await waitFor("document.documentElement.dataset.webglReady === 'true'", 'WebGL runtime')
await evaluate(`(() => {
  const root = document.documentElement;
  const previous = root.style.scrollBehavior;
  root.style.scrollBehavior = 'auto';
  document.querySelector('#cake').scrollIntoView({ block: 'center', behavior: 'instant' });
  window.dispatchEvent(new Event('twinkle:section-refresh'));
  root.style.scrollBehavior = previous;
})()`)
await waitFor("document.documentElement.dataset.activeSection === 'cake'", 'Cake active')

await evaluate(`(() => {
  window.__r54 = {
    activeCounts: [],
    activeSections: [],
    autoCompletedAt: null,
    durations: {},
    scrollSamples: [],
    stages: [],
    stageTimes: {},
    visibleCounts: [],
  };
  const sample = () => {
    const states = [...document.querySelectorAll('.story-section')];
    const active = states.filter((item) => item.dataset.sectionState === 'active');
    const visible = states.filter((item) => item.dataset.sectionState !== 'hidden');
    window.__r54.activeCounts.push(active.length);
    window.__r54.activeSections.push(active[0]?.id ?? 'none');
    window.__r54.visibleCounts.push(visible.length);
    window.__r54.scrollSamples.push(scrollY);
  };
  window.__r54Timer = setInterval(sample, 100);
  window.addEventListener('twinkle:cake-wish-journey', (event) => {
    const stage = event.detail.stage;
    window.__r54.stages.push(stage);
    window.__r54.durations[stage] = event.detail.durationMs ?? null;
    window.__r54.stageTimes[stage] = performance.now();
    if (stage === 'complete') {
      sample();
      clearInterval(window.__r54Timer);
    }
  });
  new MutationObserver(() => {
    if (document.documentElement.dataset.journeyScroll === 'complete') {
      window.__r54.autoCompletedAt = performance.now();
    }
  }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-journey-scroll'] });

  const textarea = document.querySelector('.wish-form textarea');
  Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set.call(textarea, 'Điều ước R5.4');
  textarea.dispatchEvent(new Event('input', { bubbles: true }));
  document.querySelector('.wish-form').requestSubmit();
})()`)
await waitFor("document.querySelector('.cake-visual-stage').dataset.candleInteraction === 'ready'", 'candle controls')

for (let index = 1; index <= 5; index += 1) {
  await evaluate(`document.querySelector('.cake-keyboard-candle:nth-child(${index})').click()`)
  await waitFor(`document.querySelector('.cake-keyboard-candle:nth-child(${index})').disabled`, `candle ${index}`)
  if (index < 5) await waitFor("document.querySelector('.cake-controls').dataset.cakeStatus === 'idle'", 'partial candles idle')
}

await waitFor("window.__r54.stages.includes('topper-to-wand')", 'wand leg')
await waitFor("document.documentElement.dataset.journeyScroll === 'running'", 'auto-scroll running')
await waitFor("document.querySelector('#webgl-canvas').dataset.journeyResolution === 'dynamic'", 'dynamic journey resolution')
const scrollStart = await evaluate('scrollY')
const journeyFps = await measureFps()
await waitFor("document.documentElement.dataset.journeyScroll === 'complete'", 'auto-scroll complete')
await waitFor("window.__r54.stages.includes('complete')", 'particle journey complete')

const result = await evaluate(`(() => {
  const hero = document.getElementById('hero');
  const heroTarget = Math.max(0, Math.min(
    document.documentElement.scrollHeight - innerHeight,
    hero.offsetTop + hero.offsetHeight / 2 - innerHeight / 2
  ));
  return {
    ...window.__r54,
    activeSection: document.documentElement.dataset.activeSection,
    horizontalOverflow: document.documentElement.scrollWidth > innerWidth + 1,
    journeyScroll: document.documentElement.dataset.journeyScroll,
    journeyTarget: document.documentElement.dataset.journeyScrollTarget,
    journeyResolution: document.querySelector('#webgl-canvas').dataset.journeyResolution,
    scrollEnd: scrollY,
    heroTarget,
  };
})()`)

assert.deepEqual(result.stages.slice(0, 3), ['source-to-topper', 'topper-to-wand', 'complete'])
assert.equal(result.journeyScroll, 'complete')
assert.equal(result.journeyTarget, 'hero')
assert.equal(result.journeyResolution, 'native')
assert.equal(result.activeSection, 'hero')
assert.ok(scrollStart > result.scrollEnd)
assert.ok(Math.abs(result.scrollEnd - result.heroTarget) <= 2)
assert.ok(result.scrollSamples.length > 10)
assert.ok(result.scrollSamples.every((value, index, values) => index === 0 || value <= values[index - 1] + 1))
assert.ok(result.activeSections.includes('cake'))
assert.ok(result.activeSections.includes('hero'))
assert.ok(Math.max(...result.activeCounts) <= 1)
assert.ok(Math.max(...result.visibleCounts) <= 2)
assert.equal(result.durations['topper-to-wand'], 1_550)
assert.ok(result.autoCompletedAt - result.stageTimes['topper-to-wand'] >= 1_400)
assert.ok(result.stageTimes.complete >= result.autoCompletedAt)
assert.ok(result.stageTimes.complete - result.autoCompletedAt <= 800, JSON.stringify({ autoCompletedAt: result.autoCompletedAt, stageTimes: result.stageTimes }))
assert.equal(result.horizontalOverflow, false)
assert.ok(journeyFps >= 30, 'Journey FPS below threshold: ' + journeyFps)
assert.deepEqual(errors, [])

console.log(JSON.stringify({
  activeSections: [...new Set(result.activeSections)],
  autoScrollMs: Math.round(result.autoCompletedAt - result.stageTimes['topper-to-wand']),
  journeyFps,
  scrollEnd: result.scrollEnd,
  scrollStart,
  stages: result.stages,
}))
socket.close()
