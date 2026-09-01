import { useCallback, useEffect, useRef, useState } from 'react'
import { DevSectionNav } from './components/DevSectionNav.jsx'
import { ExperienceGate } from './components/ExperienceGate.jsx'
import { PerformanceDebugHud } from './components/PerformanceDebugHud.jsx'
import { RuntimeNotices } from './components/RuntimeNotices.jsx'
import { StorySection } from './components/StorySection.jsx'
import { birthdayContent } from './content/config.js'
import { getRequestedSection } from './core/demoMode.js'
import { SectionManagerProvider } from './core/SectionManager.jsx'
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
  const sectionIds = visibleSections.map(({ id }) => id)
  const sceneManagerRef = useRef(null)
  const sectionManagerRef = useRef(null)
  const sectionSnapshotRef = useRef(null)
  const [introActive, setIntroActive] = useState(shouldShowExperience)

  const handleSectionManagerReady = useCallback((manager) => {
    sectionManagerRef.current = manager
  }, [])

  const handleSectionSnapshot = useCallback((snapshot) => {
    sectionSnapshotRef.current = snapshot
    sceneManagerRef.current?.setSectionSnapshot(snapshot)
  }, [])

  const handleExperienceStageChange = useCallback((stage) => {
    setIntroActive(stage !== 'hero-reveal' && stage !== 'complete')
  }, [])

  useEffect(() => {
    const capabilities = detectRuntimeCapabilities()
    const clearRuntimeAttributes = applyRuntimeAttributes(capabilities)
    const canvas = document.getElementById('webgl-canvas')
    let sceneManager = null
    let disconnectScrollTrigger = null
    let isCancelled = false

    async function startWebGL() {
      if (!capabilities.webglAvailable) return

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

        if (isCancelled) return

        sceneManager = new SceneManager({
          canvas,
          qualityMode: capabilities.initialQualityMode,
          reducedMotion: capabilities.reducedMotion,
        })
        sceneManager.addSceneModule(new HeroScene(), { sectionId: 'hero' })
        sceneManager.addSceneModule(new CakeScene(), { sectionId: 'cake' })
        sceneManager.addSceneModule(new LetterScene(), { sectionId: 'letter' })
        sceneManagerRef.current = sceneManager
        sceneManager.setSectionSnapshot(sectionSnapshotRef.current ?? {})

        gsap.registerPlugin(ScrollTrigger)
        disconnectScrollTrigger = sectionManagerRef.current?.connectScrollTrigger(ScrollTrigger)

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
      disconnectScrollTrigger?.()
      if (sceneManagerRef.current === sceneManager) sceneManagerRef.current = null
      sceneManager?.dispose()
      clearRuntimeAttributes()
    }
  }, [])

  return (
    <SectionManagerProvider
      introActive={introActive}
      onManagerReady={handleSectionManagerReady}
      onSnapshotChange={handleSectionSnapshot}
      sectionIds={sectionIds}
    >
      <div className='app-shell' data-demo-section={requestedSection ?? 'all'}>
        <a className='skip-link' href='#story-content'>
          Đi tới nội dung chính
        </a>

        <canvas id='webgl-canvas' aria-hidden='true' />
        <div className='fallback-sky' aria-hidden='true' />

        <RuntimeNotices />
        {showPerformanceDebug && <PerformanceDebugHud />}

        {shouldShowExperience && (
          <ExperienceGate
            content={birthdayContent}
            initialStage={initialExperienceStage}
            onStageChange={handleExperienceStageChange}
          />
        )}

        <DevSectionNav
          activeSection={requestedSection}
          sections={birthdayContent.sections}
        />

        {requestedSection && (
          <aside className='demo-banner' aria-label='Chế độ kiểm thử section'>
            Demo độc lập: <strong>{requestedSection}</strong>
            <a href='/'>Xem toàn bộ hành trình</a>
          </aside>
        )}

        <main id='story-content'>
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
    </SectionManagerProvider>
  )
}

export default App
