import { Users, ClipboardCheck, FileText } from 'lucide-react'
import StaffDashboard from '../../components/dashboard/StaffDashboard'
import RowList from '../../components/dashboard/RowList'
import StatusBadge from '../../components/ui/StatusBadge'
import useService from '../../hooks/useService'
import { useSession } from '../../context/session'
import * as departmentService from '../../services/department/departmentService'

export default function DepartmentDashboard() {
  const { user } = useSession()
  const state = useService(() => departmentService.getDashboard(user.departmentId), [user.departmentId], "pages/department/DepartmentDashboard.jsx:1")
  return (
    <StaffDashboard
      state={state}
      description={`Students and clearance for the ${user.department} department.`}
      build={(d) => ({
        stats: [
          { label: 'Students', value: d.totals.students, icon: Users },
          { label: 'Pending department clearance', value: d.totals.pendingClearance, icon: ClipboardCheck },
          { label: 'Department requests', value: d.totals.requests, icon: FileText },
        ],
        links: [
          { label: 'Update clearance', page: 'clearance', icon: ClipboardCheck },
          { label: 'View requests', page: 'requests', icon: FileText },
        ],
        activities: d.activities,
        panel: {
          title: 'Waiting for clearance',
          description: 'Students who still need your clearance',
          content: <RowList empty="All students are cleared." rows={d.pending.map((c) => ({ id: c.id, title: c.studentName, subtitle: c.program, right: <StatusBadge status={c.status} /> }))} />,
        },
      })}
    />
  )
}


