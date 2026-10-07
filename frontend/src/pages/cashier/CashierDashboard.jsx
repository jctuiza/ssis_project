import { Receipt, Banknote, Clock, CheckCircle2, FileText } from 'lucide-react'
import StaffDashboard from '../../components/dashboard/StaffDashboard'
import RowList from '../../components/dashboard/RowList'
import useService from '../../hooks/useService'
import { peso } from '../../utils/format'
import * as cashierService from '../../services/cashier/cashierService'

export default function CashierDashboard() {
  const state = useService(cashierService.getDashboard, [], "pages/cashier/CashierDashboard.jsx:1")
  return (
    <StaffDashboard
      state={state}
      description="A quick view of transactions and balances that need follow-up."
      build={(d) => ({
        stats: [
          { label: 'Total transactions', value: d.totals.transactions, icon: Receipt },
          { label: "Today's transactions", value: d.totals.today, icon: Banknote },
          { label: 'Pending payments', value: d.totals.pending, icon: Clock },
          { label: 'Paid transactions', value: d.totals.paid, icon: CheckCircle2 },
        ],
        links: [
          { label: 'Open payments', page: 'payments', icon: Banknote },
          { label: 'Document fees', page: 'document-fees', icon: FileText },
          { label: 'View transactions', page: 'transactions', icon: Receipt },
        ],
        activities: d.activities,
        panel: {
          title: 'Outstanding balances',
          description: `Total outstanding: ${peso(d.totals.outstanding)}`,
          content: <RowList rows={d.topBalances.map((a) => ({ id: a.id, title: a.studentName, subtitle: a.program, right: <span className="text-sm font-semibold text-slate-900 dark:text-white">{peso(a.balance)}</span> }))} />,
        },
      })}
    />
  )
}

