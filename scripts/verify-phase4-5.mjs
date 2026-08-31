import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const [planning, stylesheet] = await Promise.all([
  readFile(new URL('../PLANNING.md', import.meta.url), 'utf8'),
  readFile(new URL('../src/styles/global.css', import.meta.url), 'utf8'),
])

function luminance(hex) {
  const channels = hex.match(/[a-f\d]{2}/gi).map((value) => {
    const channel = Number.parseInt(value, 16) / 255
    return channel <= 0.03928
      ? channel / 12.92
      : ((channel + 0.055) / 1.055) ** 2.4
  })
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722
}

function contrast(foreground, background) {
  const values = [luminance(foreground), luminance(background)].sort((a, b) => b - a)
  return (values[0] + 0.05) / (values[1] + 0.05)
}

assert.ok(contrast('#4f3656', '#fffdf7') >= 7)
assert.ok(contrast('#6f5875', '#fffdf9') >= 4.5)
assert.ok(stylesheet.includes('@media (min-width: 1100px) and (max-height: 980px)'))
assert.ok(stylesheet.includes('overscroll-behavior: contain'))
assert.ok(stylesheet.includes('scrollbar-gutter: stable'))
assert.ok(stylesheet.includes('touch-action: pan-y'))
assert.ok(stylesheet.includes('.letter-preview-scroll::-webkit-scrollbar-thumb'))
assert.ok(planning.includes('- [x] 4.5 Hoàn thiện bố cục desktop/mobile'))

console.log('Phase 4.5 responsive and contrast verification passed')
