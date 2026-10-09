import PageHeader from '../ui/PageHeader'
import Card from '../ui/Card'
import DataTable from '../tables/DataTable'
import useService from '../../hooks/useService'
export default function ResourcePage({ eyebrow,title,description,load,deps=[],columns,searchKeys,searchPlaceholder,filter,rowKey,pageSize,actions,headerAction,summary,empty,loadingRowCount,headerContent }) {
  const { data,loading,error,reload } = useService(load,deps,`resource:${title}`)
  return <div className="space-y-6">
    <PageHeader eyebrow={eyebrow} title={title} description={description} action={headerAction} />
    {headerContent}
    {error && <p role="alert" className="rounded-xl bg-rose-500/10 px-4 py-3 text-sm text-rose-500">{data != null ? 'Showing saved records. ' : ''}{error.message} <button className="underline" onClick={reload}>Retry</button></p>}
    {data && summary && summary(data)}
    <Card padded={false}><DataTable columns={columns} rows={data ?? []} loading={loading && data == null} loadingRowCount={loadingRowCount} rowKey={rowKey} searchKeys={searchKeys} searchPlaceholder={searchPlaceholder} filter={filter} pageSize={pageSize} actions={actions} empty={error && data == null ? 'Records could not be loaded.' : empty} /></Card>
  </div>
}
