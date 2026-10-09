import { lazy, Suspense } from 'react'
import PageSkeleton from '../components/loading/PageSkeleton'
import RouteErrorBoundary from '../components/feedback/RouteErrorBoundary'
import StudentHome from '../pages/student/StudentHome'
import StudentEnrollment from '../pages/student/StudentEnrollment'
import StudentGrades from '../pages/student/StudentGrades'
import StudentClearance from '../pages/student/StudentClearance'
import StudentDocuments from '../pages/student/StudentDocuments'
import StudentPayments from '../pages/student/StudentPayments'
import StudentID from '../pages/student/StudentID'
import AdminDashboard from '../pages/admin/AdminDashboard'
import UserManagement from '../pages/admin/UserManagement'
import Roles from '../pages/admin/Roles'
import Departments from '../pages/admin/Departments'
import ActivityLogs from '../pages/admin/ActivityLogs'
import SettingsPage from '../pages/admin/SettingsPage'
import Announcements from '../pages/admin/Announcements'
import RegistrarDashboard from '../pages/registrar/RegistrarDashboard'
import RegistrarEnrollment from '../pages/registrar/RegistrarEnrollment'
import RegistrarSubjects from '../pages/registrar/RegistrarSubjects'
import RegistrarGrades from '../pages/registrar/RegistrarGrades'
import CashierDashboard from '../pages/cashier/CashierDashboard'
import StudentAccounts from '../pages/cashier/StudentAccounts'
import Assessments from '../pages/cashier/Assessments'
import Payments from '../pages/cashier/Payments'
import DocumentFees from '../pages/cashier/DocumentFees'
import Transactions from '../pages/cashier/Transactions'
import DepartmentDashboard from '../pages/department/DepartmentDashboard'
import Profile from '../pages/shared/Profile'
import ReportsPage from '../pages/shared/ReportsPage'
import StudentsPage from '../pages/shared/StudentsPage'
import RecordsPage from '../pages/shared/RecordsPage'
import StaffDocuments from '../pages/shared/StaffDocuments'
import StaffClearance from '../pages/shared/StaffClearance'
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
  subjects: [['subjects.manage'], () => <RegistrarSubjects />],
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

