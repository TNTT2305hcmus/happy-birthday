const TRANSITION_START = 0.42
const TRANSITION_END = 0.58
export const CAKE_SCENE_REVEAL_START = 0.65
export const CAKE_SCENE_REVEAL_END = 0.8

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

function createScenePresence(sectionIds, sectionState, activeSectionId, transition) {
  const scenePresence = Object.fromEntries(sectionIds.map((sectionId) => [
    sectionId,
    sectionState[sectionId]?.presence ?? 0,
  ]))
  if (transition?.from === 'hero' && transition?.to === 'cake') {
    scenePresence.cake = clamp(
      (transition.progress - CAKE_SCENE_REVEAL_START)
        / (CAKE_SCENE_REVEAL_END - CAKE_SCENE_REVEAL_START),
    )
  } else if (activeSectionId !== 'cake' && transition?.from !== 'cake' && transition?.to !== 'cake') {
    scenePresence.cake = 0
  }
  return scenePresence
}

export function calculateSectionSnapshot({
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
    const sectionState = createSectionState(sectionIds, null, null)
    const scenePresence = createScenePresence(sectionIds, sectionState, null, null)
    return {
      activeSectionId: introActive ? 'intro' : null,
      direction,
      presentSectionIds: [],
      scenePresence,
      sceneSectionIds: [],
      sectionProgress,
      sectionState,
      transition: null,
    }
  }
  const anchor = scrollY + viewportHeight * 0.5
  const firstCenterAfterAnchor = layouts.findIndex(({ center }) => center >= anchor)
  const lowerIndex = firstCenterAfterAnchor === -1 ? layouts.length - 1 : Math.max(0, firstCenterAfterAnchor - 1)
  const lower = layouts[lowerIndex]
  const upper = layouts[Math.min(lowerIndex + 1, layouts.length - 1)]
  const hasPair = lower.id !== upper.id
  const segmentProgress = hasPair ? clamp((anchor - lower.center) / Math.max(1, upper.center - lower.center)) : 0
  const activeSectionId = hasPair && segmentProgress >= 0.5 ? upper.id : lower.id
  const isTransitioning = hasPair && segmentProgress >= TRANSITION_START && segmentProgress <= TRANSITION_END
  const transition = isTransitioning
    ? {
        from: lower.id,
        progress: clamp((segmentProgress - TRANSITION_START) / (TRANSITION_END - TRANSITION_START)),
        to: upper.id,
      }
    : null
  const presentSectionIds = transition ? [transition.from, transition.to] : [activeSectionId]
  const sectionState = createSectionState(sectionIds, activeSectionId, transition)
  const scenePresence = createScenePresence(sectionIds, sectionState, activeSectionId, transition)
  const sceneSectionIds = sectionIds.filter((sectionId) => scenePresence[sectionId] > 0)
  return {
    activeSectionId,
    direction,
    presentSectionIds,
    scenePresence,
    sceneSectionIds,
    sectionProgress,
    sectionState,
    transition,
  }
}