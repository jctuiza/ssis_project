import { DataLoading } from '../../context/DataLoading'
import ScreenSkeleton from '../../components/loading/ScreenSkeleton'
import { Camera } from 'lucide-react'
import PageHeader from '../../components/ui/PageHeader'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import AsyncView from '../../components/feedback/AsyncView'
import StudentIDCard from '../../components/student/StudentIDCard'
import useService from '../../hooks/useService'
import { useSession } from '../../context/session'
import * as studentService from '../../services/student/studentService'

export default function StudentID() {
  const { user, navigate } = useSession()
  const { data: received, loading, error } = useService(() => studentService.getIdCard(user.id), [user.id], "pages/student/StudentID.jsx:1")

  const waiting = loading && received == null
  const data = received ?? { ...user, id: user.id, term: '', emergencyName: user.emergencyName, emergencyContact: user.emergencyContact, signature: user.name }
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader eyebrow="Student ID"/>
      <DataLoading value={waiting}>
      {error && <p role="alert" className="text-rose-500">{error.message}</p>}
        {data && (
          <>
            {/* The photo comes straight from the session, so a new profile picture shows here instantly. */}
            <StudentIDCard card={data} photo={user.photo} />
            <Card>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Your ID uses your current profile picture. To change it, update your picture on the Profile page. Other details can only be changed by the registrar.
                </p>
                <Button variant="outline" onClick={() => navigate('profile')} className="shrink-0"><Camera className="h-4 w-4" />Change profile picture</Button>
              </div>
            </Card>
          </>
        )}
      </DataLoading>
    </div>
  )
}

