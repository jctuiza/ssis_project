import { Users, GraduationCap, ClipboardCheck, FileText } from 'lucide-react'
import StaffDashboard from '../../components/dashboard/StaffDashboard'
import RowList from '../../components/dashboard/RowList'
import StatusBadge from '../../components/common/StatusBadge'
import useService from '../../hooks/useService'
import * as registrarService from '../../services/registrarService'

export default function RegistrarDashboard() {
  const state = useService(registrarService.getDashboard)
  return (
    <StaffDashboard
      state={state}
      description="Here is what needs your attention at the registrar today."
      build={(d) => ({
        stats: [
          { label: 'Total students', value: d.totals.students, icon: Users },
          { label: 'Enrollment requests', value: d.totals.enrollmentRequests, icon: GraduationCap },
          { label: 'Pending clearance', value: d.totals.pendingClearance, icon: ClipboardCheck },
          { label: 'Pending document requests', value: d.totals.pendingRequests, icon: FileText },
        ],
        links: [
          { label: 'Review enrollment', page: 'enrollment', icon: GraduationCap },
          { label: 'Process requests', page: 'documents', icon: FileText },
          { label: 'Update clearance', page: 'clearance', icon: ClipboardCheck },
        ],
        activities: d.activities,
        panel: {
          title: 'Latest document requests',
          description: 'Newest first',
          content: <RowList rows={d.recentRequests.map((r) => ({ id: r.ref, title: r.type, subtitle: `${r.studentName} · ${r.ref}`, right: <StatusBadge status={r.status} /> }))} />,
        },
      })}
    />
  )
}
