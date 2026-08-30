const numberFormatter = new Intl.NumberFormat('vi-VN')

function formatCelebrationDate(isoDate) {
  const [year, month, day] = isoDate.split('-')
  return `${day} · ${month} · ${year}`
}

export function createHeroOverlayModel({ recipient, relationship }) {
  return {
    age: String(recipient.turningAge),
    birthdayDay: numberFormatter.format(relationship.birthdayDayCount),
    celebrationDate: formatCelebrationDate(recipient.celebrationDate),
    featuredDay: numberFormatter.format(relationship.featuredDayCount),
    motif: relationship.motif,
    name: recipient.displayName,
    yearsTogether: String(relationship.yearsTogether),
  }
}
