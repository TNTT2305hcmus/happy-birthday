import assert from 'node:assert/strict'

/* global document */

const port = Number(process.argv[2])
const mode = process.argv[3] ?? 'default'
if (!Number.isInteger(port)) {
  throw new Error('Usage: node scripts/verify-refinement-r2-cdp.mjs <port> <default|landing|background>')
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
if (!page) throw new Error('R2 browser page was not found')

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

async function waitForStage(expectedStage, timeoutMs = 22_000) {
  const startedAt = Date.now()
  while (Date.now() - startedAt < timeoutMs) {
    const stage = await evaluate('document.documentElement.dataset.experienceStage')
    if (stage === expectedStage) return Date.now()
    await delay(40)
  }
  const currentState = await evaluate("({ phase: document.querySelector('.intro-hero-fade')?.dataset.transitionPhase ?? null, stage: document.documentElement.dataset.experienceStage ?? null })")
  throw new Error(`Timed out waiting for experience stage: ${expectedStage}; current=${JSON.stringify(currentState)}`)
}

await request('Page.enable')
await request('Runtime.enable')
for (let attempt = 0; attempt < 60; attempt += 1) {
  if (await evaluate("document.readyState === 'complete'")) break
  await delay(100)
}

if (mode === 'landing') {
  assert.equal(await evaluate('document.documentElement.dataset.experienceStage'), 'landing')
  assert.equal(await evaluate("Boolean(document.querySelector('.hack-intro'))"), false)
  await evaluate("document.querySelector('.access-cta').click()")
}

const hackerAt = await waitForStage('hacker', 3_000)
assert.equal(await evaluate("document.documentElement.dataset.introLocked === 'true'"), true)
const fadeOutAt = await waitForStage('fade-out')
assert.equal(await evaluate("document.querySelector('.intro-hero-fade')?.dataset.transitionPhase"), 'fade-out')
assert.equal(await evaluate("Boolean(document.querySelector('.star-burst-transition, .shatter-fragments, .transition-flash'))"), false)

let heroRevealAt
let completeAt
let recoveryMs = null
if (mode === 'background') {
  await delay(150)
  const resumedAt = Date.now()
  await evaluate("(() => { const realDateNow = Date.now; Date.now = () => realDateNow() + 5500; document.dispatchEvent(new Event('visibilitychange')); Date.now = realDateNow })()")
  completeAt = await waitForStage('complete', 2_000)
  recoveryMs = completeAt - resumedAt
  assert.ok(recoveryMs <= 1_200, `Background recovery took too long: ${recoveryMs}ms`)
} else {
  heroRevealAt = await waitForStage('hero-reveal', 4_000)
  assert.equal(await evaluate("document.querySelector('.intro-hero-fade')?.dataset.transitionPhase"), 'hero-reveal')
  assert.equal(await evaluate("Boolean(document.querySelector('.hack-intro'))"), false)
  completeAt = await waitForStage('complete', 3_000)

  const holdElapsed = fadeOutAt - hackerAt
  const fadeOutElapsed = heroRevealAt - fadeOutAt
  const fadeInElapsed = completeAt - heroRevealAt
  const totalFadeElapsed = completeAt - fadeOutAt
  assert.ok(holdElapsed >= 12_500 && holdElapsed <= 14_500, `10s lock + 3s hold drifted: ${holdElapsed}ms`)
  assert.ok(fadeOutElapsed >= 2_500 && fadeOutElapsed <= 3_800, `Fade to black drifted: ${fadeOutElapsed}ms`)
  assert.ok(fadeInElapsed >= 1_500 && fadeInElapsed <= 2_600, `Hero fade-in drifted: ${fadeInElapsed}ms`)
  assert.ok(totalFadeElapsed >= 4_750 && totalFadeElapsed <= 5_400, `Total fade timeline drifted: ${totalFadeElapsed}ms`)
}

await delay(150)
const finalState = await evaluate(`(${(() => ({
  activeSection: document.documentElement.dataset.activeSection,
  fadePresent: Boolean(document.querySelector('.intro-hero-fade')),
  hackPresent: Boolean(document.querySelector('.hack-intro')),
  introLocked: document.documentElement.dataset.introLocked === 'true',
  interactiveSections: [...document.querySelectorAll('.story-section')]
    .filter((section) => !section.inert)
    .map((section) => section.id),
})).toString()})()`)
assert.equal(finalState.activeSection, 'hero')
assert.deepEqual(finalState.interactiveSections, ['hero'])
assert.equal(finalState.fadePresent, false)
assert.equal(finalState.hackPresent, false)
assert.equal(finalState.introLocked, false)
assert.deepEqual(consoleErrors, [])

socket.close()
console.log(JSON.stringify({
  fadeInElapsedMs: heroRevealAt ? completeAt - heroRevealAt : null,
  fadeOutElapsedMs: heroRevealAt ? heroRevealAt - fadeOutAt : null,
  finalState,
  lockAndHoldElapsedMs: fadeOutAt - hackerAt,
  mode,
  recoveryMs,
}))
