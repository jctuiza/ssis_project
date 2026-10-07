import ResourcePage from '../../components/dashboard/ResourcePage'
import useService from '../../hooks/useService'
import * as adminService from '../../services/admin/adminService'


// The roles are predefined by the system. This page only shows them and what each role can do.
export default function ActivityLogs() {
  const roles = useService(adminService.getRoles, [], "pages/admin/AdminPages.jsx:2")
  return (
    <ResourcePage
      eyebrow="Activity Logs"
      title="Activity Logs"
      description="A record of important actions across the system, including payments and password resets."
      load={adminService.getLogs}
      columns={[
        { key: 'time', label: 'When' },
        { key: 'actor', label: 'User', sortable: true },
        { key: 'roleLabel', label: 'Role' },
        { key: 'action', label: 'Action' },
      ]}
      searchKeys={['actor', 'action']}
      searchPlaceholder="Search user or action"
      filter={{ key: 'roleLabel', options: (roles.data ?? []).map((r) => r.label) }}
    />
  )
}


