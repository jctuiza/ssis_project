import { lazy, Suspense } from 'react'
import PageSkeleton from '../components/loading/PageSkeleton'
import RouteErrorBoundary from '../components/feedback/RouteErrorBoundary'
const StudentHome = lazy(() => import('../pages/student/StudentHome'))
const StudentEnrollment = lazy(() => import('../pages/student/StudentEnrollment'))
const StudentGrades = lazy(() => import('../pages/student/StudentGrades'))
const StudentClearance = lazy(() => import('../pages/student/StudentClearance'))
const StudentDocuments = lazy(() => import('../pages/student/StudentDocuments'))
const StudentPayments = lazy(() => import('../pages/student/StudentPayments'))
const StudentID = lazy(() => import('../pages/student/StudentID'))
const AdminDashboard = lazy(() => import('../pages/admin/AdminDashboard'))
const UserManagement = lazy(() => import('../pages/admin/UserManagement'))
const Roles = lazy(() => import('../pages/admin/Roles'))
const Departments = lazy(() => import('../pages/admin/Departments'))
const ActivityLogs = lazy(() => import('../pages/admin/ActivityLogs'))
const SettingsPage = lazy(() => import('../pages/admin/SettingsPage'))
const Announcements = lazy(() => import('../pages/admin/Announcements'))
const RegistrarDashboard = lazy(() => import('../pages/registrar/RegistrarDashboard'))
const RegistrarEnrollment = lazy(() => import('../pages/registrar/RegistrarEnrollment'))
const RegistrarGrades = lazy(() => import('../pages/registrar/RegistrarGrades'))
const CashierDashboard = lazy(() => import('../pages/cashier/CashierDashboard'))
const StudentAccounts = lazy(() => import('../pages/cashier/StudentAccounts'))
const Assessments = lazy(() => import('../pages/cashier/Assessments'))
const Payments = lazy(() => import('../pages/cashier/Payments'))
const DocumentFees = lazy(() => import('../pages/cashier/DocumentFees'))
const Transactions = lazy(() => import('../pages/cashier/Transactions'))
const DepartmentDashboard = lazy(() => import('../pages/department/DepartmentDashboard'))
const Profile = lazy(() => import('../pages/shared/Profile'))
const ReportsPage = lazy(() => import('../pages/shared/ReportsPage'))
const StudentsPage = lazy(() => import('../pages/shared/StudentsPage'))
const RecordsPage = lazy(() => import('../pages/shared/RecordsPage'))
const StaffDocuments = lazy(() => import('../pages/shared/StaffDocuments'))
const StaffClearance = lazy(() => import('../pages/shared/StaffClearance'))
import { can } from '../config/permissions'

const STUDENT_PAGES = {
  home: StudentHome, enrollment: StudentEnrollment, grades: StudentGrades,
  clearance: StudentClearance, documents: StudentDocuments, payments: StudentPayments,
  id: StudentID, profile: Profile,
}
const DASHBOARDS = { admin: AdminDashboard, registrar: RegistrarDashboard, cashier: CashierDashboard, department: DepartmentDashboard }

// Which statistics a role sees in Reports.
const reportKind = (user) => (can(user, 'payments.manage') ? 'cashier' : can(user, 'users.manage') ? 'admin' : user.departmentId ? 'department' : 'registrar')

// Staff pages: page key -> [permissions that unlock it, render factory]. A page is shown only when the user's role has
// at least one of the permissions. Roles are predefined by the system (see config/permissions.js).
// The services enforce the same permissions on every request, so hiding a page is never the only protection.
const staffPages = (user) => ({
  users: [['users.manage'], () => <UserManagement title="User Management" description="Manage every account in the system." scope="all" />],
  'student-accounts': [['users.manage'], () => <UserManagement title="Students" description="Student accounts, status and password resets. New students are registered by the Registrar." scope="student" />],
  'staff-accounts': [['users.manage'], () => <UserManagement title="Staff" description="Create Registrar, Cashier and Department accounts, change their roles and reset passwords." scope="staff" />],
  roles: [['roles.manage'], () => <Roles />],
  departments: [['departments.view'], () => <Departments />],
  announcements: [['announcements.manage'], () => <Announcements />],
  monitor: [['transactions.view'], () => <Transactions readOnly />],
  logs: [['logs.view'], () => <ActivityLogs />],
  settings: [['settings.manage'], () => <SettingsPage />],
  students: [['students.view'], () => <StudentsPage description={user.departmentId ? 'Students under your department.' : 'Search, register and review student records.'} />],
  enrollment: [['enrollment.manage'], () => <RegistrarEnrollment />],
  grades: [['grades.manage'], () => <RegistrarGrades />],
  clearance: [
    ['clearance.registrar', 'clearance.department'],
    () => can(user, 'clearance.registrar')
      ? <StaffClearance office="Registrar" description="Update Registrar clearance so students can skip the window." />
      : <StaffClearance office="Department" description="Clear students under your department." />,
  ],
  documents: [['documents.process'], () => <StaffDocuments description="Review requests, approve them to send to the Cashier, then process and release the documents." />],
  requests: [['documents.review'], () => <StaffDocuments title="Department Requests" description="Document requests from your students." />],
  accounts: [['payments.manage'], () => <StudentAccounts />],
  assessments: [['payments.manage'], () => <Assessments />],
  payments: [['payments.manage'], () => <Payments />],
  'document-fees': [['payments.manage'], () => <DocumentFees />],
  transactions: [['payments.manage'], () => <Transactions />],
  records: [['records.view'], () => <RecordsPage title={user.departmentId ? 'Department Records' : 'Academic Records'} description="Academic standing based on posted grades." />],
  reports: [['reports.view'], () => <ReportsPage kind={reportKind(user)} description="Figures for the offices and students you can access." />],
})

export default function AppRoutes({ user, page }) {
  let content
  if (user.role === 'student') {
    const Page = STUDENT_PAGES[page] ?? StudentHome
    content = <Page />
  } else if (page === 'profile') content = <Profile />
  else {
    const entry = staffPages(user)[page]
    const Dashboard = DASHBOARDS[user.role]
    content = entry && can(user, ...entry[0]) ? entry[1]() : Dashboard ? <Dashboard /> : null
  }
  return (
    <RouteErrorBoundary key={`${user.role}-${page}`}>
      <Suspense fallback={<PageSkeleton role={user.role} page={page} />}>
        {content}
      </Suspense>
    </RouteErrorBoundary>
  )
}

