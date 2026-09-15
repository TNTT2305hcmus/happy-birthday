import { CanvasTexture, LinearFilter, SRGBColorSpace } from 'three'

const WIDTH = 768
const HEIGHT = 480
const PAD = 58
const BODY_FONT_SIZE = 24
const BODY_MAX_HEIGHT = 300

const clean = (value) => typeof value === 'string'
  ? value.trim().replace(/\s+/g, ' ')
  : ''

export function splitGraphemes(value = '') {
  const normalized = String(value).normalize('NFC')
  if (typeof Intl !== 'undefined' && typeof Intl.Segmenter === 'function') {
    const segmenter = new Intl.Segmenter('vi', { granularity: 'grapheme' })
    return [...segmenter.segment(normalized)].map(({ segment }) => segment)
  }
  return Array.from(normalized).reduce((segments, character) => {
    const previous = segments.at(-1) ?? ''
    const codePoint = character.codePointAt(0)
    const joinsPrevious = /[\p{Mark}\uFE0E\uFE0F]/u.test(character)
      || (codePoint >= 0x1f3fb && codePoint <= 0x1f3ff)
      || character === '\u200d'
      || previous.endsWith('\u200d')
    const isRegionalIndicator = codePoint >= 0x1f1e6 && codePoint <= 0x1f1ff
    const previousIsSingleRegional = splitGraphemesFallbackRegional(previous)
    if (segments.length && (joinsPrevious || (isRegionalIndicator && previousIsSingleRegional))) {
      segments[segments.length - 1] += character
    } else segments.push(character)
    return segments
  }, [])
}

function splitGraphemesFallbackRegional(value) {
  const points = Array.from(value)
  return points.length === 1
    && points[0].codePointAt(0) >= 0x1f1e6
    && points[0].codePointAt(0) <= 0x1f1ff
}

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

function paginateBody(layout) {
  const pages = [[]]
  let usedHeight = 0
  layout.lines.forEach((line) => {
    const page = pages.at(-1)
    const lineHeight = line === null ? layout.gap : layout.lineHeight
    if (line === null && page.length === 0) return
    if (usedHeight + lineHeight > BODY_MAX_HEIGHT && page.some(Boolean)) {
      while (page.at(-1) === null) page.pop()
      pages.push([])
      usedHeight = 0
      if (line === null) return
    }
    pages.at(-1).push(line)
    usedHeight += lineHeight
  })
  while (pages.at(-1)?.at(-1) === null) pages.at(-1).pop()
  return pages
}

export function layoutLetterPaperPages(canvas, content) {
  const context = canvas.getContext('2d')
  if (!context) return null
  const text = getLetterPaperText(content)
  const paragraphs = text.sentences.length
    ? text.sentences
    : [text.emptyMessage].filter(Boolean)
  const layout = layoutBody(context, paragraphs, BODY_FONT_SIZE)
  const pageLines = paginateBody(layout)
  return {
    layout,
    pages: pageLines.map((lines) => ({ lines })),
    text,
  }
}

function createDrawCommands(text, layout, page, pageIndex, pageCount) {
  const commands = []
  if (pageIndex === 0) commands.push({
    align: 'left', animated: true, color: '#7b526e',
    font: '700 36px Caveat, Segoe Print, cursive', text: text.salutation, x: PAD, y: 34,
  })
  let y = 82
  page.lines.forEach((line) => {
    if (line === null) y += layout.gap
    else {
      commands.push({
        align: 'left', animated: true, color: '#7b526e',
        font: `600 ${layout.fontSize}px Caveat, Segoe Print, cursive`,
        text: line, x: PAD, y,
      })
      y += layout.lineHeight
    }
  })
  if (pageIndex === pageCount - 1) commands.push(
    { align: 'right', animated: true, color: '#7b526e', font: '600 25px Caveat, Segoe Print, cursive', text: text.signOff, x: WIDTH - PAD, y: 402 },
    { align: 'right', animated: true, color: '#a54f7d', font: '700 29px Dancing Script, Caveat, cursive', text: text.signature, x: WIDTH - PAD, y: 435 },
  )
  commands.push({
    align: 'left', animated: false, color: '#a8792b',
    font: '600 17px Quicksand, Segoe UI, sans-serif',
    text: pageCount > 1 ? `‹  ${pageIndex + 1} / ${pageCount}  ›` : '', x: PAD, y: 444,
  })
  return commands.map((command) => ({ ...command, graphemes: splitGraphemes(command.text) }))
}

export function drawLetterPaperText(
  canvas,
  content,
  { pageIndex = 0, revealCount = Infinity } = {},
) {
  const context = canvas.getContext('2d')
  if (!context) return null
  const pagination = layoutLetterPaperPages(canvas, content)
  const safePageIndex = Math.max(0, Math.min(pagination.pages.length - 1, pageIndex))
  const commands = createDrawCommands(
    pagination.text,
    pagination.layout,
    pagination.pages[safePageIndex],
    safePageIndex,
    pagination.pages.length,
  )
  const pageGraphemeCounts = pagination.pages.map((page, index) => createDrawCommands(
    pagination.text, pagination.layout, page, index, pagination.pages.length,
  ).reduce((total, command) => total + (command.animated ? command.graphemes.length : 0), 0))
  const totalGraphemes = pageGraphemeCounts[safePageIndex]
  let remaining = Math.max(0, Math.min(totalGraphemes, revealCount))

  context.clearRect(0, 0, canvas.width, canvas.height)
  context.textBaseline = 'top'
  commands.forEach((command) => {
    const visible = command.animated
      ? command.graphemes.slice(0, Math.max(0, remaining)).join('')
      : command.text
    if (command.animated) remaining -= command.graphemes.length
    if (!visible) return
    context.fillStyle = command.color
    context.font = command.font
    context.textAlign = command.align
    context.fillText(visible, command.x, command.y)
  })
  context.textAlign = 'left'
  return {
    ...pagination,
    pageCount: pagination.pages.length,
    pageGraphemeCounts,
    pageIndex: safePageIndex,
    totalGraphemes,
  }
}

export function createLetterPaperTexture(
  content,
  createCanvas = () => document.createElement('canvas'),
  { initialPageIndex = 0, initialRevealCount = Infinity } = {},
) {
  const canvas = createCanvas()
  canvas.width = WIDTH
  canvas.height = HEIGHT
  let pageIndex = initialPageIndex
  let revealCount = initialRevealCount
  const render = (nextRevealCount = revealCount, nextPageIndex = pageIndex) => {
    pageIndex = nextPageIndex
    revealCount = nextRevealCount
    return drawLetterPaperText(canvas, content, { pageIndex, revealCount })
  }
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
    totalGraphemes: layout?.totalGraphemes ?? 0,
    pageCount: layout?.pageCount ?? 1,
    pageGraphemeCounts: layout?.pageGraphemeCounts ?? [],
    pageIndex: layout?.pageIndex ?? 0,
  }
  texture.needsUpdate = true
  return {
    canvas,
    get pageCount() { return texture.userData.pageCount },
    get pageIndex() { return texture.userData.pageIndex },
    get totalGraphemes() { return texture.userData.totalGraphemes },
    getPageGraphemeCount(index) { return texture.userData.pageGraphemeCounts[index] ?? 0 },
    render(nextRevealCount = revealCount, nextPageIndex = pageIndex) {
      const nextLayout = render(nextRevealCount, nextPageIndex)
      texture.userData.totalGraphemes = nextLayout.totalGraphemes
      texture.userData.pageCount = nextLayout.pageCount
      texture.userData.pageGraphemeCounts = nextLayout.pageGraphemeCounts
      texture.userData.pageIndex = nextLayout.pageIndex
      texture.needsUpdate = true
      return nextLayout
    },
    texture,
  }
}
