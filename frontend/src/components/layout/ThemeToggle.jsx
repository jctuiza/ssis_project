import { Moon, Sun } from 'lucide-react'

const base = 'grid h-10 w-10 place-items-center rounded-xl border transition'
// Default style (used on the login page).
const defaultStyle = 'border-slate-200 bg-surface text-slate-500 hover:border-violet-300 hover:bg-violet-50 hover:text-violet-600 dark:border-white/10 dark:bg-[#26272c] dark:text-slate-300 dark:hover:border-violet-400/40 dark:hover:bg-violet-500/10 dark:hover:text-violet-300'
// Style used on the violet dashboard header (both themes).
const headerStyle = 'border-white/20 bg-white/10 text-white hover:border-white/40 hover:bg-white/20'

export default function ThemeToggle({ theme, onToggle, onHeader = false }) {
  const isDark = theme === 'dark'
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={isDark ? 'Light mode' : 'Dark mode'}
      className={`${base} ${onHeader ? headerStyle : defaultStyle}`}
    >
      {isDark ? <Sun className="h-[18px] w-[18px]" /> : <Moon className="h-[18px] w-[18px]" />}
    </button>
  )
}


