// Role-based access control. A role is a named set of permissions; every account has exactly one role.
// The same keys are checked in the UI (menus, pages, buttons) and again in the services (the "backend").
// With Laravel these map to Gates / Policies (or spatie/laravel-permission) on a roles table.
export const PERMISSIONS = [
  { key: 'students.view', label: 'View student records', group: 'Students' },
  { key: 'students.manage', label: 'Register new students and edit student information', group: 'Students' },
  { key: 'enrollment.manage', label: 'Review enrollment requests', group: 'Enrollment' },
  { key: 'grades.manage', label: 'Encode and correct grades', group: 'Grades' },
  { key: 'clearance.registrar', label: 'Update Registrar clearance', group: 'Clearance' },
  { key: 'clearance.department', label: 'Update Department clearance', group: 'Clearance' },
  { key: 'documents.process', label: 'Review, approve and release document requests', group: 'Document requests' },
  { key: 'documents.review', label: 'Review document requests (start review or reject)', group: 'Document requests' },
  { key: 'payments.manage', label: 'Manage student accounts, record payments and document fees', group: 'Cashier' },
  { key: 'transactions.view', label: 'Monitor transactions (read-only)', group: 'Administration' },
  { key: 'records.view', label: 'View academic records', group: 'Records and reports' },
  { key: 'reports.view', label: 'View reports', group: 'Records and reports' },
  { key: 'departments.view', label: 'View departments', group: 'Administration' },
  { key: 'announcements.manage', label: 'Publish announcements', group: 'Administration' },
  { key: 'logs.view', label: 'View activity logs', group: 'Administration' },
  { key: 'settings.manage', label: 'Change system settings', group: 'Administration' },
  { key: 'users.manage', label: 'Manage user accounts and reset passwords', group: 'Administration' },
  { key: 'roles.manage', label: 'Create and configure roles', group: 'Administration' },
]

export const PERMISSION_KEYS = PERMISSIONS.map((p) => p.key)
export const permissionLabel = (key) => PERMISSIONS.find((p) => p.key === key)?.label ?? key
export const PERMISSION_GROUPS = [...new Set(PERMISSIONS.map((p) => p.group))]

// Permissions of the built-in roles (seeded into the roles table).
export const SYSTEM_ROLE_PERMISSIONS = {
  student: [],
  admin: ['users.manage', 'roles.manage', 'departments.view', 'announcements.manage', 'transactions.view', 'reports.view', 'logs.view', 'settings.manage'],
  registrar: ['students.view', 'students.manage', 'enrollment.manage', 'grades.manage', 'clearance.registrar', 'documents.process', 'records.view', 'reports.view'],
  cashier: ['payments.manage', 'reports.view'],
  department: ['students.view', 'clearance.department', 'documents.review', 'records.view', 'reports.view'],
}

// can(user, 'a') or can(user, 'a', 'b') -> true when the user's role has any of them. `user.permissions` comes from login.
export const can = (user, ...permissions) => permissions.some((p) => user?.permissions?.includes(p))