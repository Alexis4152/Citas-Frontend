import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { ArrowLeft, BadgeCheck, Building2, CalendarClock, Wallet } from 'lucide-react'
import { Link, useNavigate } from '../router'
import { getDoctorDetail, getDoctorAvailability } from '../api/publicCatalog'
import SlotPicker from '../components/SlotPicker'
import { Avatar, Skeleton } from '../components/ui'
import usePolling from '../hooks/usePolling'
import useAvailabilityStream from '../hooks/useAvailabilityStream'
import { holderKey } from '../api/slotHolds'
import { resolveMediaUrl } from '../utils/media'
import { formatMoney, hasPrice } from '../utils/money'

function todayIso() {
  return new Date().toISOString().slice(0, 10)
}

function addDaysIso(iso, n) {
  const [y, m, d] = iso.split('-').map(Number)
  const date = new Date(y, m - 1, d + n)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

export default function DoctorDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [doctor, setDoctor] = useState(null)
  const [days, setDays] = useState([])
  const [loadingAvailability, setLoadingAvailability] = useState(true)
  const [fromDate, setFromDate] = useState(todayIso())

  useEffect(() => {
    getDoctorDetail(id).then((r) => setDoctor(r.data.data)).catch(() => {})
  }, [id])

  const load = useCallback((quiet) => {
    if (!quiet) setLoadingAvailability(true)
    return getDoctorAvailability(id, fromDate, 7, holderKey())
      .then((r) => setDays(r.data.data))
      .catch(() => {})
      .finally(() => setLoadingAvailability(false))
  }, [id, fromDate])

  useEffect(() => { load() }, [load])
  const live = useAvailabilityStream(id, () => load(true))
  usePolling(() => load(true), live ? 60000 : 15000)

  function handleSelectSlot(date, slot) {
    navigate('/agendar', { state: { doctor, date, startTime: slot.startTime } })
  }

  if (!doctor) {
    return (
      <div className="container-app space-y-4 py-10">
        <Skeleton className="h-40 rounded-3xl" />
        <Skeleton className="h-96 rounded-3xl" />
      </div>
    )
  }

  const priced = hasPrice(doctor.consultationPrice)

  return (
    <div>
      <section className="aurora grain relative overflow-hidden text-white">
        <div className="grid-lines absolute inset-0" />
        <div className="container-app relative py-10 sm:py-14">
          <Link to="/doctores" className="mb-6 inline-flex items-center gap-1.5 text-sm text-white/60 hover:text-white">
            <ArrowLeft className="h-4 w-4" /> Doctores
          </Link>
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
            <Avatar first={doctor.firstName} last={doctor.lastName} src={doctor.photoUrl ? resolveMediaUrl(doctor.photoUrl) : null} size="h-24 w-24 text-2xl" />
            <div className="min-w-0">
              <p className="mb-1 inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-primary-100 ring-1 ring-white/15">
                {doctor.specialty?.name}
              </p>
              <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">Dr(a). {doctor.firstName} {doctor.lastName}</h1>
              {doctor.licenseNumber && (
                <p className="mt-2 flex items-center gap-1.5 text-sm text-white/60"><BadgeCheck className="h-4 w-4 text-emerald-300" /> Cédula profesional {doctor.licenseNumber}</p>
              )}
            </div>
          </div>
        </div>
      </section>

      <div className="container-app grid gap-6 py-8 lg:grid-cols-[320px_1fr]">
        <aside className="h-fit space-y-4 lg:sticky lg:top-24">
          <div className="card divide-y divide-slate-100">
            <Info icon={Wallet} label="Consulta" value={priced ? formatMoney(doctor.consultationPrice) : 'Precio por confirmar en recepción'} strong={priced} />
            <Info icon={Building2} label="Sedes" value={doctor.branches?.map((b) => b.name).join(' · ') || 'Sin sede asignada'} />
          </div>
          {doctor.bio && (
            <div className="card p-5">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">Sobre el doctor</p>
              <p className="whitespace-pre-line text-sm leading-relaxed text-slate-600">{doctor.bio}</p>
            </div>
          )}
        </aside>

        <div className="card p-5 sm:p-7">
          <div className="mb-5 flex items-start gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary-50 text-primary-600 ring-1 ring-primary-100"><CalendarClock className="h-5 w-5" /></div>
            <div>
              <h2 className="font-display text-xl font-semibold text-slate-900">Horarios disponibles</h2>
              <p className="text-sm text-slate-500">Elige uno para continuar; te lo apartamos mientras terminas de agendar.</p>
            </div>
          </div>
          <SlotPicker days={days} loading={loadingAvailability} live={live} onSelect={handleSelectSlot}
            canGoBack={fromDate > todayIso()}
            onPrevWeek={() => setFromDate((d) => { const prev = addDaysIso(d, -7); return prev < todayIso() ? todayIso() : prev })}
            onNextWeek={() => setFromDate((d) => addDaysIso(d, 7))} />
        </div>
      </div>
    </div>
  )
}

function Info({ icon: Icon, label, value, strong }) {
  return (
    <div className="flex items-start gap-3 p-5">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
      <div>
        <p className="text-xs text-slate-400">{label}</p>
        <p className={strong ? 'font-display text-xl font-semibold text-slate-900' : 'text-sm font-medium text-slate-700'}>{value}</p>
      </div>
    </div>
  )
}
