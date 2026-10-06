import campusImg from '../../assets/campus.png' // same photo for every role
import { ROLES } from '../../config/roles'

export default function LoginPhoto({ role, className = '' }) {
  const { photo, tagline } = ROLES[role]
  return (
    <div className={`relative overflow-hidden bg-violet-500 ${className}`}>
      <img
        src={campusImg}
        alt="Campus"
        onError={() => console.log('Image failed to load:', campusImg)}
        className="absolute inset-0 h-full w-full object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-violet-700/80 via-violet-600/50 to-violet-500/40" />
      <div className="relative flex h-full flex-col justify-center px-6 py-8 md:justify-start md:px-12 md:pt-24 lg:px-16">
        <h2 className="text-3xl font-bold leading-tight text-white sm:text-4xl md:text-5xl lg:text-6xl">
          {photo.title}
          <span className="block font-light">{photo.sub}</span>
        </h2>
        <p className="mt-3 text-sm text-white/90">{tagline}</p>
        <p className="mt-6 max-w-sm text-sm text-white/80">
          Enrollment, clearance, grades and document requests, online. No more standing in line.
        </p>
      </div>
    </div>
  )
}
