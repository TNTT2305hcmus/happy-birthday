export function HeroFallbackFairy() {
  return (
    <div className="hero-fallback-fairy" aria-hidden="true">
      <span className="fallback-sparkle fallback-sparkle-one">✦</span>
      <span className="fallback-sparkle fallback-sparkle-two">✧</span>
      <span className="fallback-sparkle fallback-sparkle-three">·</span>

      <span className="fallback-wing fallback-wing-left" />
      <span className="fallback-wing fallback-wing-right" />
      <span className="fallback-wing fallback-wing-lower-left" />
      <span className="fallback-wing fallback-wing-lower-right" />

      <div className="fallback-fairy-body">
        <span className="fallback-hat-cone" />
        <span className="fallback-hat-brim" />
        <span className="fallback-hat-star">★</span>

        <div className="fallback-fairy-head">
          <span className="fallback-hair" />
          <span className="fallback-face">
            <i className="fallback-eye fallback-eye-left" />
            <i className="fallback-eye fallback-eye-right" />
            <i className="fallback-cheek fallback-cheek-left" />
            <i className="fallback-cheek fallback-cheek-right" />
            <i className="fallback-smile" />
          </span>
        </div>

        <span className="fallback-bodice" />
        <span className="fallback-skirt" />
        <span className="fallback-belt" />
        <span className="fallback-arm fallback-arm-left" />
        <span className="fallback-arm fallback-arm-right" />
        <span className="fallback-leg fallback-leg-left" />
        <span className="fallback-leg fallback-leg-right" />
      </div>

      <div className="fallback-wand">
        <span className="fallback-wand-star">★</span>
        <span className="fallback-wand-stem" />
      </div>
    </div>
  )
}
