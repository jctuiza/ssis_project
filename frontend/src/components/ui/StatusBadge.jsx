const green = 'bg-emerald-50 text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-300'
const amber = 'bg-amber-50 text-amber-700 dark:bg-amber-400/10 dark:text-amber-300'
const violet = 'bg-violet-50 text-violet-700 dark:bg-violet-400/10 dark:text-violet-300'
const rose = 'bg-rose-50 text-rose-700 dark:bg-rose-400/10 dark:text-rose-300'
const sky = 'bg-sky-50 text-sky-700 dark:bg-sky-400/10 dark:text-sky-300'
const slate = 'bg-slate-100 text-slate-600 dark:bg-slate-500/15 dark:text-slate-300'

const styles = {
  // document requests
  Submitted: slate, 'Under Review': violet, Approved: violet, 'Pending Payment': amber, 'Payment Recorded': sky,
  Processing: violet, 'Ready for Release': sky, Completed: green, Rejected: rose,
  // shared
  Pending: amber,
  Cleared: green, 'On Hold': rose, Paid: green, 'Fully Paid': green, 'Partially Paid': amber, Unpaid: rose, Outstanding: rose,
  Cancelled: slate, Waived: slate,
  Enrolled: green, 'Not Enrolled': slate, Active: green, Inactive: slate,
}

export default function StatusBadge({ status }) {
  return (
    <span className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium ${styles[status] ?? slate}`}>
      {status}
    </span>
  )
}

