import { HeroOverlay } from './HeroOverlay.jsx'
import { CakeControls } from './CakeControls.jsx'

function LetterPreview({ sentences }) {
  return (
    <div className="letter-preview">
      {sentences.slice(0, 3).map((sentence) => (
        <p key={sentence}>{sentence}</p>
      ))}
      <p className="muted-copy">+ {sentences.length - 3} câu placeholder trong config</p>
    </div>
  )
}

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
  if (section.id === 'hero') {
    return (
      <section
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

  return (
    <section
      className={section.id === 'cake' ? 'story-section cake-story-section' : 'story-section'}
      id={section.id}
      data-scene={section.sceneModule}
      tabIndex="-1"
    >
      <div className={section.id === 'cake' ? 'section-card cake-copy-panel' : 'section-card'}>
        <div className="section-heading">
          <span className="section-number">0{index}</span>
          <span className="section-icon" aria-hidden="true">
            {section.icon}
          </span>
        </div>

        <p className="eyebrow">{section.eyebrow}</p>
        <h1>{section.title.replace('{recipient}', recipient.displayName)}</h1>
        <p className="section-description">{section.description}</p>

        {section.id === 'letter' && <LetterPreview sentences={section.placeholderSentences} />}
        {section.id === 'gallery' && <GalleryPreview itemCount={section.items.length} />}
        {section.id === 'cake' && <CakeControls copy={section.cakeCopy} />}

        <p className="phase-note">{section.phaseNote}</p>
      </div>
    </section>
  )
}
