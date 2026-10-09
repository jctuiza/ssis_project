import { Link } from 'react-router-dom'
import { useState } from 'react'
import { GraduationCap } from 'lucide-react'
import Button from '../ui/Button'
import UnderlineInput from './UnderlineInput'
import ThemeToggle from '../layout/ThemeToggle'
import { ROLES } from '../../config/roles'

// Presentational login form shared by every role. All state lives in pages/auth/Login.jsx.
// The role is chosen by the address of the page, so there is no "Login as" dropdown.
export default function LoginForm({
  theme, onToggleTheme, role, identifier, onIdentifierChange,
  password, onPasswordChange, errors, loading, onSubmit, className = '',
}) {
  const [forgot, setForgot] = useState(false)
  const config = ROLES[role]

  return (
    <div className={`relative flex flex-col justify-center px-6 py-20 ${className}`}>
      <div className="absolute left-6 top-6 lg:left-24">
        <ThemeToggle theme={theme} onToggle={onToggleTheme} />
      </div>

      <form onSubmit={onSubmit} noValidate className="mx-auto w-full max-w-sm">
        <div className="mb-8 flex items-center gap-2 text-violet-600 dark:text-violet-300 lg:hidden">
          <GraduationCap className="h-6 w-6" />
          <span className="text-sm font-semibold">Student Services Information System</span>
        </div>

        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">{config.portal}</h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{config.tagline}</p>

        <div className="mt-8 space-y-5">
          <UnderlineInput
            label={config.idLabel}
            value={identifier}
            onChange={(e) => onIdentifierChange(e.target.value)}
            error={errors.identifier}
            invalid={Boolean(errors.form)}
            autoComplete="username"
          />
          <UnderlineInput
            label="Password"
            type="password"
            value={password}
            onChange={(e) => onPasswordChange(e.target.value)}
            error={errors.password}
            invalid={Boolean(errors.form)}
            autoComplete="current-password"
          />
        </div>

        {errors.form && (
          <p role="alert" className="mt-5 rounded-lg bg-rose-500/10 px-3 py-2 text-sm text-rose-500">{errors.form}</p>
        )}

        <div className="mt-4 text-right">
          <button type="button" onClick={() => setForgot((v) => !v)} className="text-xs font-medium text-violet-600 hover:underline dark:text-violet-300">
            Forgot password?
          </button>
        </div>
        {forgot && (
          <p className="mt-2 rounded-lg bg-violet-500/10 px-3 py-2 text-xs text-slate-600 dark:text-slate-300">
            Passwords are reset by the system administrator. Contact the administrator or the registrar's office to receive a temporary password.
          </p>
        )}

        <Button type="submit" loading={loading} className="mt-6 w-full">
          {loading ? 'Signing in…' : `Login as ${config.label}`}
        </Button>

        {role === 'student' && <p className="mt-4 text-center text-xs text-slate-500">Incoming first-year student? <Link to="/online-enrollment" className="text-violet-600 underline">Apply online</Link></p>}
        {config.demo && <p className="mt-6 text-xs text-slate-400 dark:text-slate-500">Demo: {config.demo}</p>}
      </form>
    </div>
  )
}


