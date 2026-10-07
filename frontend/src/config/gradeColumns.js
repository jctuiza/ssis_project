const show = (value) => value == null ? '--' : Number(value).toFixed(2)

export const GRADE_COLUMNS = [
  { key: 'studentId', label: 'Student ID', sortable: true },
  { key: 'studentName', label: 'Name', sortable: true },
  { key: 'code', label: 'Course code', sortable: true },
  { key: 'subject', label: 'Subject' },
  { key: 'term', label: 'Term' },
  { key: 'prelim', label: 'Prelim', render: (g) => show(g.prelim) },
  { key: 'midterm', label: 'Midterm', render: (g) => show(g.midterm) },
  { key: 'finals', label: 'Finals', render: (g) => show(g.finals) },
  { key: 'finalGrade', label: 'Final', sortable: true, render: (g) => (g.finalGrade == null ? '--' : `${g.finalGrade.toFixed(2)} (${g.gradePoint.toFixed(2)})`) },
]
