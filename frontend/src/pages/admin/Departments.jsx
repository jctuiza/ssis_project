import ResourcePage from '../../components/dashboard/ResourcePage'
import * as adminService from '../../services/admin/adminService'


// The roles are predefined by the system. This page only shows them and what each role can do.
export default function Departments() {
  return (
    <ResourcePage
      eyebrow="Departments"
      title="Departments"
      description="Colleges and the people assigned to them."
      load={adminService.getDepartments}
      columns={[
        { key: 'code', label: 'Code', sortable: true },
        { key: 'name', label: 'Department', sortable: true },
        { key: 'head', label: 'Head' },
        { key: 'students', label: 'Students', sortable: true },
        { key: 'staff', label: 'Staff' },
      ]}
      searchKeys={['code', 'name', 'head']}
    />
  )
}


