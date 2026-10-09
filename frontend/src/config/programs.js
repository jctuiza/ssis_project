// Get only the programs associated with the selected department.
// Program choices come exclusively from the database-backed departments API.
// Supported entries:
// - 'Program name'
// - { name: 'Program name' }
// - { value: 'Program value', label: 'Program label' }

export function programsForDepartment(departments, departmentId) {
  if (!departmentId) return []

  const department = (departments ?? []).find(
    (item) => String(item.id) === String(departmentId),
  )

  if (!department) return []

  const catalog = Array.isArray(department.programs) ? department.programs : []

  return catalog
    .map((program) => {
      const value =
        typeof program === 'string'
          ? program
          : program.value ?? program.name

      const label =
        typeof program === 'string'
          ? program
          : program.label ?? program.name ?? value

      return { value, label }
    })
    .filter((program) => program.value && program.label)
}

// The Department staff role requires a department assignment.
// Custom roles can also require one through requiresDepartment: true.

export const roleRequiresDepartment = (role, roles = []) =>
  role === 'department' ||
  roles.some(
    (item) => item.key === role && item.requiresDepartment === true,
  )
