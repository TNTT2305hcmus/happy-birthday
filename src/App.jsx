import { useEffect } from 'react'
import { DevSectionNav } from './components/DevSectionNav.jsx'
import { ExperienceGate } from './components/ExperienceGate.jsx'
import { PerformanceDebugHud } from './components/PerformanceDebugHud.jsx'
import { RuntimeNotices } from './components/RuntimeNotices.jsx'
import { StorySection } from './components/StorySection.jsx'
import { birthdayContent } from './content/config.js'
import { getRequestedSection } from './core/demoMode.js'
import {
  applyRuntimeAttributes,
  detectRuntimeCapabilities,
} from './core/runtimeCapabilities.js'

function App() {
  const requestedSection = getRequestedSection(birthdayContent.sections)
  const experienceParams = new URLSearchParams(window.location.search)
  const experienceDisabled = experienceParams.get('experience') === 'off'
  const showPerformanceDebug = experienceParams.get('debug') === 'performance'
  const shouldShowExperience = !experienceDisabled && (!requestedSection || requestedSection === 'intro')
  const initialExperienceStage = experienceParams.get('stage') === 'landing' ? 'landing' : 'hacker'
  const visibleSections = requestedSection
    ? birthdayContent.sections.filter(({ id }) => id === requestedSection)
    : birthdayContent.sections.filter(({ id }) => id !== 'intro')

  useEffect(() => {
    const capabilities = detectRuntimeCapabilities()
    const clearRuntimeAttributes = applyRuntimeAttributes(capabilities)
    const canvas = document.getElementById('webgl-canvas')
    let sceneManager = null
    let heroTimeline = null
    let heroScrollTrigger = null
    let cakeScrollTrigger = null
    let letterScrollTrigger = null
    let isCancelled = false

    async function startWebGL() {
      if (!capabilities.webglAvailable) {
        return
      }

      try {
        const [
          { PerformanceMonitor },
          { SceneManager },
          { HeroScene },
          { CakeScene },
          { LetterScene },
          { gsap },
          { ScrollTrigger },
        ] = await Promise.all([
          import('./core/PerformanceMonitor.js'),
          import('./core/SceneManager.js'),
          import('./scenes/HeroScene.js'),
          import('./scenes/CakeScene.js'),
          import('./scenes/LetterScene.js'),
          import('gsap'),
          import('gsap/ScrollTrigger'),
        ])

        if (isCancelled) {
          return
        }

        sceneManager = new SceneManager({
          canvas,
          qualityMode: capabilities.initialQualityMode,
          reducedMotion: capabilities.reducedMotion,
        })
        const heroScene = new HeroScene()
        const cakeScene = new CakeScene()
        const letterScene = new LetterScene()
        sceneManager.addSceneModule(heroScene)
        sceneManager.addSceneModule(cakeScene)
        sceneManager.addSceneModule(letterScene)

        const heroSection = document.getElementById('hero')
        heroScene.setActive(Boolean(heroSection))

        if (heroSection) {
          gsap.registerPlugin(ScrollTrigger)
          const scrollTriggerOptions = {
            end: 'bottom top',
            onToggle: ({ isActive }) => heroScene.setActive(isActive),
            onUpdate: ({ progress }) => heroScene.setScrollProgress(progress),
            start: 'top bottom',
            trigger: heroSection,
          }

          if (capabilities.reducedMotion) {
            heroScrollTrigger = ScrollTrigger.create(scrollTriggerOptions)
          } else {
            heroTimeline = gsap.timeline({
              defaults: { ease: 'none' },
              scrollTrigger: {
                ...scrollTriggerOptions,
                scrub: 0.35,
              },
            })
            heroTimeline
              .fromTo(
                heroSection.querySelector('.hero-copy-panel'),
                { opacity: 0.45, y: 28 },
                { duration: 0.45, opacity: 1, y: 0 },
              )
              .to(
                heroSection.querySelector('.hero-copy-panel'),
                { duration: 0.55, opacity: 0.68, y: -22 },
              )
              .fromTo(
                heroSection.querySelectorAll('.hero-orbit-star'),
                { opacity: 0, scale: 0.45 },
                { duration: 0.32, opacity: 1, scale: 1, stagger: 0.05 },
                0.1,
              )
              .to(
                heroSection.querySelectorAll('.hero-orbit-star'),
                { duration: 0.25, opacity: 0, scale: 1.35 },
                0.75,
              )
            heroScrollTrigger = heroTimeline.scrollTrigger
          }

          heroScene.setActive(heroScrollTrigger.isActive)
          heroScene.setScrollProgress(heroScrollTrigger.progress)
        }

        const cakeSection = document.getElementById('cake')
        cakeScene.setActive(false)

        if (cakeSection) {
          gsap.registerPlugin(ScrollTrigger)
          cakeScrollTrigger = ScrollTrigger.create({
            end: 'bottom top',
            onToggle: ({ isActive }) => {
              cakeScene.setActive(isActive)
              if (isActive) {
                heroScene.setActive(false)
              } else if (heroScrollTrigger && !letterScrollTrigger?.isActive) {
                heroScene.setActive(heroScrollTrigger.isActive)
              }
            },
            onUpdate: ({ progress }) => cakeScene.setScrollProgress(progress),
            start: 'top 55%',
            trigger: cakeSection,
          })
          cakeScene.setActive(cakeScrollTrigger.isActive)
          cakeScene.setScrollProgress(cakeScrollTrigger.progress)
          if (cakeScrollTrigger.isActive) heroScene.setActive(false)
        }

        const letterSection = document.getElementById('letter')
        letterScene.setActive(false)

        if (letterSection) {
          gsap.registerPlugin(ScrollTrigger)
          letterScrollTrigger = ScrollTrigger.create({
            end: 'bottom top',
            onToggle: ({ isActive }) => {
              letterScene.setActive(isActive)
              if (isActive) {
                heroScene.setActive(false)
                cakeScene.setActive(false)
              } else if (cakeScrollTrigger?.isActive) {
                cakeScene.setActive(true)
              } else if (heroScrollTrigger?.isActive) {
                heroScene.setActive(true)
              }
            },
            onUpdate: ({ progress }) => letterScene.setScrollProgress(progress),
            start: 'top 55%',
            trigger: letterSection,
          })
          letterScene.setActive(letterScrollTrigger.isActive)
          letterScene.setScrollProgress(letterScrollTrigger.progress)
          if (letterScrollTrigger.isActive) {
            heroScene.setActive(false)
            cakeScene.setActive(false)
          }
        }

        const performanceMonitor = new PerformanceMonitor({
          onSample: ({ fps, shouldEnableLiteMode }) => {
            document.documentElement.dataset.fps = String(fps)

            if (shouldEnableLiteMode && capabilities.forcedQuality !== 'full') {
              sceneManager.setQualityMode('lite')
              document.documentElement.dataset.quality = 'lite'
            }
          },
        })

        sceneManager.addFrameTask(({ timestamp }) => performanceMonitor.recordFrame(timestamp))
        sceneManager.start()
        document.documentElement.dataset.webglReady = 'true'
      } catch (error) {
        console.error('Unable to initialize WebGL. Falling back to CSS.', error)
        document.documentElement.dataset.webgl = 'unavailable'
        document.documentElement.dataset.webglReady = 'fallback'
      }
    }

    startWebGL()

    return () => {
      isCancelled = true
      heroScrollTrigger?.kill()
      cakeScrollTrigger?.kill()
      letterScrollTrigger?.kill()
      heroTimeline?.kill()
      sceneManager?.dispose()
      clearRuntimeAttributes()
    }
  }, [])

  return (
    <div className="app-shell" data-demo-section={requestedSection ?? 'all'}>
      <a className="skip-link" href="#story-content">
        Đi tới nội dung chính
      </a>

      <canvas id="webgl-canvas" aria-hidden="true" />
      <div className="fallback-sky" aria-hidden="true" />

      <RuntimeNotices />
      {showPerformanceDebug && <PerformanceDebugHud />}

      {shouldShowExperience && (
        <ExperienceGate content={birthdayContent} initialStage={initialExperienceStage} />
      )}

      <DevSectionNav
        activeSection={requestedSection}
        sections={birthdayContent.sections}
      />

      {requestedSection && (
        <aside className="demo-banner" aria-label="Chế độ kiểm thử section">
          Demo độc lập: <strong>{requestedSection}</strong>
          <a href="/">Xem toàn bộ hành trình</a>
        </aside>
      )}

      <main id="story-content">
        {visibleSections.map((section) => (
          <StorySection
            key={section.id}
            index={birthdayContent.sections.findIndex(({ id }) => id === section.id)}
            recipient={birthdayContent.recipient}
            relationship={birthdayContent.relationship}
            section={section}
          />
        ))}
      </main>
    </div>
  )
}

export default App
