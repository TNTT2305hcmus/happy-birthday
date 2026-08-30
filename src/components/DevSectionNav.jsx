export function DevSectionNav({ activeSection, sections }) {
  return (
    <nav className="dev-nav" aria-label="Điều hướng demo section">
      <span>Phase 1 shell</span>
      <a className={activeSection ? '' : 'is-active'} href="/">
        All
      </a>
      {sections.map(({ id, shortLabel }) => (
        <a
          className={activeSection === id ? 'is-active' : ''}
          href={`/?section=${id}`}
          key={id}
        >
          {shortLabel}
        </a>
      ))}
    </nav>
  )
}
