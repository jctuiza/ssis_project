// Grades are stored as percentages (prelim, midterm, finals). The 1.00–5.00 equivalent is derived.
export const PASSING_PERCENT = 75

const SCALE = [[97, 1.0], [94, 1.25], [91, 1.5], [88, 1.75], [85, 2.0], [82, 2.25], [79, 2.5], [76, 2.75], [75, 3.0]]

export const toGradePoint = (percent) => {
  if (percent == null) return null
  const hit = SCALE.find(([min]) => percent >= min)
  return hit ? hit[1] : 5.0
}

// The final grade exists only when all three periods are posted.
export const finalGrade = (g) =>
  [g.prelim, g.midterm, g.finals].every((v) => v != null)
    ? Math.round(((g.prelim + g.midterm + g.finals) / 3) * 100) / 100
    : null
