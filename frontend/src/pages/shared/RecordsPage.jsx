import ResourcePage from '../../components/dashboard/ResourcePage'
import StatusBadge from '../../components/ui/StatusBadge'
import { useSession } from '../../context/session'
import * as registrarService from '../../services/registrar/registrarService'

// Academic standing from posted grades. Users tied to a department only see their department.
export default function RecordsPage({ title = 'Academic Records', description }) {
  const { user } = useSession()
  const departmentId = user.departmentId ?? undefined
  return (
    <ResourcePage
      eyebrow="Records"
      title={title}
      description={description}
      load={() => registrarService.getRecords({ departmentId })}
      deps={[departmentId]}
      columns={[
        { key: 'id', label: 'Student ID', sortable: true },
        { key: 'name', label: 'Name', sortable: true },
        { key: 'program', label: 'Program' },
        { key: 'yearLevel', label: 'Year level' },
        { key: 'units', label: 'Units earned', sortable: true },
        { key: 'gwa', label: 'GWA', sortable: true },
        { key: 'standing', label: 'Standing', render: (r) => <StatusBadge status={r.standing === "Dean's Lister" ? 'Approved' : 'Active'} /> },
      ]}
      searchKeys={['id', 'name', 'program']}
      searchPlaceholder="Search Student ID or name"
    />
  )
}


