import PageHeader from '../ui/PageHeader'
import Card from '../ui/Card'
import DataTable from '../tables/DataTable'
import AsyncView from '../feedback/AsyncView'
import useService from '../../hooks/useService'

// Generic "header + table" page driven by a service function. Used by most list pages.
export default function ResourcePage({
  eyebrow, title, description, load, deps = [], columns, searchKeys, searchPlaceholder, filter,
  rowKey, pageSize, actions, headerAction, summary, empty, loadingRowCount, headerContent,
}) {
  const { data, loading, error } = useService(load, deps, `resource:${title}`)
  return (
    <div className="space-y-6">
      <PageHeader eyebrow={eyebrow} title={title} description={description} action={headerAction} />
      {headerContent}
      <AsyncView loading={loading} error={error} hasData={data != null} skeleton={<Card padded={false}><DataTable columns={columns} rows={data ?? []} loading loadingRowCount={loadingRowCount} rowKey={rowKey} searchKeys={searchKeys} searchPlaceholder={searchPlaceholder} filter={filter} pageSize={pageSize} actions={actions} /></Card>}>
        {data && summary && summary(data)}
        {data && (
          <Card padded={false}>
            <DataTable columns={columns} rows={data} rowKey={rowKey} searchKeys={searchKeys} searchPlaceholder={searchPlaceholder} filter={filter} pageSize={pageSize} actions={actions} empty={empty} />
          </Card>
        )}
      </AsyncView>
    </div>
  )
}

