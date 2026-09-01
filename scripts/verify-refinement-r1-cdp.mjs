import assert from 'node:assert/strict'

/* global document, getComputedStyle, innerHeight, innerWidth, requestAnimationFrame, scrollTo, window */

const port = Number(process.argv[2])
const expectedWidth = Number(process.argv[3])
const expectedHeight = Number(process.argv[4])
const expectedMotion = process.argv[5] ?? 'full'
const includeIntro = process.argv[6] === 'intro'
if (!Number.isInteger(port)) {
  throw new Error('Usage: node scripts/verify-refinement-r0-cdp.mjs <port> <width> <height> <motion> <intro|skip>')
}

const delay = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds))
let page
for (let attempt = 0; attempt < 50; attempt += 1) {
  try {
    const targets = await fetch('http://127.0.0.1:' + port + '/json/list').then((response) => response.json())
    page = targets.find((target) => target.type === 'page')
    if (page) break
  } catch {
    // Edge may still be starting.
  }
  await delay(200)
}
if (!page) throw new Error('Baseline page was not found')

const socket = new WebSocket(page.webSocketDebuggerUrl)
const pending = new Map()
const consoleErrors = []
let requestId = 0
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
    handler(message)
    return
  }
  if (message.method === 'Runtime.exceptionThrown') {
    consoleErrors.push({
      source: 'runtime',
      text: message.params?.exceptionDetails?.text ?? 'Runtime exception',
    })
  }
  if (message.method === 'Runtime.consoleAPICalled' && message.params?.type === 'error') {
    consoleErrors.push({
      source: 'console',
      text: message.params.args
        .map((argument) => argument.value ?? argument.description ?? '')
        .join(' '),
    })
  }
  if (message.method === 'Log.entryAdded' && message.params?.entry?.level === 'error') {
    consoleErrors.push({
      source: 'log',
      text: message.params.entry.text,
      url: message.params.entry.url ?? null,
    })
  }
})
function request(method, params = {}) {
  const id = ++requestId
  socket.send(JSON.stringify({ id, method, params }))
  return new Promise((resolve) => pending.set(id, resolve))
}
async function evaluate(expression, awaitPromise = false) {
  const response = await request('Runtime.evaluate', {
    awaitPromise,
    expression,
    returnByValue: true,
  })
  if (response.result?.exceptionDetails) {
    throw new Error(response.result.exceptionDetails.text)
  }
  return response.result?.result?.value
}

await request('Page.enable')
await request('Runtime.enable')
await request('Log.enable')
await request('Emulation.setDeviceMetricsOverride', {
  deviceScaleFactor: 1,
  height: expectedHeight,
  mobile: expectedWidth < 700,
  width: expectedWidth,
})

for (let attempt = 0; attempt < 60; attempt += 1) {
  const ready = await evaluate(
    "document.readyState === 'complete' && ['true', 'fallback'].includes(document.documentElement.dataset.webglReady)",
  )
  if (ready) break
  await delay(200)
}
await evaluate('document.fonts.ready', true)

let introElapsedMs = null
let sawIntroLock = false
if (includeIntro) {
  const introObservedAt = Date.now()
  let introCompleted = false
  for (let attempt = 0; attempt < 110; attempt += 1) {
    const state = await evaluate('(' + (() => ({
      hasHack: Boolean(document.querySelector('.hack-intro')),
      hasTransition: Boolean(document.querySelector('.intro-hero-fade')),
      locked: document.documentElement.dataset.introLocked === 'true',
    })).toString() + ')()')
    sawIntroLock ||= state.locked
    if (sawIntroLock && !state.hasHack && !state.hasTransition && !state.locked) {
      introCompleted = true
      introElapsedMs = Date.now() - introObservedAt
      break
    }
    await delay(200)
  }
  assert.ok(sawIntroLock, 'Intro must lock input during the hacker stage')
  assert.ok(introCompleted, 'Intro must complete before the full-journey smoke continues')
  assert.ok(introElapsedMs >= 12_000 && introElapsedMs <= 19_000, 'Unexpected baseline intro timing')
}

async function measureFps() {
  return evaluate('(' + (() => new Promise((resolve) => {
    let frames = 0
    const startedAt = performance.now()
    function tick(now) {
      frames += 1
      if (now - startedAt >= 900) {
        resolve(Math.round(frames * 1000 / (now - startedAt)))
        return
      }
      requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  })).toString() + ')()', true)
}

async function sampleSection(id) {
  const idArgument = JSON.stringify(id)
  await evaluate('(' + ((sectionId) => {
    const section = document.getElementById(sectionId)
    section.scrollIntoView({ block: 'center', behavior: 'instant' })
  }).toString() + ')(' + idArgument + ')')
  await delay(700)
  await evaluate('document.getElementById(' + idArgument + ').focus()')
  const layout = await evaluate('(' + ((sectionId) => {
    const section = document.getElementById(sectionId)
    const rect = section.getBoundingClientRect()
    const visibleSections = [...document.querySelectorAll('.story-section')]
      .filter((candidate) => {
        const candidateRect = candidate.getBoundingClientRect()
        const style = getComputedStyle(candidate)
        return candidateRect.bottom > 0
          && candidateRect.top < innerHeight
          && style.display !== 'none'
          && style.visibility !== 'hidden'
          && Number(style.opacity) > 0
      })
      .map((candidate) => candidate.id)
    const sectionStates = [...document.querySelectorAll('.story-section')].map((candidate) => ({
      active: candidate.dataset.sectionState === 'active',
      ariaHidden: candidate.getAttribute('aria-hidden'),
      id: candidate.id,
      inert: candidate.inert,
      pointerEvents: getComputedStyle(candidate).pointerEvents,
      state: candidate.dataset.sectionState,
      visibility: getComputedStyle(candidate).visibility,
    }))
    return {
      activeElementId: document.activeElement?.id ?? null,
      horizontalOverflow: document.documentElement.scrollWidth > innerWidth + 1,
      rect: { bottom: rect.bottom, top: rect.top },
      sectionStates,
      visibleSections,
    }
  }).toString() + ')(' + idArgument + ')')
  const fps = await measureFps()
  assert.equal(layout.activeElementId, id, JSON.stringify(layout))
  assert.ok(layout.rect.bottom > 0 && layout.rect.top < expectedHeight)
  assert.equal(layout.horizontalOverflow, false)
  assert.deepEqual(layout.sectionStates.filter(({ active }) => active).map(({ id: activeId }) => activeId), [id])
  assert.deepEqual(
    layout.sectionStates
      .filter(({ id: candidateId }) => candidateId !== id)
      .filter(({ ariaHidden, inert, pointerEvents }) => ariaHidden !== 'true' || !inert || pointerEvents !== 'none'),
    [],
  )
  assert.ok(fps >= 30, id + ' dropped below 30 FPS: ' + fps)
  return { fps, ...layout }
}

const sections = {}
for (const id of ['hero', 'cake', 'letter']) {
  sections[id] = await sampleSection(id)
}

const boundaryScroll = await evaluate('(' + (() => {
  const hero = document.getElementById('hero')
  const cake = document.getElementById('cake')
  document.activeElement?.blur()
  const heroCenter = hero.offsetTop + hero.offsetHeight / 2
  const cakeCenter = cake.offsetTop + cake.offsetHeight / 2
  const previousBehavior = document.documentElement.style.scrollBehavior
  document.documentElement.style.scrollBehavior = 'auto'
  const target = (heroCenter + cakeCenter) / 2 - innerHeight / 2
  scrollTo(0, target)
  window.dispatchEvent(new Event('scroll'))
  window.dispatchEvent(new Event('twinkle:section-refresh'))
  document.dispatchEvent(new Event('scroll'))
  document.documentElement.style.scrollBehavior = previousBehavior
  return { actual: window.scrollY, target }
}).toString() + ')()')
await delay(350)
const boundarySections = await evaluate('(' + (() => (
  [...document.querySelectorAll('.story-section')]
    .filter((section) => section.dataset.sectionState !== 'hidden')
    .map((section) => ({
      id: section.id,
      pointerEvents: getComputedStyle(section).pointerEvents,
      state: section.dataset.sectionState,
    }))
)).toString() + ')()')
const boundaryCurrentScroll = await evaluate('window.scrollY')
const boundaryLayouts = await evaluate('(' + (() => (
  [...document.querySelectorAll('.story-section')].map((section) => {
    const rect = section.getBoundingClientRect()
    return { center: rect.top + window.scrollY + rect.height / 2, height: rect.height, id: section.id }
  })
)).toString() + ')()')
if (expectedMotion === 'reduced') {
  assert.ok(boundarySections.length >= 1 && boundarySections.length <= 2)
} else {
  assert.deepEqual(
    boundarySections.map(({ id }) => id),
    ['hero', 'cake'],
    JSON.stringify({ boundaryCurrentScroll, boundaryLayouts, boundaryScroll }),
  )
}
assert.equal(boundarySections.filter(({ state }) => state === 'active').length, 1)
assert.equal(boundarySections.filter(({ pointerEvents }) => pointerEvents !== 'none').length, 1)

await evaluate('(' + (() => {
  const cake = document.getElementById('cake')
  cake.scrollIntoView({ block: 'center', behavior: 'instant' })
}).toString() + ')()')
await delay(350)
await evaluate(`document.querySelector('#cake button, #cake textarea, #cake [tabindex]')?.focus()`)
await evaluate('(' + (() => {
  document.getElementById('hero').scrollIntoView({ block: 'center', behavior: 'instant' })
}).toString() + ')()')
await delay(350)
assert.equal(await evaluate(`document.getElementById('cake').contains(document.activeElement)`), false)

await request('Input.dispatchMouseEvent', {
  deltaX: 0,
  deltaY: expectedHeight * 2,
  type: 'mouseWheel',
  x: Math.floor(expectedWidth / 2),
  y: Math.floor(expectedHeight / 2),
})
await delay(350)
assert.equal(await evaluate(`document.querySelectorAll('.story-section[data-section-state=active]').length`), 1)

await request('Input.dispatchKeyEvent', { key: 'PageUp', type: 'keyDown' })
await request('Input.dispatchKeyEvent', { key: 'PageUp', type: 'keyUp' })
await delay(350)
assert.equal(await evaluate(`document.querySelectorAll('.story-section[data-section-state=active]').length`), 1)

if (expectedWidth < 700) {
  await request('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 1 })
  const touchX = Math.floor(expectedWidth / 2)
  await request('Input.dispatchTouchEvent', {
    touchPoints: [{ id: 1, x: touchX, y: expectedHeight * 0.75 }],
    type: 'touchStart',
  })
  await request('Input.dispatchTouchEvent', {
    touchPoints: [{ id: 1, x: touchX, y: expectedHeight * 0.25 }],
    type: 'touchMove',
  })
  await request('Input.dispatchTouchEvent', { touchPoints: [], type: 'touchEnd' })
  await delay(350)
  assert.equal(await evaluate(`document.querySelectorAll('.story-section[data-section-state=active]').length`), 1)
}

await request('Emulation.setDeviceMetricsOverride', {
  deviceScaleFactor: 1,
  height: expectedHeight - 50,
  mobile: expectedWidth < 700,
  width: expectedWidth,
})
await delay(250)
await request('Emulation.setDeviceMetricsOverride', {
  deviceScaleFactor: 1,
  height: expectedHeight,
  mobile: expectedWidth < 700,
  width: expectedWidth,
})
await delay(350)
assert.equal(await evaluate(`document.querySelectorAll('.story-section[data-section-state=active]').length`), 1)

assert.equal(await evaluate('innerWidth'), expectedWidth)
assert.equal(await evaluate('innerHeight'), expectedHeight)
assert.equal(await evaluate("document.documentElement.dataset.motion"), expectedMotion)
const blockingConsoleErrors = consoleErrors.filter(
  (entry) => !entry.url?.endsWith('/favicon.ico'),
)
assert.deepEqual(blockingConsoleErrors, [])

socket.close()
console.log(JSON.stringify({
  boundarySections,
  blockingConsoleErrors,
  consoleErrors,
  includeIntro,
  introElapsedMs,
  motion: expectedMotion,
  sawIntroLock,
  sections,
  viewport: { height: expectedHeight, width: expectedWidth },
}))
