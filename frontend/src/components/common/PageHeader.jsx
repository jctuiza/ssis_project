import Breadcrumb from './Breadcrumb'
import { useSession } from '../../context/session'
import { ROLES } from '../../config/roles'

export default function PageHeader({ eyebrow, title, description, action }) {
  const { user } = useSession()
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <Breadcrumb items={[ROLES[user.role].label, eyebrow ?? title]} />
        <h2 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900 dark:text-white sm:text-3xl">{title}</h2>
        {description && <p className="mt-2 max-w-2xl text-sm text-slate-500 dark:text-slate-400">{description}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  )
}
