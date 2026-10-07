export default function Skeleton({ className = '', circle = false, style }) {
  return <div aria-hidden="true" style={style} className={`ssis-skeleton ${circle ? 'rounded-full' : 'rounded-md'} ${className}`} />
}
export function LoadingRegion({ children, className = '' }) {
  return <div role="status" aria-live="polite" aria-busy="true" className={className}><span className="sr-only">Loading content</span><div aria-hidden="true">{children}</div></div>
}

