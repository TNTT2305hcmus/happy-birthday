export function navigateToStorySection(targetId, browser = window) {
  const target = browser.document.getElementById(targetId)

  if (!target) {
    const nextUrl = new URL(browser.location.href)
    nextUrl.searchParams.set('section', targetId)
    nextUrl.searchParams.delete('stage')
    nextUrl.hash = ''
    browser.location.assign(nextUrl.toString())
    return 'demo-navigation'
  }

  const reducedMotion = browser.matchMedia('(prefers-reduced-motion: reduce)').matches
  const behavior = reducedMotion ? 'auto' : 'smooth'
  target.scrollIntoView({ behavior, block: 'start' })
  target.focus({ preventScroll: true })

  const nextUrl = new URL(browser.location.href)
  nextUrl.hash = targetId
  browser.history.replaceState(
    null,
    '',
    `${nextUrl.pathname}${nextUrl.search}${nextUrl.hash}`,
  )
  return behavior
}
