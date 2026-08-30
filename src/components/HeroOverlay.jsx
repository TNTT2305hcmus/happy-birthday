import { createHeroOverlayModel } from './heroOverlayModel.js'
import { HeroFallbackFairy } from './HeroFallbackFairy.jsx'
import { navigateToStorySection } from './storyNavigation.js'

export function HeroOverlay({ recipient, relationship, section }) {
  const copy = section.heroCopy
  const model = createHeroOverlayModel({ recipient, relationship })

  function handleJourneyStart(event) {
    event.preventDefault()
    navigateToStorySection(copy.ctaTarget)
  }

  return (
    <div className="hero-overlay">
      <div className="hero-copy-panel">
        <div className="hero-date-chip">
          <span aria-hidden="true">✦</span>
          <span>{copy.dateLabel}</span>
          <time dateTime={recipient.celebrationDate}>
            {model.celebrationDate}
          </time>
        </div>

        <p className="hero-eyebrow">{copy.eyebrow}</p>
        <h1 className="hero-title">
          <span className="hero-title-lead">{copy.titleLead}</span>
          <span className="hero-name-shimmer">{model.name}</span>
        </h1>
        <p className="hero-description">{section.description}</p>

        <div className="hero-milestone">
          <div className="hero-milestone-copy">
            <strong>{model.featuredDay}</strong>
            <span>{copy.milestoneSuffix}</span>
          </div>
          <p>{model.motif}</p>
        </div>

        <dl className="hero-stats">
          <div>
            <dt>{copy.ageLabel}</dt>
            <dd>{model.age}</dd>
          </div>
          <div>
            <dt>{copy.relationshipLabel}</dt>
            <dd>{copy.yearsPrefix} {model.yearsTogether} {copy.yearsUnit}</dd>
          </div>
          <div>
            <dt>{copy.birthdayMilestoneLabel}</dt>
            <dd>{model.birthdayDay}</dd>
          </div>
        </dl>

        <div className="hero-footer">
          <p className="hero-day-note">
            <span aria-hidden="true">♡</span>
            {copy.birthdayDayPrefix}{' '}
            <strong>{model.birthdayDay}</strong>{' '}
            {copy.birthdayDaySuffix}
          </p>
          <a
            className="hero-cta"
            href={`#${copy.ctaTarget}`}
            onClick={handleJourneyStart}
          >
            <span>
              <strong>{copy.ctaLabel}</strong>
              <small>{copy.ctaHint}</small>
            </span>
            <span className="hero-cta-icon" aria-hidden="true">✦</span>
          </a>
        </div>
        <p className="hero-phase-note">{section.phaseNote}</p>
      </div>

      <HeroFallbackFairy />
      <span className="hero-orbit-star hero-orbit-star-one" aria-hidden="true">✦</span>
      <span className="hero-orbit-star hero-orbit-star-two" aria-hidden="true">✧</span>
    </div>
  )
}
