import assert from 'node:assert/strict'

/* global document, getComputedStyle, innerHeight, innerWidth, requestAnimationFrame */

const port = Number(process.argv[2])
const expectedWidth = Number(process.argv[3])
const expectedHeight = Number(process.argv[4])
const expectedMotion = process.argv[5] ?? 'full'
if (!Number.isInteger(port)) {
  throw new Error('Usage: node scripts/verify-refinement-r3-1-4-cdp.mjs <port> <width> <height> <full|reduced>')
}

const delay = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds))
let page
for (let attempt = 0; attempt < 50; attempt += 1) {
  try {
    const targets = await fetch(`http://127.0.0.1:${port}/json/list`).then((response) => response.json())
    page = targets.find((target) => target.type === 'page')
    if (page) break
  } catch {
    // Edge may still be starting.
  }
  await delay(200)
}
if (!page) throw new Error('R3 Hero browser page was not found')

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
    consoleErrors.push(message.params?.exceptionDetails?.text ?? 'Runtime exception')
  }
  if (message.method === 'Runtime.consoleAPICalled' && message.params?.type === 'error') {
    consoleErrors.push(message.params.args.map((argument) => argument.value ?? argument.description ?? '').join(' '))
  }
})

function request(method, params = {}) {
  const id = ++requestId
  socket.send(JSON.stringify({ id, method, params }))
  return new Promise((resolve) => pending.set(id, resolve))
}

async function evaluate(expression, awaitPromise = false) {
  const response = await request('Runtime.evaluate', { awaitPromise, expression, returnByValue: true })
  if (response.result?.exceptionDetails) throw new Error(response.result.exceptionDetails.text)
  return response.result?.result?.value
}

await request('Runtime.enable')
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
  await delay(150)
}
await evaluate('document.fonts.ready', true)
await delay(650)

const result = await evaluate(`(${(() => {
  const panel = document.querySelector('.hero-copy-panel')
  const title = document.querySelector('.hero-script-title')
  const loveLine = document.querySelector('.hero-love-line')
  const name = document.querySelector('.hero-title-name')
  const sparkle = document.querySelector('.hero-tag-sparkle')
  const storyline = document.querySelector('.hero-storyline')
  const panelRect = panel.getBoundingClientRect()
  const titleRect = title.getBoundingClientRect()
  const storylineRect = storyline.getBoundingClientRect()
  const titleStyle = getComputedStyle(title)
  const loveStyle = getComputedStyle(loveLine)
  const heartStyle = getComputedStyle(name, '::after')
  const sparkleStyle = getComputedStyle(sparkle)
  return {
    animationName: loveStyle.animationName,
    heartAnimationName: heartStyle.animationName,
    heartContent: heartStyle.content,
    directChildren: [...panel.children].map((child) => child.className),
    fontFamily: titleStyle.fontFamily,
    fontLoaded: document.fonts.check("700 48px 'Dancing Script'", 'Hiền Lương'),
    horizontalOverflow: document.documentElement.scrollWidth > innerWidth + 1,
    legacyCount: document.querySelectorAll('.hero-stats, .hero-milestone, .hero-cta, .hero-footer').length,
    loveLabel: document.querySelector('.hero-love-loop').getAttribute('aria-label'),
    loveFontSize: Number.parseFloat(loveStyle.fontSize),
    milestoneCopyPresent: panel.textContent.includes('1.111 ngày được bên em bé') && panel.textContent.includes('16.9.2026'),
    nameText: name.textContent,
    oldCopyPresent: panel.textContent.includes('Tuổi mới') || panel.textContent.includes('Bắt đầu hành trình'),
    panelRect: { bottom: panelRect.bottom, height: panelRect.height, left: panelRect.left, right: panelRect.right, top: panelRect.top, width: panelRect.width },
    storylineInside: storylineRect.left >= panelRect.left - 1 && storylineRect.right <= panelRect.right + 1,
    tagText: document.querySelector('.hero-date-chip').textContent.replace(/\s+/g, ' ').trim(),
    sparkleAnimationName: sparkleStyle.animationName,
    sparkleAriaHidden: sparkle.getAttribute('aria-hidden'),
    titleInside: titleRect.left >= panelRect.left - 1 && titleRect.right <= panelRect.right + 1,
    titleText: title.textContent.trim(),
    viewport: { height: innerHeight, width: innerWidth },
    webgl: document.documentElement.dataset.webgl,
  }
}).toString()})()`)

const fps = await evaluate(`(${(() => new Promise((resolve) => {
  let frames = 0
  const startedAt = performance.now()
  function tick(now) {
    frames += 1
    if (now - startedAt >= 2_000) {
      resolve(Math.round(frames * 1_000 / (now - startedAt)))
      return
    }
    requestAnimationFrame(tick)
  }
  requestAnimationFrame(tick)
})).toString()})()`, true)

assert.equal(result.titleText, 'Happy Birthday Ngiu Hiền Lương xinh đẹp của a')
assert.equal(result.tagText.includes('Ngày của em bé'), true)
assert.equal(result.tagText.includes('17.9.2026'), true)
assert.equal(result.loveLabel, 'I love u so much and be always only you.')
assert.equal(result.milestoneCopyPresent, true)
assert.equal(result.nameText, 'Hiền Lương')
assert.equal(result.heartContent.includes('♥'), true)
assert.equal(result.sparkleAriaHidden, 'true')
assert.deepEqual(result.directChildren, ['hero-date-chip', 'hero-script-title', 'hero-storyline'])
assert.equal(result.legacyCount, 0)
assert.equal(result.oldCopyPresent, false)
assert.equal(result.fontLoaded, true)
assert.equal(result.fontFamily.includes('Dancing Script'), true)
assert.equal(result.horizontalOverflow, false)
assert.equal(result.titleInside, true)
assert.equal(result.storylineInside, true)
assert.ok(result.panelRect.left >= 0 && result.panelRect.right <= expectedWidth + 1)
assert.ok(result.panelRect.top >= 0 && result.panelRect.bottom <= expectedHeight + 1)
assert.ok(expectedWidth < 700 ? result.panelRect.width <= expectedWidth : result.panelRect.width <= 610)
assert.equal(expectedMotion === 'reduced' ? result.animationName === 'none' : result.animationName.includes('hero-love-reveal'), true)
assert.equal(expectedMotion === 'reduced' ? result.heartAnimationName === 'none' : result.heartAnimationName.includes('hero-title-heartbeat'), true)
assert.equal(expectedMotion === 'reduced' ? result.sparkleAnimationName === 'none' : result.sparkleAnimationName.includes('hero-tag-sparkle'), true)
assert.ok(result.loveFontSize > (expectedWidth < 700 ? 28 : 30))
assert.ok(fps >= 30, `Hero dropped below 30 FPS: ${fps}`)
assert.deepEqual(consoleErrors, [])

socket.close()
console.log(JSON.stringify({ fps, motion: expectedMotion, ...result }))
