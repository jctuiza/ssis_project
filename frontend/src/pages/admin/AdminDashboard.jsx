import { Users, UserRound, Building2, FileText, Banknote } from 'lucide-react'
import StaffDashboard from '../../components/dashboard/StaffDashboard'
import useService from '../../hooks/useService'
import * as adminService from '../../services/admin/adminService'

export default function AdminDashboard() {
  const state = useService(adminService.getDashboard, [], "pages/admin/AdminDashboard.jsx:1")
  return (
    <StaffDashboard
      state={state}
      description="System-wide overview of the student services system."
      build={(d) => ({
        stats: [
          { label: 'Total students', value: d.totals.students, icon: Users },
          { label: 'Total staff', value: d.totals.staff, icon: UserRound },
          { label: 'Total departments', value: d.totals.departments, icon: Building2 },
          { label: 'Pending requests', value: d.totals.pendingRequests, icon: FileText },
          { label: "Today's transactions", value: d.totals.todayTransactions, icon: Banknote },
        ],
        links: [
          { label: 'Manage users', page: 'users', icon: Users },
          { label: 'View reports', page: 'reports', icon: FileText },
        ],
        activities: d.logs,
        panel: {
          title: 'Users by role',
          description: 'Accounts in the system',
          content: (
            <ul className="space-y-3">
              {d.usersByRole.map((r) => (
                <li key={r.label} className="flex items-center justify-between text-sm">
                  <span className="text-slate-600 dark:text-slate-300">{r.label}</span>
                  <span className="font-semibold text-slate-900 dark:text-white">{r.value}</span>
                </li>
              ))}
            </ul>
          ),
        },
      })}
    />
  )
}


