import {
  LayoutDashboard, Users, ClipboardCheck, FileText, Wallet, GraduationCap, BookOpen,
  Building2, ShieldCheck, ScrollText, Settings, TrendingUp, UserRound, Receipt,
  Banknote, FolderOpen, History, IdCard, Megaphone, House,
} from 'lucide-react'
import { can } from './permissions'

const dashboard = { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard }
const home = { key: 'home', label: 'Homepage', icon: House }
const profile = { key: 'profile', label: 'Profile', icon: UserRound }

// The page a user lands on after login: Homepage for students, Dashboard for staff.
export const homePage = (role) => (role === 'student' ? 'home' : 'dashboard')

const STUDENT_NAV = [
  home,
  { key: 'enrollment', label: 'Enrollment', icon: GraduationCap },
  { key: 'grades', label: 'Grades', icon: BookOpen },
  { key: 'clearance', label: 'Clearance', icon: ClipboardCheck },
  { key: 'documents', label: 'Document Requests', icon: FileText },
  { key: 'payments', label: 'Payments', icon: Wallet },
  { key: 'id', label: 'Student ID', icon: IdCard },
  profile,
]

// Staff menu items are shown only when the user's role has one of the listed permissions.
export const STAFF_PAGES = [
  { key: 'users', label: 'User Management', icon: Users, perms: ['users.manage'] },
  { key: 'student-accounts', label: 'Students', icon: GraduationCap, perms: ['users.manage'] },
  { key: 'staff-accounts', label: 'Staff', icon: UserRound, perms: ['users.manage'] },
  { key: 'roles', label: 'Roles', icon: ShieldCheck, perms: ['roles.manage'] },
  { key: 'departments', label: 'Departments', icon: Building2, perms: ['departments.view'] },
  { key: 'announcements', label: 'Announcements', icon: Megaphone, perms: ['announcements.manage'] },
  { key: 'monitor', label: 'Transactions', icon: History, perms: ['transactions.view'] },
  { key: 'students', label: 'Students', icon: Users, perms: ['students.view'] },
  { key: 'enrollment', label: 'Enrollment', icon: GraduationCap, perms: ['enrollment.manage'] },
  { key: 'subjects', label: 'Subjects', icon: BookOpen, perms: ['subjects.manage'] },
  { key: 'grades', label: 'Grades', icon: BookOpen, perms: ['grades.manage'] },
  { key: 'clearance', label: 'Clearance', icon: ClipboardCheck, perms: ['clearance.registrar', 'clearance.department'] },
  { key: 'documents', label: 'Document Requests', icon: FileText, perms: ['documents.process'] },
  { key: 'requests', label: 'Requests', icon: FileText, perms: ['documents.review'] },
  { key: 'accounts', label: 'Student Accounts', icon: Users, perms: ['payments.manage'] },
  { key: 'assessments', label: 'Assessments', icon: Receipt, perms: ['payments.manage'] },
  { key: 'payments', label: 'Payments', icon: Banknote, perms: ['payments.manage'] },
  { key: 'document-fees', label: 'Document Fees', icon: FileText, perms: ['payments.manage'] },
  { key: 'transactions', label: 'Transactions', icon: History, perms: ['payments.manage'] },
  { key: 'records', label: 'Records', icon: FolderOpen, perms: ['records.view'] },
  { key: 'reports', label: 'Reports', icon: TrendingUp, perms: ['reports.view'] },
  { key: 'logs', label: 'Activity Logs', icon: ScrollText, perms: ['logs.view'] },
  { key: 'settings', label: 'Settings', icon: Settings, perms: ['settings.manage'] },
]

// Menu for the signed-in user, built from the permissions of their role.
export const navFor = (user) =>
  user.role === 'student' ? STUDENT_NAV : [dashboard, ...STAFF_PAGES.filter((p) => can(user, ...p.perms)), profile]

