export const peso = (n) =>
  '₱' + Number(n || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export const countBy = (list, fn) => {
  const map = new Map()
  list.forEach((item) => map.set(fn(item), (map.get(fn(item)) ?? 0) + 1))
  return [...map].map(([label, value]) => ({ label, value }))
}

// Dates are stored as ISO strings (MySQL DATETIME / DATE) and formatted only for display.
const toDate = (v) => (v instanceof Date ? v : new Date(v))

export const formatDate = (iso) =>
  iso ? toDate(iso).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }) : '—'

export const formatDateTime = (iso) =>
  iso ? `${formatDate(iso)} · ${toDate(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}` : '—'

// 'YYYY-MM-DD' -> 'March 14, 2004'
export const formatLongDate = (date) =>
  date ? new Date(`${date}T00:00:00`).toLocaleDateString('en-US', { month: 'long', day: '2-digit', year: 'numeric' }) : '—'

export const isToday = (iso) => toDate(iso).toDateString() === new Date().toDateString()

export function timeAgo(iso) {
  const minutes = Math.floor((Date.now() - toDate(iso).getTime()) / 60000)
  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes} min ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`
  const days = Math.floor(hours / 24)
  if (days === 1) return 'Yesterday'
  if (days < 14) return `${days} days ago`
  return formatDate(iso)
}

// Age in whole years from a 'YYYY-MM-DD' birthday ('' when empty or invalid).
export function ageFromBirthdate(birthdate) {
  if (!birthdate) return ''
  const b = new Date(`${birthdate}T00:00:00`)
  if (Number.isNaN(b.getTime())) return ''
  const now = new Date()
  const age = now.getFullYear() - b.getFullYear() - (now < new Date(now.getFullYear(), b.getMonth(), b.getDate()) ? 1 : 0)
  return String(Math.max(0, age))
}


