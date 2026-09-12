import { CakeVisualStage } from './CakeVisualStage.jsx'
import { HeroOverlay } from './HeroOverlay.jsx'
import { CakeControls } from './CakeControls.jsx'
import { LetterControls } from './LetterControls.jsx'
import { useSectionStage } from '../core/SectionManagerContext.js'

function GalleryPreview({ itemCount }) {
  return (
    <div className="gallery-preview" aria-label={`${itemCount} ảnh đang chờ dựng gallery`}>
      {[1, 2, 3, 4].map((item) => (
        <span key={item}>0{item}</span>
      ))}
      <strong>+{itemCount - 4}</strong>
    </div>
  )
}

export function StorySection({ index, recipient, relationship, section }) {
  const sectionStage = useSectionStage(section.id)

  if (section.id === 'hero') {
    return (
      <section
        data-section-state={sectionStage.state}
        className="story-section hero-story-section"
        id={section.id}
        data-scene={section.sceneModule}
        tabIndex="-1"
      >
        <HeroOverlay
          recipient={recipient}
          relationship={relationship}
          section={section}
        />
      </section>
    )
  }

  const sectionClassName = section.id === 'cake'
    ? 'story-section cake-story-section'
    : section.id === 'letter'
      ? 'story-section letter-story-section'
      : 'story-section'
  const cardClassName = section.id === 'cake'
    ? 'section-card cake-copy-panel'
    : section.id === 'letter'
      ? 'section-card letter-copy-panel'
      : 'section-card'

  return (
    <section
      data-section-state={sectionStage.state}
      className={sectionClassName}
      id={section.id}
      data-scene={section.sceneModule}
      tabIndex="-1"
    >
      {section.id === 'cake' && <CakeVisualStage copy={section.cakeCopy} />}
      <div className={cardClassName}>
        {section.id === 'cake' ? (
          <h1 className="cake-card-title">{section.title}</h1>
        ) : (
          <>
            <div className="section-heading">
              <span className="section-number">0{index}</span>
              <span className="section-icon" aria-hidden="true">
                {section.icon}
              </span>
            </div>

            <p className="eyebrow">{section.eyebrow}</p>
            <h1>{section.title.replace('{recipient}', recipient.displayName)}</h1>
            <p className="section-description">{section.description}</p>
          </>
        )}

        {section.id === 'letter' && (
          <LetterControls
            copy={section.letterCopy}
            sentences={section.placeholderSentences}
          />
        )}
        {section.id === 'gallery' && <GalleryPreview itemCount={section.items.length} />}
        {section.id === 'cake' && <CakeControls copy={section.cakeCopy} />}

        {section.id !== 'cake' && <p className="phase-note">{section.phaseNote}</p>}
      </div>
    </section>
  )
}
