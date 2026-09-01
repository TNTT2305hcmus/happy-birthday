const numberFormatter = new Intl.NumberFormat('vi-VN')

function formatCelebrationDate(isoDate) {
  const [year, month, day] = isoDate.split('-')
  return `${day} · ${month} · ${year}`
}

function splitHeadlineAroundName(headline, name) {
  const nameStart = headline.indexOf(name)
  if (nameStart < 0) {
    return { headlineName: '', headlinePrefix: headline, headlineSuffix: '' }
  }

  return {
    headlineName: name,
    headlinePrefix: headline.slice(0, nameStart),
    headlineSuffix: headline.slice(nameStart + name.length),
  }
}

export function createHeroOverlayModel({ copy = {}, recipient, relationship }) {
  const headline = copy.headline ?? recipient.displayName

  return {
    age: String(recipient.turningAge),
    birthdayDay: numberFormatter.format(relationship.birthdayDayCount),
    celebrationDate: formatCelebrationDate(recipient.celebrationDate),
    featuredDay: numberFormatter.format(relationship.featuredDayCount),
    motif: relationship.motif,
    name: recipient.displayName,
    headline,
    ...splitHeadlineAroundName(headline, recipient.displayName),
    loveLine: copy.loveLine ?? relationship.motif,
    tagDateLabel: copy.tagDateLabel ?? formatCelebrationDate(recipient.celebrationDate),
    tagLabel: copy.tagLabel ?? '',
    timelineLead: copy.timelineLead ?? '',
    yearsTogether: String(relationship.yearsTogether),
  }
}
