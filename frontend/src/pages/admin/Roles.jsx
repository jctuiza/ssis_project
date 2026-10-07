import ScreenSkeleton from '../../components/loading/ScreenSkeleton'
import PageHeader from '../../components/ui/PageHeader'
import Card from '../../components/ui/Card'
import AsyncView from '../../components/feedback/AsyncView'
import useService from '../../hooks/useService'
import { permissionLabel } from '../../config/permissions'
import * as adminService from '../../services/admin/adminService'


// The roles are predefined by the system. This page only shows them and what each role can do.
export default function Roles() {
  const { data, loading, error } = useService(adminService.getRoles, [], "pages/admin/AdminPages.jsx:1")

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Roles"
        title="Roles"
        description="Roles are predefined by the system. Every account has one role, and the role decides which modules a user can open."
      />
      <AsyncView loading={loading} error={error} hasData={data != null} skeleton={<ScreenSkeleton kind="roles" />}>
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {data?.map((r) => (
            <Card
              key={r.key}
              title={r.label}
              description={r.description}
              action={<span className="rounded-full bg-violet-50 px-2.5 py-1 text-xs font-medium text-violet-700 dark:bg-violet-400/10 dark:text-violet-300">{r.users} {r.users === 1 ? 'user' : 'users'}</span>}
            >
              <p className="mb-2 text-xs text-slate-400">
                Predefined role · key <code className="text-slate-600 dark:text-slate-300">{r.key}</code>
              </p>
              {r.key === 'student'
                ? <p className="text-xs text-slate-500 dark:text-slate-400">Students use the Student Portal and can only see their own information.</p>
                : <ul className="flex flex-wrap gap-2">{r.permissions.map((p) => <li key={p} className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs text-slate-600 dark:bg-white/5 dark:text-slate-300">{permissionLabel(p)}</li>)}</ul>}
            </Card>
          ))}
        </section>
      </AsyncView>
    </div>
  )
}

