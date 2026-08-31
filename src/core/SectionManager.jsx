import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { SectionManagerContext } from './SectionManagerContext.js'

const TRANSITION_START = 0.42
const TRANSITION_END = 0.58

function clamp(value, minimum = 0, maximum = 1) {
  return Math.min(maximum, Math.max(minimum, value))
}

function createSectionState(sectionIds, activeSectionId, transition) {
  return Object.fromEntries(sectionIds.map((sectionId) => {
    let state = sectionId === activeSectionId ? 'active' : 'hidden'
    let presence = sectionId === activeSectionId ? 1 : 0
    if (transition?.from === sectionId) {
      state = activeSectionId === sectionId ? 'active' : 'leaving'
      presence = 1 - transition.progress
    } else if (transition?.to === sectionId) {
      state = activeSectionId === sectionId ? 'active' : 'entering'
      presence = transition.progress
    }
    return [sectionId, { presence, state }]
  }))
}

function calculateSectionSnapshot({
  introActive = false,
  layouts,
  previousScrollY = 0,
  scrollY = 0,
  sectionIds,
  viewportHeight = 1,
}) {
  const direction = scrollY > previousScrollY ? 'forward' : scrollY < previousScrollY ? 'backward' : 'idle'
  const sectionProgress = Object.fromEntries(layouts.map(({ height, id, top }) => [
    id,
    clamp((viewportHeight - (top - scrollY)) / (viewportHeight + height)),
  ]))

  if (introActive || layouts.length === 0) {
    return {
      activeSectionId: introActive ? 'intro' : null,
      direction,
      presentSectionIds: [],
      sectionProgress,
      sectionState: createSectionState(sectionIds, null, null),
      transition: null,
    }
  }

  const anchor = scrollY + viewportHeight * 0.5
  const firstCenterAfterAnchor = layouts.findIndex(({ center }) => center >= anchor)
  let lowerIndex = firstCenterAfterAnchor === -1
    ? layouts.length - 1
    : Math.max(0, firstCenterAfterAnchor - 1)

  const lower = layouts[lowerIndex]
  const upper = layouts[Math.min(lowerIndex + 1, layouts.length - 1)]
  const hasPair = lower.id !== upper.id
  const segmentProgress = hasPair
    ? clamp((anchor - lower.center) / Math.max(1, upper.center - lower.center))
    : 0
  const activeSectionId = hasPair && segmentProgress >= 0.5 ? upper.id : lower.id
  const isTransitioning = hasPair
    && segmentProgress >= TRANSITION_START
    && segmentProgress <= TRANSITION_END
  const transition = isTransitioning
    ? {
        from: lower.id,
        progress: clamp((segmentProgress - TRANSITION_START) / (TRANSITION_END - TRANSITION_START)),
        to: upper.id,
      }
    : null
  const presentSectionIds = transition ? [transition.from, transition.to] : [activeSectionId]

  return {
    activeSectionId,
    direction,
    presentSectionIds,
    sectionProgress,
    sectionState: createSectionState(sectionIds, activeSectionId, transition),
    transition,
  }
}

function snapshotsMatch(previous, next) {
  if (!previous || previous.activeSectionId !== next.activeSectionId) return false
  if (previous.direction !== next.direction) return false
  if (previous.presentSectionIds.join('|') !== next.presentSectionIds.join('|')) return false
  if (Boolean(previous.transition) !== Boolean(next.transition)) return false
  if (previous.transition && Math.abs(previous.transition.progress - next.transition.progress) > 0.002) return false
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
  const [snapshot, setSnapshot] = useState(() => calculateSectionSnapshot({
    introActive,
    layouts: [],
    scrollY: window.scrollY,
    sectionIds,
    viewportHeight: window.innerHeight,
  }))

  const updateSnapshot = useCallback(() => {
    frameIdRef.current = null
    const scrollY = window.scrollY
    const layouts = sectionIds
      .map((id) => document.getElementById(id))
      .filter(Boolean)
      .map((element) => {
        const rect = element.getBoundingClientRect()
        const top = rect.top + scrollY
        return { center: top + rect.height * 0.5, height: rect.height, id: element.id, top }
      })
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
    setSnapshot((current) => snapshotsMatch(current, next) ? current : next)
  }, [sectionIds])

  const refresh = useCallback(() => {
    if (frameIdRef.current !== null) return
    frameIdRef.current = window.requestAnimationFrame(updateSnapshot)
  }, [updateSnapshot])

  const handleScroll = useCallback(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      if (frameIdRef.current !== null) window.cancelAnimationFrame(frameIdRef.current)
      updateSnapshot()
      return
    }
    refresh()
  }, [refresh, updateSnapshot])

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
  }), [refresh])

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
    sectionIds.forEach((sectionId) => {
      const element = document.getElementById(sectionId)
      if (!element) return
      const sectionState = snapshot.sectionState[sectionId] ?? { presence: 0, state: 'hidden' }
      const isInteractive = sectionState.state === 'active'
      element.dataset.sectionState = sectionState.state
      element.style.setProperty('--section-presence', sectionState.presence.toFixed(4))
      element.setAttribute('aria-hidden', String(!isInteractive))
      element.inert = !isInteractive
      if (!isInteractive && element.contains(document.activeElement)) {
        document.getElementById(snapshot.activeSectionId)?.focus({ preventScroll: true })
      }
    })
    document.documentElement.dataset.activeSection = snapshot.activeSectionId ?? 'none'
    document.documentElement.dataset.scrollDirection = snapshot.direction
    onSnapshotChange?.(snapshot)
  }, [onSnapshotChange, sectionIds, snapshot])

  return (
    <SectionManagerContext.Provider value={snapshot}>
      {children}
    </SectionManagerContext.Provider>
  )
}
