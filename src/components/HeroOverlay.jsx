import { createHeroOverlayModel } from './heroOverlayModel.js'
import { HeroFallbackFairy } from './HeroFallbackFairy.jsx'
import { HeroStaticDecor } from './HeroStaticDecor.jsx'

export function HeroOverlay({ recipient, relationship, section }) {
  const copy = section.heroCopy
  const model = createHeroOverlayModel({ copy, recipient, relationship })

  return (
    <div className="hero-overlay">
      <HeroStaticDecor />
      <div className="hero-copy-panel">
        <div className="hero-date-chip">
          <span className="hero-tag-sparkle" aria-hidden="true">✦</span>
          <span>{model.tagLabel}</span>
          <time dateTime={recipient.celebrationDate}>
            {model.tagDateLabel}
          </time>
        </div>

        <h1 className="hero-script-title">
          <span>{model.headlinePrefix}</span>
          {model.headlineName && (
            <span className="hero-title-name">{model.headlineName}</span>
          )}
          <span>{model.headlineSuffix}</span>
        </h1>

        <div className="hero-storyline">
          <p>{model.timelineLead}</p>
          <div className="hero-love-loop" aria-label={model.loveLine}>
            <span className="hero-love-line" aria-hidden="true">
              {model.loveLine}
            </span>
          </div>
        </div>
      </div>

      <HeroFallbackFairy />
      <span className="hero-orbit-star hero-orbit-star-one" aria-hidden="true">✦</span>
      <span className="hero-orbit-star hero-orbit-star-two" aria-hidden="true">✧</span>
    </div>
  )
}
