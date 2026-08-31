const DEFAULT_LETTER_LENGTH = 'standard'

export function normalizeLetterSentences(sentences) {
  if (!Array.isArray(sentences)) return []

  return sentences
    .filter((sentence) => typeof sentence === 'string')
    .map((sentence) => sentence.trim().replace(/\s+/g, ' '))
    .filter(Boolean)
}

export function getLetterContentModel(sentences) {
  const normalizedSentences = normalizeLetterSentences(sentences)
  const characterCount = normalizedSentences.reduce(
    (total, sentence) => total + sentence.length,
    0,
  )

  let length = DEFAULT_LETTER_LENGTH
  if (normalizedSentences.length <= 4 && characterCount <= 360) length = 'short'
  if (normalizedSentences.length >= 13 || characterCount >= 1_150) length = 'extended'

  return {
    characterCount,
    isEmpty: normalizedSentences.length === 0,
    length,
    sentences: normalizedSentences,
  }
}

const clamp = (value, min, max) => Math.max(min, Math.min(max, value))

export function getLetterRevealSchedule(sentences, maxTotalSeconds = 11) {
  const normalizedSentences = normalizeLetterSentences(sentences)
  let elapsedSeconds = 0.65
  const rawSchedule = normalizedSentences.map((sentence) => {
    const durationSeconds = clamp(sentence.length / 46, 0.55, 1.65)
    const item = {
      delaySeconds: elapsedSeconds,
      durationSeconds,
      stepCount: clamp(Math.round(sentence.length / 2), 12, 42),
    }
    elapsedSeconds += durationSeconds + 0.18
    return item
  })
  const scale = elapsedSeconds > maxTotalSeconds ? maxTotalSeconds / elapsedSeconds : 1
  const schedule = rawSchedule.map((item) => ({
    delaySeconds: Number((item.delaySeconds * scale).toFixed(3)),
    durationSeconds: Number((item.durationSeconds * scale).toFixed(3)),
    stepCount: item.stepCount,
  }))
  const totalSeconds = schedule.length === 0
    ? 0
    : schedule.at(-1).delaySeconds + schedule.at(-1).durationSeconds

  return {
    items: schedule,
    signatureDelaySeconds: Number((totalSeconds + 0.25).toFixed(3)),
    totalSeconds: Number((totalSeconds + 0.85).toFixed(3)),
  }
}
