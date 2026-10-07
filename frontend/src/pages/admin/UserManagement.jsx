import TableSkeleton from '../../components/loading/TableSkeleton'
import { roleRequiresDepartment } from '../../config/programs'
import { useState } from 'react'
import { Ban, Check, Eye, KeyRound, Pencil, UserPlus } from 'lucide-react'
import PageHeader from '../../components/ui/PageHeader'
import Card from '../../components/ui/Card'
import DataTable from '../../components/tables/DataTable'
import AsyncView from '../../components/feedback/AsyncView'
import Modal from '../../components/ui/Modal'
import Button from '../../components/ui/Button'
import Input from '../../components/forms/Input'
import Select from '../../components/forms/Select'
import InfoGrid from '../../components/ui/InfoGrid'
import StatusBadge from '../../components/ui/StatusBadge'
import ConfirmationDialog from '../../components/feedback/ConfirmationDialog'
import CredentialsDialog from '../../components/feedback/CredentialsDialog'
import useService from '../../hooks/useService'
import { useToast } from '../../context/toast'
import { validateStaff } from '../../utils/validation'
import { passwordIssue } from '../../utils/password'
import * as adminService from '../../services/admin/adminService'

// The order of the fields in the forms, used to focus the first invalid one.
const FIELD_ORDER = ['name', 'username', 'email', 'contact', 'role', 'departmentId', 'password']

// scope: 'all' | 'student' | 'staff'. Students are registered by the Registrar, so only staff accounts can be added here.
// There is only one Admin account, so the Admin role is never offered when adding or editing an account.
export default function UserManagement({ title, description, scope = 'all' }) {
  const { notify } = useToast()
  const users = useService(adminService.getUsers, [], "pages/admin/UserManagement.jsx:1")
  const depts = useService(adminService.getDepartments, [], "pages/admin/UserManagement.jsx:2")
  const roles = useService(adminService.getRoles, [], "pages/admin/UserManagement.jsx:3")
  const [mode, setMode] = useState(null) // { type: 'view' | 'edit' | 'toggle' | 'reset' | 'add', user? }
  const [form, setForm] = useState({})
  const [errors, setErrors] = useState({}) // { fieldKey: 'message' } shown under each field
  const [saving, setSaving] = useState(false)
  const [credentials, setCredentials] = useState(null)

  const rows = (users.data ?? []).filter((u) => (scope === 'student' ? u.role === 'student' : scope === 'staff' ? u.role !== 'student' : true))
  const staffRoles = (roles.data ?? []).filter((r) => r.key !== 'student' && r.key !== 'admin')
  const deptOptions = (depts.data ?? []).map((d) => ({ value: d.id, label: `${d.code} – ${d.name}` }))
  const target = mode?.user
  const nextStatus = target?.status === 'Active' ? 'Inactive' : 'Active'
  // Students keep the Student role and the single Admin keeps the Admin role, so only other staff can change role.
  const canChangeRole = target && target.role !== 'student' && target.role !== 'admin'

  const close = () => {
    setMode(null)
    setErrors({})
  }

  // Rules for whichever form is open.
  const validate = (values) => {
    if (mode?.type === 'add') return validateStaff(values, { requiresDepartment: roleRequiresDepartment(values.role, roles.data ?? []) })
    if (mode?.type === 'edit') return validateStaff(values, { isNew: false })
    if (mode?.type === 'reset' && values.password) {
      const issue = passwordIssue(values.password)
      return issue ? { password: issue } : {}
    }
    return {}
  }

  const focusFirst = (found) => {
    const first = FIELD_ORDER.find((key) => found[key])
    if (first) document.getElementById(`staff-${first}`)?.focus()
  }

  // Updates a value. A field that currently shows an error is re-checked on every change,
  // so its red border and message disappear as soon as the input becomes valid.
  const change = (key) => (e) => {
    const values = { ...form, [key]: e.target.value }
    if (mode?.type === 'add' && key === 'role' && !roleRequiresDepartment(values.role, roles.data ?? [])) {
      values.departmentId = ''
      setErrors(previous => { const next = { ...previous }; delete next.departmentId; return next })
    }
    setForm(values)
    if (errors[key]) {
      const issue = validate(values)[key]
      setErrors((prev) => {
        const next = { ...prev }
        if (issue) next[key] = issue
        else delete next[key]
        return next
      })
    }
  }

  // Props shared by every field: id/name, value, change handler and the inline error (red border + message).
  const field = (key) => ({ name: `staff-${key}`, value: form[key] ?? '', onChange: change(key), error: errors[key] })

  // Runs a task. Field problems from the "server" (for example a duplicate email) appear under the matching
  // field; anything else is shown as a toast.
  const run = async (task, message) => {
    setSaving(true)
    try {
      const result = await task()
      if (message) notify(message)
      close()
      return result
    } catch (err) {
      if (err.fields) {
        setErrors(err.fields)
        focusFirst(err.fields)
      } else {
        notify(err.message, 'error')
      }
      return null
    } finally {
      setSaving(false)
    }
  }

  // Validates the open form first, then runs the task.
  const submit = async (task, message) => {
    const found = validate(form)
    if (Object.keys(found).length) {
      setErrors(found)
      focusFirst(found)
      return null
    }
    setErrors({})
    return run(task, message)
  }

  const openEdit = (u) => { setErrors({}); setForm({ name: u.name, email: u.email, departmentId: u.departmentId ?? '', role: u.role }); setMode({ type: 'edit', user: u }) }
  const openAdd = () => { setErrors({}); setForm({ name: '', email: '', username: '', contact: '', role: staffRoles[0]?.key ?? '', departmentId: '' }); setMode({ type: 'add' }) }
  const openReset = (u) => { setErrors({}); setForm({ password: '' }); setMode({ type: 'reset', user: u }) }

  const roleFilter = [...new Set(rows.map((u) => u.roleLabel))]

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={title}
        title={title}
        description={description}
        action={scope === 'staff' && <Button onClick={openAdd}><UserPlus className="h-4 w-4" />Add staff account</Button>}
      />
      <AsyncView loading={users.loading} error={users.error} hasData={users.data != null} skeleton={<TableSkeleton columns={5} search filters actions />}>
        <Card padded={false}>
          <DataTable
            rows={rows}
            columns={[
              { key: 'name', label: 'Name', sortable: true, render: (u) => (<div><p className="font-medium text-slate-900 dark:text-white">{u.name}</p><p className="text-xs text-slate-400">{u.email}</p></div>) },
              { key: 'id', label: 'ID', sortable: true },
              { key: 'roleLabel', label: 'Role' },
              { key: 'department', label: 'Department' },
              { key: 'status', label: 'Status', render: (u) => <StatusBadge status={u.status} /> },
            ]}
            searchKeys={['id', 'name', 'email']}
            searchPlaceholder="Search name, ID or email"
            filter={roleFilter.length > 1 ? { key: 'roleLabel', options: roleFilter } : { key: 'status', options: ['Active', 'Inactive'] }}
            actions={(u) => (
              <>
                <Button variant="ghost" size="sm" onClick={() => setMode({ type: 'view', user: u })}><Eye className="h-3.5 w-3.5" />View</Button>
                <Button variant="ghost" size="sm" onClick={() => openEdit(u)}><Pencil className="h-3.5 w-3.5" />Edit</Button>
                <Button variant="ghost" size="sm" onClick={() => openReset(u)}><KeyRound className="h-3.5 w-3.5" />Reset password</Button>
                <Button variant="ghost" size="sm" className={u.status === 'Active' ? '!text-rose-500' : ''} onClick={() => setMode({ type: 'toggle', user: u })}>
                  {u.status === 'Active' ? <Ban className="h-3.5 w-3.5" /> : <Check className="h-3.5 w-3.5" />}
                  {u.status === 'Active' ? 'Disable' : 'Enable'}
                </Button>
              </>
            )}
          />
        </Card>
      </AsyncView>

      <Modal open={mode?.type === 'view'} title={target?.name} description="User details" onClose={close} footer={<Button variant="outline" onClick={close}>Close</Button>}>
        {target && (
          <InfoGrid items={[
            { label: 'ID', value: target.id },
            { label: 'Email', value: target.email },
            { label: 'Role', value: target.roleLabel },
            { label: 'Department', value: target.department },
            { label: 'Contact', value: target.contact },
            { label: 'Status', value: <StatusBadge status={target.status} /> },
          ]} />
        )}
      </Modal>

      <Modal
        open={mode?.type === 'edit'}
        title="Edit user"
        description={target ? `${target.roleLabel} · ${target.id}` : ''}
        onClose={close}
        footer={<><Button variant="outline" onClick={close}>Cancel</Button><Button loading={saving} onClick={() => submit(() => adminService.updateUser(target.id, { name: form.name, email: form.email, departmentId: form.departmentId || null, ...(canChangeRole ? { role: form.role } : {}) }), 'User updated.')}>Save changes</Button></>}
      >
        <div className="grid gap-4">
          <Input label="Full name" {...field('name')} />
          <Input label="Email" type="email" {...field('email')} />
          {canChangeRole && <Select label="Role" options={staffRoles.map((r) => ({ value: r.key, label: r.label }))} {...field('role')} />}
          <Select label="Department" placeholder="None" options={deptOptions} {...field('departmentId')} />
        </div>
      </Modal>

      <Modal
        open={mode?.type === 'add'}
        title="Add staff account"
        description="A temporary password is generated. The user must change it at first login."
        onClose={close}
        footer={<><Button variant="outline" onClick={close}>Cancel</Button><Button loading={saving} onClick={async () => {
          const r = await submit(() => adminService.createUser({ ...form, departmentId: roleRequiresDepartment(form.role, roles.data ?? []) ? form.departmentId : null }))
          if (r) setCredentials({ title: 'Account created', description: `${r.user.name} · ${r.user.roleLabel}`, fields: [{ label: 'Username', value: r.credentials.username }, { label: 'Temporary password', value: r.credentials.temporaryPassword }] })
        }}>Create account</Button></>}
      >
        <div className="grid gap-4">
          <Input label="Full name" {...field('name')} />
          <Input label="Username" placeholder="e.g. cashier2" autoCapitalize="none" {...field('username')} />
          <Input label="Email" type="email" {...field('email')} />
          <Input label="Contact number (optional)" type="tel" {...field('contact')} />
          <Select label="Role" placeholder="Select role" options={staffRoles.map((r) => ({ value: r.key, label: r.label }))} {...field('role')} />
          {roleRequiresDepartment(form.role, roles.data ?? []) && (
            <Select label="Department" placeholder="Select department" options={deptOptions} {...field('departmentId')} />
          )}
        </div>
      </Modal>

      <Modal
        open={mode?.type === 'reset'}
        size="sm"
        title="Reset password"
        description={target ? `${target.name} · ${target.roleLabel}` : ''}
        onClose={close}
        footer={<><Button variant="outline" onClick={close}>Cancel</Button><Button loading={saving} onClick={async () => {
          const r = await submit(() => adminService.resetPassword(target.id, { password: form.password }))
          if (r) setCredentials({ title: 'Password reset', description: `${target.name} must change it at the next login.`, fields: [{ label: 'Username', value: target.id }, { label: 'Temporary password', value: r.temporaryPassword }] })
        }}>Reset password</Button></>}
      >
        <Input label="New temporary password (optional)" type="text" placeholder="Leave blank to generate one" {...field('password')} />
        <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">The reset is recorded in the activity log. The user is asked to choose a new password after logging in.</p>
      </Modal>

      <ConfirmationDialog
        open={mode?.type === 'toggle'}
        title={target?.status === 'Active' ? 'Disable account' : 'Enable account'}
        message={target ? `${target.status === 'Active' ? 'Disable' : 'Enable'} the account of ${target.name}? ${target.status === 'Active' ? 'They will not be able to log in.' : 'They will be able to log in again.'}` : ''}
        confirmLabel={target?.status === 'Active' ? 'Disable' : 'Enable'}
        danger={target?.status === 'Active'}
        loading={saving}
        onConfirm={() => run(() => adminService.updateUser(target.id, { status: nextStatus }), `Account ${nextStatus === 'Active' ? 'enabled' : 'disabled'}.`)}
        onCancel={close}
      />

      <CredentialsDialog open={Boolean(credentials)} title={credentials?.title} description={credentials?.description} fields={credentials?.fields} onClose={() => setCredentials(null)} />
    </div>
  )
}

