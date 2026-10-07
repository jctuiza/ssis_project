import { KeyRound } from 'lucide-react'
import ChangePasswordForm from '../../components/account/ChangePasswordForm'
import ThemeToggle from '../../components/layout/ThemeToggle'
import Button from '../../components/ui/Button'
import { cardClass } from '../../utils/styles'

// Shown right after login when the account still uses a temporary password.
export default function ForcePasswordChange({ user, theme, onToggleTheme, onDone, onLogout }) {
  return (
    <div className="grid min-h-screen place-items-center bg-page px-4 py-10 dark:bg-[#1c1d21]">
      <div className="absolute right-4 top-4"><ThemeToggle theme={theme} onToggle={onToggleTheme} /></div>
      <section className={`${cardClass} w-full max-w-md p-6 sm:p-8`}>
        <span className="grid h-12 w-12 place-items-center rounded-xl bg-violet-50 text-violet-600 dark:bg-violet-500/10 dark:text-violet-300"><KeyRound className="h-6 w-6" /></span>
        <h1 className="mt-4 text-2xl font-semibold text-slate-900 dark:text-white">Choose a new password</h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          Hi {user.name}. You signed in with a temporary password. Set your own password to continue. Enter the temporary password below as your current password.
        </p>
        <div className="mt-6"><ChangePasswordForm onDone={onDone} currentLabel="Temporary password" /></div>
        <Button variant="ghost" size="sm" className="mt-4" onClick={onLogout}>Log out</Button>
      </section>
    </div>
  )
}


