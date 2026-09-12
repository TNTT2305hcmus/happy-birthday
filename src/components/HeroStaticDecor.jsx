export function HeroStaticDecor() {
  return (
    <div className='hero-fallback-static-decor' aria-hidden='true'>
      {[1, 2, 3, 4].map((item) => (
        <span className={`hero-fallback-balloon hero-fallback-balloon-${item}`} key={item}><i /></span>
      ))}
    </div>
  )
}
