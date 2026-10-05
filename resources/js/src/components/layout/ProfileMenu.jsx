import Avatar from '../common/Avatar'
import { ROLES } from '../../config/roles'

export default function ProfileMenu({ user, onProfile }) {
  return (
    <div className="group relative">
      <button
        type="button"
        onClick={onProfile}
        aria-label="View profile"
        className="grid h-10 w-10 place-items-center overflow-hidden rounded-xl border border-white/20 bg-white/10 text-white transition hover:border-white/40 hover:bg-white/20"
      >
        <Avatar src={user.photo} name={user.name} className="h-full w-full rounded-none !bg-transparent !text-white" iconClassName="h-[19px] w-[19px]" />
      </button>
      <div className="pointer-events-none invisible absolute right-0 top-full z-50 mt-3 w-64 max-w-[calc(100vw-32px)] translate-y-2 rounded-2xl border border-slate-200 bg-surface p-4 opacity-0 shadow-xl shadow-slate-900/10 transition-all duration-200 ease-out group-focus-within:visible group-focus-within:translate-y-0 group-focus-within:opacity-100 group-hover:visible group-hover:translate-y-0 group-hover:opacity-100 dark:border-white/10 dark:bg-[#26272c] dark:shadow-black/20">
        <p className="text-xs font-medium text-slate-400 dark:text-slate-500">{user.role === 'student' ? 'Student ID' : 'Username'}</p>
        <p className="mt-1 text-sm font-semibold text-slate-700 dark:text-slate-200">{user.id}</p>
        <p className="mt-3 truncate text-sm font-semibold text-slate-900 dark:text-white">{user.name}</p>
        <p className="text-xs text-violet-600 dark:text-violet-300">{ROLES[user.role].label}</p>
        <p className="mt-1 break-all text-xs text-slate-500 dark:text-slate-400">{user.email}</p>
      </div>
    </div>
  )
}
