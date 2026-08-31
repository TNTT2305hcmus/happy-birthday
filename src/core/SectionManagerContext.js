import { createContext, useContext } from 'react'

export const SectionManagerContext = createContext(null)

export function useSectionStage(sectionId) {
  const snapshot = useContext(SectionManagerContext)
  if (!snapshot) throw new Error('useSectionStage must be used inside SectionManagerProvider.')
  return snapshot.sectionState[sectionId] ?? { presence: 0, state: 'hidden' }
}
