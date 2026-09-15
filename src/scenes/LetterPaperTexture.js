import { CanvasTexture, LinearFilter, SRGBColorSpace } from 'three'

const WIDTH = 768
const HEIGHT = 480
const PAD = 58

const clean = (value) => typeof value === 'string'
  ? value.trim().replace(/\s+/g, ' ')
  : ''

export function getLetterPaperText({ copy = {}, sentences = [] } = {}) {
  return {
    emptyMessage: clean(copy.emptyMessage),
    salutation: clean(copy.salutation),
    sentences: Array.isArray(sentences) ? sentences.map(clean).filter(Boolean) : [],
    signOff: clean(copy.signOff),
    signature: clean(copy.signature),
  }
}

function wrap(context, text, maxWidth) {
  const lines = []
  let line = ''
  text.split(' ').forEach((word) => {
    const candidate = line ? `${line} ${word}` : word
    if (line && context.measureText(candidate).width > maxWidth) {
      lines.push(line)
      line = word
    } else line = candidate
  })
  if (line) lines.push(line)
  return lines
}

function layoutBody(context, paragraphs, fontSize) {
  context.font = `600 ${fontSize}px Caveat, Segoe Print, cursive`
  const lineHeight = fontSize * 1.22
  const gap = fontSize * 0.2
  const lines = paragraphs.flatMap((paragraph, index) => [
    ...wrap(context, paragraph, WIDTH - PAD * 2),
    ...(index === paragraphs.length - 1 ? [] : [null]),
  ])
  const height = lines.reduce(
    (total, line) => total + (line === null ? gap : lineHeight),
    0,
  )
  return { fontSize, gap, height, lineHeight, lines }
}

function fitBody(context, paragraphs) {
  for (let size = 30; size >= 14; size -= 1) {
    const layout = layoutBody(context, paragraphs, size)
    if (layout.height <= 304) return layout
  }
  return layoutBody(context, paragraphs, 14)
}

export function drawLetterPaperText(canvas, content) {
  const context = canvas.getContext('2d')
  if (!context) return null
  const text = getLetterPaperText(content)
  const paragraphs = text.sentences.length
    ? text.sentences
    : [text.emptyMessage].filter(Boolean)
  context.clearRect(0, 0, canvas.width, canvas.height)
  context.fillStyle = '#7b526e'
  context.textBaseline = 'top'
  context.font = '700 36px Caveat, Segoe Print, cursive'
  context.fillText(text.salutation, PAD, 34)
  const layout = fitBody(context, paragraphs)
  context.font = `600 ${layout.fontSize}px Caveat, Segoe Print, cursive`
  let y = 82
  layout.lines.forEach((line) => {
    if (line === null) y += layout.gap
    else {
      context.fillText(line, PAD, y)
      y += layout.lineHeight
    }
  })
  context.textAlign = 'right'
  context.font = '600 25px Caveat, Segoe Print, cursive'
  context.fillText(text.signOff, WIDTH - PAD, 402)
  context.fillStyle = '#a54f7d'
  context.font = '700 29px Dancing Script, Caveat, cursive'
  context.fillText(text.signature, WIDTH - PAD, 435)
  context.textAlign = 'left'
  return { layout, text }
}

export function createLetterPaperTexture(
  content,
  createCanvas = () => document.createElement('canvas'),
) {
  const canvas = createCanvas()
  canvas.width = WIDTH
  canvas.height = HEIGHT
  const render = () => drawLetterPaperText(canvas, content)
  const layout = render()
  const texture = new CanvasTexture(canvas)
  texture.name = 'letter-paper-texture'
  texture.colorSpace = SRGBColorSpace
  texture.magFilter = LinearFilter
  texture.minFilter = LinearFilter
  texture.generateMipmaps = false
  texture.userData = {
    sentenceCount: layout?.text.sentences.length ?? 0,
    source: 'birthday-content-config',
  }
  texture.needsUpdate = true
  return {
    canvas,
    render() {
      const nextLayout = render()
      texture.needsUpdate = true
      return nextLayout
    },
    texture,
  }
}
