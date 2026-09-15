import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const [componentSource, storySource, stylesheet] = await Promise.all([
  readFile(new URL('../src/components/LetterInteractionSurface.jsx', import.meta.url), 'utf8'),
  readFile(new URL('../src/components/StorySection.jsx', import.meta.url), 'utf8'),
  readFile(new URL('../src/styles/global.css', import.meta.url), 'utf8'),
])

assert.ok(storySource.includes('<LetterInteractionSurface'))
assert.ok(storySource.includes('sentences={section.placeholderSentences}'))
assert.ok(!storySource.includes('<LetterControls'))
assert.ok(componentSource.includes('LETTER_STATE_EVENT'))
assert.ok(componentSource.includes('requestLetterToggle(nextOpen)'))
assert.ok(componentSource.includes("stage.state === 'active' && stage.presence >= 0.999"))
assert.ok(componentSource.includes('<button'))
assert.ok(componentSource.includes('aria-expanded={letterState.isOpen}'))
assert.ok(componentSource.includes('aria-label={letterState.isOpen ? copy.closeLabel : copy.openLabel}'))
assert.ok(componentSource.includes('disabled={!isInteractive}'))
assert.ok(componentSource.includes('tabIndex={isInteractive ? 0 : -1}'))
assert.ok(componentSource.includes('type="button"'))
assert.ok(!componentSource.includes('onKeyDown='))
assert.ok(!componentSource.includes('onPointerUp='))

for (const declaration of [
  '.letter-interaction-surface',
  'min-width: 44px',
  'min-height: 44px',
  'touch-action: manipulation',
  '.letter-interaction-surface:focus-visible',
]) assert.ok(stylesheet.includes(declaration), 'Missing interaction CSS: ' + declaration)

console.log('Refinement R6.2 semantic interaction verification passed')
