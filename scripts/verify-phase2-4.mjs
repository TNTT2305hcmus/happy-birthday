import assert from 'node:assert/strict'
import { createHeroOverlayModel } from '../src/components/heroOverlayModel.js'
import { birthdayContent } from '../src/content/config.js'

const heroSection = birthdayContent.sections.find(({ id }) => id === 'hero')
const model = createHeroOverlayModel({
  recipient: birthdayContent.recipient,
  relationship: birthdayContent.relationship,
})

assert.ok(heroSection.heroCopy)
assert.equal(model.name, 'Hiền Lương')
assert.equal(model.age, '21')
assert.equal(model.featuredDay, '1.111')
assert.equal(model.birthdayDay, '1.112')
assert.equal(model.yearsTogether, '3')
assert.equal(model.celebrationDate, '17 · 09 · 2026')
assert.equal(model.motif, birthdayContent.relationship.motif)

console.log('Phase 2.4 verification passed:', model)
