import { UserRound } from 'lucide-react'

// Shows the profile picture, or an icon when there is none. Used everywhere the picture appears.
export default function Avatar({ src, name = '', icon: Icon = UserRound, className = 'h-10 w-10 rounded-xl', iconClassName = 'h-5 w-5' }) {
  return (
    <span className={`grid shrink-0 place-items-center overflow-hidden ${src ? '' : 'bg-violet-100 text-violet-600 dark:bg-violet-500/15 dark:text-violet-300'} ${className}`}>
      {src ? (
        <img src={src} alt={name ? `${name} profile picture` : 'Profile picture'} className="h-full w-full object-cover" />
      ) : (
        <Icon className={iconClassName} />
      )}
    </span>
  )
}


