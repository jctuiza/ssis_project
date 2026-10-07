// Department codes must match the codes returned by your departments API.
// Each BSBA major appears as a separate Program/Course option.

const BUSINESS_PROGRAMS = [
  'Bachelor of Science in Accountancy (BSA)',
  'BSBA major in Financial Management',
  'BSBA major in Marketing Management',
  'BSBA major in Human Resource Development Management',
]

export const PROGRAMS_BY_DEPARTMENT = {
  CCS: [
    'BS Information Technology',
    'BS Computer Science',
  ],

  CBAA: BUSINESS_PROGRAMS,
  CBA: BUSINESS_PROGRAMS,

  CAS: [
    'Bachelor of Science in Psychology (BSPsy)',
    'Bachelor of Arts in Communication (AB Comm)',
  ],

  COE: [
    'Bachelor of Science in Computer Engineering (BSCpE)',
    'Bachelor of Science in Electronics Engineering (BSECE)',
    'Bachelor of Science in Industrial Engineering (BSIE)',
    'Bachelor of Science in Civil Engineering (BSCE)',
    'Bachelor of Science in Electrical Engineering (BSEE)',
    'Bachelor of Science in Mechanical Engineering (BSME)',
  ],
}

// Get only the programs associated with the selected department.
// If the API supplies department.programs, use that list first.
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

  const departmentCode = String(department.code ?? '')
    .trim()
    .toUpperCase()

  const catalog = Array.isArray(department.programs)
    ? department.programs
    : PROGRAMS_BY_DEPARTMENT[departmentCode] ?? []

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
