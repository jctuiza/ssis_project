// Role keys match the roles future Laravel authorization will use.
export const ROLES = {
  student: {
    label: 'Student',
    portal: 'Student Portal',
    idLabel: 'Student ID',
    tagline: 'Login to access your account',
    photo: { title: 'Welcome to', sub: 'student portal' },
    demo: '2024-0001 / student123',
    description: 'Views own records and requests services online.',
    access: ['Enrollment', 'Grades', 'Clearance', 'Document requests', 'Payments'],
  },
  admin: {
    label: 'Admin',
    portal: 'Admin Portal',
    idLabel: 'Username',
    tagline: 'Login to manage the student services system',
    photo: { title: 'Welcome,', sub: 'administrator' },
    demo: 'admin / admin123',
    description: 'Manages users, roles, departments, announcements and system settings.',
    access: ['User management', 'Roles', 'Departments', 'Announcements', 'Reports', 'Activity logs', 'Settings'],
  },
  registrar: {
    label: 'Registrar',
    portal: 'Registrar Portal',
    idLabel: 'Username',
    tagline: 'Login to process records, enrollment and requests',
    photo: { title: 'Welcome,', sub: 'registrar office' },
    demo: 'registrar / registrar123',
    description: 'Maintains student records and processes academic requests.',
    access: ['Students', 'Enrollment', 'Grades', 'Clearance', 'Document requests', 'Records'],
  },
  cashier: {
    label: 'Cashier',
    portal: 'Cashier Portal',
    idLabel: 'Username',
    tagline: 'Login to manage assessments and payments',
    photo: { title: 'Welcome,', sub: 'cashier office' },
    demo: 'cashier / cashier123',
    description: 'Handles assessments, payments, document fees and student accounts.',
    access: ['Student accounts', 'Assessments', 'Payments', 'Transactions'],
  },
  department: {
    label: 'Department',
    portal: 'Department Portal',
    idLabel: 'Username',
    tagline: 'Login to manage department clearance and requests',
    photo: { title: 'Welcome,', sub: 'department office' },
    demo: 'ccs-department/cbaa-department / dept123',
    description: 'Clears and reviews students under its department.',
    access: ['Department students', 'Department clearance', 'Requests', 'Department records'],
  },
}

// Roles created by the administrator are registered here after login so every screen can look up
// their label and portal name exactly like the built-in roles.
export const registerRoles = (list = []) =>
  list.forEach(({ key, label }) => {
    if (ROLES[key]) return
    ROLES[key] = {
      label, portal: `${label} Portal`, idLabel: 'Username or email', tagline: 'Login to access your account',
      photo: { title: 'Welcome,', sub: label.toLowerCase() }, demo: '', description: '', access: [],
    }
  })

// Student uses the left-form layout; every staff role reuses the Admin-style layout.
export const isStaffRole = (role) => role !== 'student'


