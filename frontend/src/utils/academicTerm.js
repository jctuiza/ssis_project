export function termParts(term) {
  const years = String(term ?? '').match(/(\d{4})\D{1,3}(\d{4})/)
  const semester = /\b(2nd|second)\b/i.test(term ?? '') ? 'Second Semester' : /\b(1st|first)\b/i.test(term ?? '') ? 'First Semester' : ''
  return { year: years ? `${years[1]}-${years[2]}` : '', semester }
}
export function termKey(term) {
  const { year, semester } = termParts(term)
  return `${year}|${semester}`
}
export function termView(activeTerm, selection) {
  const active = termParts(activeTerm)
  return selection?.sourceKey === termKey(activeTerm) ? { year: selection.year || active.year, semester: selection.semester || active.semester } : active
}
export function gradeTermFor(terms, activeTerm, selection, program) {
  const active = termParts(activeTerm)
  const selected = selection?.sourceKey === termKey(activeTerm) && terms?.find(t => t.id === selection.id)
  return selected || terms?.find(t => t.academicYear === active.year && t.semester === active.semester) ||
    (active.year && active.semester ? { id: `active:${termKey(activeTerm)}`, academicYear: active.year, semester: active.semester, program, courses: [] } : null)
}
