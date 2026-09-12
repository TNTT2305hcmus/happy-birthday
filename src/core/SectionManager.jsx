import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { SectionManagerContext } from './SectionManagerContext.js'
import { calculateSectionSnapshot } from './sectionSnapshot.js'

function measureSectionLayout(element) {
  let top = 0
  let current = element
  while (current) {
    top += current.offsetTop
    current = current.offsetParent
  }
  const height = element.offsetHeight
  return { center: top + height * 0.5, height, id: element.id, top }
}

function snapshotsMatch(previous, next) {
  if (!previous || previous.activeSectionId !== next.activeSectionId) return false
  if (previous.direction !== next.direction) return false
  if (previous.presentSectionIds.join('|') !== next.presentSectionIds.join('|')) return false
  if (previous.sceneSectionIds.join('|') !== next.sceneSectionIds.join('|')) return false
  if (Boolean(previous.transition) !== Boolean(next.transition)) return false
  if (previous.transition && Math.abs(previous.transition.progress - next.transition.progress) > 0.002) return false
  if (Object.keys(next.scenePresence).some((sectionId) => (
    Math.abs((previous.scenePresence[sectionId] ?? 0) - next.scenePresence[sectionId]) > 0.002
  ))) return false
  return Object.keys(next.sectionProgress).every((sectionId) => (
    Math.abs((previous.sectionProgress[sectionId] ?? 0) - next.sectionProgress[sectionId]) <= 0.002
  ))
}

export function SectionManagerProvider({
  children,
  introActive = false,
  onManagerReady,
  onSnapshotChange,
  sectionIds,
}) {
  const previousScrollYRef = useRef(window.scrollY)
  const frameIdRef = useRef(null)
  const introActiveRef = useRef(introActive)
  const scrollTriggerRef = useRef(null)
  const autoScrollRef = useRef(null)
  const [snapshot, setSnapshot] = useState(() => calculateSectionSnapshot({
    introActive,
    layouts: [],
    scrollY: window.scrollY,
    sectionIds,
    viewportHeight: window.innerHeight,
  }))

  const applySnapshot = useCallback((nextSnapshot) => {
    sectionIds.forEach((sectionId) => {
      const element = document.getElementById(sectionId)
      if (!element) return
      const sectionState = nextSnapshot.sectionState[sectionId] ?? { presence: 0, state: 'hidden' }
      const isInteractive = sectionState.state === 'active'
      element.dataset.sectionState = sectionState.state
      const scenePresence = nextSnapshot.scenePresence[sectionId] ?? 0
      element.style.setProperty('--section-presence', sectionState.presence.toFixed(4))
      element.style.setProperty('--scene-presence', scenePresence.toFixed(4))
      element.dataset.sceneRevealed = String(scenePresence > 0)
      element.setAttribute('aria-hidden', String(!isInteractive))
      element.inert = !isInteractive
      if (!isInteractive && element.contains(document.activeElement)) {
        document.getElementById(nextSnapshot.activeSectionId)?.focus({ preventScroll: true })
      }
    })
    document.documentElement.dataset.activeSection = nextSnapshot.activeSectionId ?? 'none'
    document.documentElement.dataset.scrollDirection = nextSnapshot.direction
    onSnapshotChange?.(nextSnapshot)
  }, [onSnapshotChange, sectionIds])

  const updateSnapshot = useCallback(() => {
    frameIdRef.current = null
    const scrollY = window.scrollY
    const layouts = autoScrollRef.current?.layouts ?? sectionIds
      .map((id) => document.getElementById(id))
      .filter(Boolean)
      .map(measureSectionLayout)
      .sort((a, b) => a.top - b.top)
    const next = calculateSectionSnapshot({
      introActive: introActiveRef.current,
      layouts,
      previousScrollY: previousScrollYRef.current,
      scrollY,
      sectionIds,
      viewportHeight: window.innerHeight,
    })
    previousScrollYRef.current = scrollY
    if (autoScrollRef.current) {
      autoScrollRef.current.latestSnapshot = next
      applySnapshot(next)
      return
    }
    setSnapshot((current) => snapshotsMatch(current, next) ? current : next)
  }, [applySnapshot, sectionIds])

  const refresh = useCallback(() => {
    if (frameIdRef.current !== null) return
    frameIdRef.current = window.requestAnimationFrame(updateSnapshot)
  }, [updateSnapshot])

  const handleScroll = useCallback(() => {
    if (autoScrollRef.current) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      if (frameIdRef.current !== null) window.cancelAnimationFrame(frameIdRef.current)
      updateSnapshot()
      return
    }
    refresh()
  }, [refresh, updateSnapshot])

  const startAutoScrollToSection = useCallback((sectionId, { durationMs = 1_550 } = {}) => {
    const targetElement = document.getElementById(sectionId)
    if (!targetElement) return false

    const previous = autoScrollRef.current
    if (previous) {
      window.cancelAnimationFrame(previous.frameId)
      document.documentElement.style.scrollBehavior = previous.previousScrollBehavior
    }

    const layouts = sectionIds
      .map((id) => document.getElementById(id))
      .filter(Boolean)
      .map(measureSectionLayout)
      .sort((a, b) => a.top - b.top)
    const layout = layouts.find(({ id }) => id === sectionId)
    if (!layout) return false
    const maximumScrollY = Math.max(
      0,
      document.documentElement.scrollHeight - window.innerHeight,
    )
    const targetScrollY = Math.min(
      maximumScrollY,
      Math.max(0, layout.center - window.innerHeight * 0.5),
    )
    const startScrollY = window.scrollY
    const safeDurationMs = Math.max(1, Number(durationMs) || 1_550)
    const root = document.documentElement
    const state = {
      durationMs: safeDurationMs,
      elapsedMs: 0,
      frameId: null,
      lastTimestamp: null,
      layouts,
      snapshotFrame: 0,
      previousScrollBehavior: root.style.scrollBehavior,
      sectionId,
      startScrollY,
      targetScrollY,
    }
    autoScrollRef.current = state
    root.style.scrollBehavior = 'auto'
    root.dataset.journeyScroll = 'running'
    root.dataset.journeyScrollTarget = sectionId

    const step = (timestamp) => {
      if (autoScrollRef.current !== state) return
      if (state.lastTimestamp !== null) {
        state.elapsedMs += Math.min(100, timestamp - state.lastTimestamp)
      }
      state.lastTimestamp = timestamp
      const progress = Math.min(1, state.elapsedMs / state.durationMs)
      const eased = progress * progress * (3 - 2 * progress)
      state.snapshotFrame += 1
      if (progress >= 1 || state.snapshotFrame % 2 === 0) {
        window.scrollTo(0, state.startScrollY + (state.targetScrollY - state.startScrollY) * eased)
        refresh()
      }

      if (progress < 1) {
        state.frameId = window.requestAnimationFrame(step)
        return
      }

      root.style.scrollBehavior = state.previousScrollBehavior
      root.dataset.journeyScroll = 'complete'
      autoScrollRef.current = null
      refresh()
    }

    state.frameId = window.requestAnimationFrame(step)
    return true
  }, [refresh, sectionIds])

  const manager = useMemo(() => ({
    connectScrollTrigger(ScrollTrigger) {
      scrollTriggerRef.current?.kill()
      scrollTriggerRef.current = ScrollTrigger.create({
        end: 'max',
        invalidateOnRefresh: true,
        onRefresh: refresh,
        onUpdate: refresh,
        start: 0,
      })
      refresh()
      return () => {
        scrollTriggerRef.current?.kill()
        scrollTriggerRef.current = null
      }
    },
    refresh,
    startAutoScrollToSection,
  }), [refresh, startAutoScrollToSection])

  useLayoutEffect(() => {
    refresh()
    window.addEventListener('hashchange', refresh)
    window.addEventListener('pageshow', refresh)
    window.addEventListener('resize', refresh, { passive: true })
    window.addEventListener('scroll', handleScroll, { passive: true })
    window.addEventListener('twinkle:section-refresh', updateSnapshot)
    document.addEventListener('scroll', handleScroll, { passive: true })
    return () => {
      window.removeEventListener('hashchange', refresh)
      window.removeEventListener('pageshow', refresh)
      window.removeEventListener('resize', refresh)
      window.removeEventListener('scroll', handleScroll)
      window.removeEventListener('twinkle:section-refresh', updateSnapshot)
      document.removeEventListener('scroll', handleScroll)
      if (frameIdRef.current !== null) {
        window.cancelAnimationFrame(frameIdRef.current)
        frameIdRef.current = null
      }
      scrollTriggerRef.current?.kill()
      const autoScroll = autoScrollRef.current
      if (autoScroll) {
        window.cancelAnimationFrame(autoScroll.frameId)
        document.documentElement.style.scrollBehavior = autoScroll.previousScrollBehavior
        autoScrollRef.current = null
      }
      delete document.documentElement.dataset.journeyScroll
      delete document.documentElement.dataset.journeyScrollTarget
    }
  }, [handleScroll, refresh, updateSnapshot])

  useEffect(() => {
    introActiveRef.current = introActive
    refresh()
  }, [introActive, refresh])

  useEffect(() => {
    onManagerReady?.(manager)
    return () => onManagerReady?.(null)
  }, [manager, onManagerReady])

  useLayoutEffect(() => {
    applySnapshot(snapshot)
  }, [applySnapshot, snapshot])

  return (
    <SectionManagerContext.Provider value={snapshot}>
      {children}
    </SectionManagerContext.Provider>
  )
}
