import PageHeader from '../common/PageHeader'
import Card from '../common/Card'
import DataTable from '../common/DataTable'
import AsyncView from '../common/AsyncView'
import useService from '../../hooks/useService'

// Generic "header + table" page driven by a service function. Used by most list pages.
export default function ResourcePage({
  eyebrow, title, description, load, deps = [], columns, searchKeys, searchPlaceholder, filter,
  rowKey, pageSize, actions, headerAction, summary, empty,
}) {
  const { data, loading, error } = useService(load, deps)
  return (
    <div className="space-y-6">
      <PageHeader eyebrow={eyebrow} title={title} description={description} action={headerAction} />
      <AsyncView loading={loading} error={error}>
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
