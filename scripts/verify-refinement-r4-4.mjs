import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { birthdayContent } from '../src/content/config.js'

const [storySource, controlsSource, stylesheet] = await Promise.all([
  readFile(new URL('../src/components/StorySection.jsx', import.meta.url), 'utf8'),
  readFile(new URL('../src/components/CakeControls.jsx', import.meta.url), 'utf8'),
  readFile(new URL('../src/styles/cake-r44.css', import.meta.url), 'utf8'),
])

const cake = birthdayContent.sections.find(({ id }) => id === 'cake')
assert.ok(cake)
assert.equal(cake.title, 'Một điều ước nhỏ')
assert.equal(cake.cakeCopy.wishForm.submitLabel, 'Gửi điều ước')

assert.ok(storySource.includes('<h1 className="cake-card-title">{section.title}</h1>'))
assert.ok(storySource.includes("section.id !== 'cake'"))
assert.ok(storySource.includes('phase-note'))
assert.ok(controlsSource.includes('<WishInput'))
assert.ok(controlsSource.includes('className="cake-mic-button"'))
assert.ok(controlsSource.includes('copy.micFallback[micFailure]'))
assert.ok(controlsSource.includes('data-mic-failure={micFailure}'))

assert.equal(controlsSource.includes('className="cake-blow-button"'), false)
assert.ok(stylesheet.includes('.cake-card-title'))
assert.ok(stylesheet.includes('.cake-controls .wish-form-status'))
assert.ok(stylesheet.includes('.cake-controls .cake-status'))

console.log('R4.4 passed: Cake card chrome is reduced; title, wish submit, microphone and config-backed error states are preserved.')
