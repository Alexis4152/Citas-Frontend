import { useEffect, useState } from 'react'
import {
  ArrowRight, BellRing, CalendarCheck2, CalendarClock, CalendarPlus, Clock3, HeartPulse, Lock, Search, ShieldCheck, Sparkles, Stethoscope,
} from 'lucide-react'
import { Link } from '../router'
import { useAuth } from '../context/AuthContext'
import { useHospitalConfig } from '../context/HospitalConfigContext'
import { getSpecialties, searchDoctors } from '../api/publicCatalog'
import { Avatar } from '../components/ui'
import { resolveMediaUrl } from '../utils/media'
import { formatMoney, hasPrice } from '../utils/money'

export default function Home() {
  const { user } = useAuth()
  const { config } = useHospitalConfig()
  const [specialties, setSpecialties] = useState([])
  const [doctors, setDoctors] = useState([])

  useEffect(() => {
    getSpecialties().then((r) => setSpecialties(r.data.data || [])).catch(() => {})
    searchDoctors({ page: 0, size: 6 }).then((r) => setDoctors(r.data.data?.content || [])).catch(() => {})
  }, [])

  return (
    <div>
      {/* Hero */}
      <section className="aurora grain relative overflow-hidden text-white">
        <div className="grid-lines absolute inset-0" />
        <div className="container-app relative grid items-center gap-12 py-16 sm:py-24 lg:grid-cols-[1.1fr_.9fr]">
          <div className="animate-fade-up">
            <p className="mb-5 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-sky-200 ring-1 ring-white/15">
              <Sparkles className="h-3.5 w-3.5" /> Agenda en línea las 24 horas
            </p>
            <h1 className="font-display text-4xl font-medium leading-[1.05] tracking-tight sm:text-6xl">
              {config?.name || 'Hospital'}
              <span className="mt-2 block italic text-primary-200">tu cita en minutos.</span>
            </h1>
            <p className="mt-6 max-w-xl text-lg text-white/70">
              {config?.description || 'Elige a tu especialista, ve sus horarios libres en tiempo real y confirma sin llamadas ni filas.'}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/agendar" className="btn-primary btn-lg"><CalendarPlus className="h-5 w-5" /> Agendar cita</Link>
              <Link to="/doctores" className="btn btn-lg bg-white/10 text-white ring-1 ring-inset ring-white/20 hover:bg-white/15">
                <Search className="h-5 w-5" /> Ver doctores
              </Link>
            </div>
            {!user && (
              <p className="mt-5 text-sm text-white/60">
                ¿Ya tienes cuenta? <Link to="/login" className="font-semibold text-white underline-offset-4 hover:underline">Inicia sesión</Link>
              </p>
            )}
          </div>

          {/* Tarjeta ilustrativa: así se ven los horarios en vivo */}
          <div className="relative hidden lg:block">
            <div className="glass animate-float rounded-3xl p-6 shadow-2xl">
              <div className="mb-4 flex items-center justify-between">
                <p className="text-sm font-semibold">Horarios de hoy</p>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-400/15 px-2.5 py-1 text-[11px] font-semibold text-emerald-300">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" /> En vivo
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-sm font-semibold">
                {['09:00', '09:30', '10:00', '10:30', '11:00', '11:30'].map((t, i) => (
                  <span key={t} className={`flex h-11 items-center justify-center gap-1 rounded-xl ${
                    i === 2 ? 'bg-primary-500 text-white' : i === 4 ? 'bg-amber-300/20 text-amber-200 ring-1 ring-amber-300/40' : i === 1 ? 'bg-white/5 text-white/30 line-through' : 'bg-white/10 text-white'}`}>
                    {i === 4 && <Lock className="h-3 w-3" />}{t}
                  </span>
                ))}
              </div>
              <div className="mt-5 flex items-center gap-3 rounded-2xl bg-emerald-400/10 p-3 ring-1 ring-emerald-300/20">
                <Clock3 className="h-5 w-5 text-emerald-300" />
                <p className="text-xs text-white/80"><span className="font-semibold text-white">10:00 apartado para ti</span> · 9:42 para confirmar</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Especialidades */}
      {specialties.length > 0 && (
        <section className="container-app -mt-8 relative z-10">
          <div className="card flex flex-wrap items-center gap-2 p-4 sm:p-5">
            <span className="mr-2 flex items-center gap-2 text-sm font-semibold text-slate-700"><Stethoscope className="h-4 w-4 text-primary-600" /> Especialidades</span>
            {specialties.slice(0, 10).map((s) => (
              <Link key={s.id} to="/doctores" state={{ specialtyId: s.id }}
                className="rounded-full bg-slate-50 px-3.5 py-1.5 text-sm font-medium text-slate-700 ring-1 ring-slate-200 transition hover:bg-primary-50 hover:text-primary-700 hover:ring-primary-200">
                {s.name}
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Cómo funciona */}
      <section className="container-app py-16 sm:py-20">
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <p className="eyebrow mb-3">Así de fácil</p>
          <h2 className="font-display text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">Tu cita en tres pasos</h2>
        </div>
        <div className="grid gap-5 md:grid-cols-3">
          {[
            [Search, 'Elige a tu especialista', 'Filtra por especialidad y sede, y conoce precio y horarios antes de decidir.'],
            [CalendarClock, 'Aparta tu horario', 'Ves los lugares libres en vivo. Al elegir uno, te lo guardamos mientras terminas.'],
            [CalendarCheck2, 'Recibe tu confirmación', 'Te llega por correo con un enlace para cancelar o reprogramar cuando quieras.'],
          ].map(([Icon, title, text], i) => (
            <div key={title} className="card card-hover relative overflow-hidden p-6">
              <span className="absolute right-5 top-4 font-display text-6xl font-semibold text-slate-100">{i + 1}</span>
              <div className="relative mb-5 grid h-12 w-12 place-items-center rounded-2xl bg-primary-50 text-primary-600 ring-1 ring-primary-100">
                <Icon className="h-6 w-6" />
              </div>
              <h3 className="relative font-display text-lg font-semibold text-slate-900">{title}</h3>
              <p className="relative mt-2 text-sm text-slate-500">{text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Doctores */}
      {doctors.length > 0 && (
        <section className="bg-white py-16 sm:py-20">
          <div className="container-app">
            <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="eyebrow mb-3">Nuestro equipo</p>
                <h2 className="font-display text-3xl font-semibold tracking-tight text-slate-900">Conoce a nuestros doctores</h2>
              </div>
              <Link to="/doctores" className="btn-secondary">Ver todos <ArrowRight className="h-4 w-4" /></Link>
            </div>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {doctors.map((d) => (
                <Link key={d.id} to={`/doctores/${d.id}`} className="card card-hover group flex items-center gap-4 p-5">
                  <Avatar first={d.firstName} last={d.lastName} src={d.photoUrl ? resolveMediaUrl(d.photoUrl) : null} size="h-14 w-14 text-base" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-slate-900">Dr(a). {d.firstName} {d.lastName}</p>
                    <p className="truncate text-sm font-medium text-primary-700">{d.specialty?.name}</p>
                    <p className="mt-1 text-xs text-slate-500">{hasPrice(d.consultationPrice) ? formatMoney(d.consultationPrice) : 'Precio en recepción'}</p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-slate-300 transition group-hover:translate-x-1 group-hover:text-primary-600" />
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Confianza */}
      <section className="container-app py-16 sm:py-20">
        <div className="grid gap-5 md:grid-cols-3">
          {[
            [BellRing, 'Recordatorios', 'Te avisamos por correo 2 horas antes de tu cita.'],
            [HeartPulse, 'Tu información médica', 'Tu doctor ve tus alergias y tipo de sangre antes de atenderte.'],
            [ShieldCheck, 'Tus datos protegidos', 'Puedes ejercer tus derechos ARCO cuando quieras.'],
          ].map(([Icon, title, text]) => (
            <div key={title} className="flex items-start gap-4 rounded-2xl p-2">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-ink-900 text-primary-300"><Icon className="h-5 w-5" /></div>
              <div>
                <h3 className="font-semibold text-slate-900">{title}</h3>
                <p className="mt-1 text-sm text-slate-500">{text}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
