export function getRequestedSection(sections, search = window.location.search) {
  const requestedId = new URLSearchParams(search).get('section')

  if (!requestedId || requestedId === 'all') {
    return null
  }

  return sections.some(({ id }) => id === requestedId) ? requestedId : null
}
