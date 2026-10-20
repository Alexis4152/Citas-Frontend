import { useCallback, useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import {
  ArrowLeft, ArrowRight, Building2, CalendarClock, CreditCard, Hourglass, Landmark, Lock, MapPin, Search,
  Stethoscope, Store, Timer, Wallet,
} from 'lucide-react'
import { useNavigate } from '../router'
import { getSpecialties, searchDoctors, getDoctorAvailability } from '../api/publicCatalog'
import { bookGuestAppointment, bookOwnAppointment } from '../api/appointments'
import { prepayByToken, prepayOwn } from '../api/payments'
import { useAuth } from '../context/AuthContext'
import { useNotify } from '../context/NotifyContext'
import SlotPicker from '../components/SlotPicker'
import LoadingOverlay from '../components/LoadingOverlay'
import RecommendationsNotice from '../components/RecommendationsNotice'
import MedicalInfoFields, { EMPTY_MEDICAL_INFO, toMedicalInfoPayload } from '../components/MedicalInfoFields'
import WizardSteps from '../components/WizardSteps'
import CardFields from '../components/CardFields'
import { Avatar } from '../components/ui'
import useSlotHold, { formatCountdown, isSlotHeldError } from '../hooks/useSlotHold'
import usePolling from '../hooks/usePolling'
import useAvailabilityStream from '../hooks/useAvailabilityStream'
import { EMPTY_CARD, isOnlinePaymentEnabled, tokenizeFields } from '../utils/openpay'
import { formatMoney, hasPrice } from '../utils/money'
import { formatDateOnly, formatTimeOnly } from '../utils/format'
import { onlyDigits, PHONE_INPUT_PROPS } from '../utils/phone'
import { resolveMediaUrl } from '../utils/media'
import { emailError, nameError, phoneError } from '../utils/validators'

function todayIso() {
  return new Date().toISOString().slice(0, 10)
}

function addDaysIso(iso, n) {
  const [y, m, d] = iso.split('-').map(Number)
  const date = new Date(y, m - 1, d + n)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

const STEPS = ['Doctor', 'Sede', 'Horario', 'Datos', 'Pago']

/**
 * Asistente de reserva de cita (público y paciente con cuenta). Al elegir un horario se
 * APARTA unos minutos (ver useSlotHold / SlotHoldService): mientras la persona llena sus datos
 * nadie más puede tomarlo -- los demás lo ven como "alguien lo está apartando" -- y si cambia
 * de horario, se sale o vence el tiempo, vuelve a quedar libre. La disponibilidad se refresca
 * sola cada pocos segundos para que lo que se ve sea lo que de verdad está libre.
 *
 * Puede llegar "en frío" (paso 0) o con un doctor y horario ya elegidos desde DoctorDetail.jsx
 * (router state: { doctor, date, startTime }).
 */
export default function BookAppointment() {
  const location = useLocation()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { notify } = useNotify()
  const slotHold = useSlotHold()

  const initialDoctor = location.state?.doctor || null
  const initialDate = location.state?.date || null
  const initialStartTime = location.state?.startTime || null

  const [specialties, setSpecialties] = useState([])
  const [specialtyId, setSpecialtyId] = useState('')
  const [doctorsList, setDoctorsList] = useState([])
  const [loadingDoctors, setLoadingDoctors] = useState(false)
  const [doctor, setDoctor] = useState(initialDoctor)
  const [branchId, setBranchId] = useState(
    initialDoctor?.branches?.length === 1 ? String(initialDoctor.branches[0].id) : ''
  )

  const [fromDate, setFromDate] = useState(initialDate || todayIso())
  const [days, setDays] = useState([])
  const [loadingAvailability, setLoadingAvailability] = useState(false)
  const [selectedDate, setSelectedDate] = useState(initialDate)
  const [selectedTime, setSelectedTime] = useState(initialStartTime)
  const [holdingKey, setHoldingKey] = useState(null)

  const [patient, setPatient] = useState({ firstName: '', lastName: '', phone: '', email: '' })
  const [touched, setTouched] = useState({})
  const [reasonForVisit, setReasonForVisit] = useState('')
  const [medicalInfo, setMedicalInfo] = useState(EMPTY_MEDICAL_INFO)
  const [submitting, setSubmitting] = useState(false)
  const [payChoice, setPayChoice] = useState('RECEPTION')
  const [card, setCard] = useState(EMPTY_CARD)
  const [onlinePayments, setOnlinePayments] = useState(false)
  useEffect(() => { isOnlinePaymentEnabled().then(setOnlinePayments) }, [])

  function computeInitialStep() {
    if (!initialDoctor) return 0
    if (initialDoctor.branches?.length > 1) return 1
    if (!initialDate || !initialStartTime) return 2
    return 2
  }
  const [step, setStep] = useState(computeInitialStep())

  useEffect(() => {
    getSpecialties().then((r) => setSpecialties(r.data.data)).catch(() => {})
  }, [])

  useEffect(() => {
    if (step !== 0) return
    setLoadingDoctors(true)
    searchDoctors({ specialtyId: specialtyId || undefined, page: 0, size: 100 })
      .then((r) => setDoctorsList(r.data.data.content))
      .catch(() => {})
      .finally(() => setLoadingDoctors(false))
  }, [step, specialtyId])

  const loadAvailability = useCallback((quiet = false) => {
    if (!doctor) return Promise.resolve()
    if (!quiet) setLoadingAvailability(true)
    return getDoctorAvailability(doctor.id, fromDate, 7, slotHold.holderKey)
      .then((r) => setDays(r.data.data))
      .catch(() => {})
      .finally(() => setLoadingAvailability(false))
  }, [doctor, fromDate, slotHold.holderKey])

  useEffect(() => {
    if (step >= 2 && doctor) loadAvailability()
  }, [step, doctor, fromDate, loadAvailability])

  // En vivo: mientras se elige horario, se ve al instante lo que otros apartan o reservan
  // (avisos del servidor); el refresco periódico queda de respaldo por si se cae la conexión.
  const live = useAvailabilityStream(doctor?.id, () => loadAvailability(true), step === 2)
  usePolling(() => { if (step === 2) loadAvailability(true) }, live ? 60000 : 12000)

  // Llegó con un horario elegido (desde el perfil del doctor): se aparta en cuanto hay sede.
  useEffect(() => {
    if (step === 2 && doctor && branchId && selectedDate && selectedTime && !slotHold.hold) {
      tryHold(selectedDate, { startTime: selectedTime }, true)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, doctor, branchId])

  async function tryHold(date, slot, silent = false) {
    setHoldingKey(`${date}|${slot.startTime}`)
    try {
      await slotHold.acquire(doctor.id, Number(branchId), date, slot.startTime)
      setSelectedDate(date)
      setSelectedTime(slot.startTime)
      return true
    } catch (err) {
      setSelectedDate(null)
      setSelectedTime(null)
      if (!silent || isSlotHeldError(err) || err.response?.status === 409) {
        notify(err.response?.data?.message || 'No pudimos apartar ese horario', isSlotHeldError(err) ? 'warning' : 'error')
      }
      loadAvailability(true)
      return false
    } finally {
      setHoldingKey(null)
    }
  }

  function changeDoctor(next) {
    if (slotHold.hold) slotHold.release()
    setSelectedDate(null)
    setSelectedTime(null)
    setDoctor(next)
  }

  function handleDoctorContinue() {
    if (!doctor) return
    if (doctor.branches?.length === 1) setBranchId(String(doctor.branches[0].id))
    setStep(doctor.branches?.length > 1 ? 1 : 2)
  }

  function handleSelectSlot(date, slot) {
    if (selectedDate === date && selectedTime === slot.startTime && slotHold.hold && !slotHold.expired) return
    tryHold(date, slot)
  }

  async function handleDatetimeContinue() {
    if (!selectedDate || !selectedTime) return
    // Si el apartado venció mientras pensaba, se intenta de nuevo antes de seguir.
    if (!slotHold.hold || slotHold.expired) {
      const ok = await tryHold(selectedDate, { startTime: selectedTime })
      if (!ok) return
    }
    setStep(3)
  }

  const dataErrors = user ? {} : {
    firstName: nameError(patient.firstName),
    lastName: nameError(patient.lastName),
    phone: phoneError(patient.phone),
    email: emailError(patient.email, false),
  }
  const showError = (f) => (touched[f] ? dataErrors[f] : null)

  function handleDataSubmit(e) {
    e.preventDefault()
    setTouched({ firstName: true, lastName: true, phone: true, email: true })
    if (Object.values(dataErrors).some(Boolean)) {
      notify('Revisa los datos marcados en rojo', 'error')
      return
    }
    setStep(4)
  }

  const priced = hasPrice(doctor?.consultationPrice)

  async function handleFinalSubmit(e) {
    e.preventDefault()
    setSubmitting(true)
    try {
      const cardToken = priced && payChoice === 'CARD' ? await tokenizeFields(card) : null
      const basePayload = {
        doctorId: doctor.id,
        branchId: Number(branchId),
        appointmentDate: selectedDate,
        startTime: selectedTime,
        reasonForVisit: reasonForVisit.trim() || undefined,
        medicalInfo: toMedicalInfoPayload(medicalInfo),
        holdToken: slotHold.hold?.token,
        holderKey: slotHold.holderKey,
      }
      const res = user
        ? await bookOwnAppointment(basePayload)
        : await bookGuestAppointment({
          ...basePayload,
          firstName: patient.firstName.trim(), lastName: patient.lastName.trim(), phone: patient.phone,
          email: patient.email.trim() || undefined,
        })
      const appointment = res.data.data
      slotHold.forget()

      // Pago anticipado: DESPUÉS de agendar (el horario ya es suyo). Si el cobro falla, la cita
      // sigue en pie y se paga en recepción -- nunca se pierde el horario por una tarjeta.
      let payment = null
      let paymentError = null
      if (priced && payChoice !== 'RECEPTION') {
        try {
          const body = payChoice === 'CARD' ? { method: 'OPENPAY_CARD', ...cardToken } : { method: 'OPENPAY_SPEI' }
          const payRes = user ? await prepayOwn(appointment.id, body) : await prepayByToken(appointment.cancelToken, body)
          payment = payRes.data.data
        } catch (payErr) {
          paymentError = payErr.response?.data?.message || 'No se pudo procesar el pago'
        }
      }
      navigate('/cita-confirmada', { state: { appointment, payment, paymentError } })
    } catch (err) {
      const message = err.response?.data?.message || (err.response ? 'No se pudo agendar la cita' : err.message)
      notify(message, isSlotHeldError(err) ? 'warning' : 'error')
      // Se lo ganaron (o lo apartó alguien tras vencer el nuestro): de vuelta a elegir horario.
      if (err.response?.status === 409) {
        slotHold.forget()
        setSelectedDate(null)
        setSelectedTime(null)
        setStep(2)
      }
    } finally {
      setSubmitting(false)
    }
  }

  const selectedBranch = doctor?.branches?.find((b) => String(b.id) === String(branchId))
  const holdActive = slotHold.hold && !slotHold.expired
  const filteredDoctors = doctorsList

  return (
    <div className="aurora-soft min-h-[70vh]">
      <div className="container-app py-8 sm:py-10">
        <LoadingOverlay show={submitting} message="Agendando tu cita..." />
        <div className="mb-8 animate-fade-up">
          <p className="eyebrow mb-2">Agenda en línea</p>
          <h1 className="font-display text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">Agenda tu cita</h1>
          <p className="mt-2 text-slate-500">En unos pasos, sin llamadas. Los horarios que ves están libres en este momento.</p>
        </div>

        <WizardSteps steps={STEPS} currentStep={step} />

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_340px]">
          <div className="card p-5 sm:p-7">
            {step === 0 && (
              <div className="space-y-5 animate-fade-up">
                <StepTitle icon={Stethoscope} title="¿Con quién quieres tu cita?" subtitle="Filtra por especialidad y elige a tu doctor." />
                <div className="flex flex-wrap gap-2">
                  <FilterChip active={!specialtyId} onClick={() => { setSpecialtyId(''); changeDoctor(null) }}>Todas</FilterChip>
                  {specialties.map((s) => (
                    <FilterChip key={s.id} active={String(specialtyId) === String(s.id)} onClick={() => { setSpecialtyId(String(s.id)); changeDoctor(null) }}>
                      {s.name}
                    </FilterChip>
                  ))}
                </div>
                {loadingDoctors ? (
                  <div className="grid gap-3 sm:grid-cols-2">{Array.from({ length: 4 }, (_, i) => <div key={i} className="skeleton h-20 rounded-2xl" />)}</div>
                ) : filteredDoctors.length === 0 ? (
                  <div className="flex flex-col items-center rounded-2xl bg-slate-50 py-10 text-center ring-1 ring-inset ring-slate-200">
                    <Search className="mb-2 h-6 w-6 text-slate-400" />
                    <p className="text-sm text-slate-600">No hay doctores en esta especialidad.</p>
                  </div>
                ) : (
                  <div className="grid max-h-[460px] gap-3 overflow-y-auto pr-1 sm:grid-cols-2">
                    {filteredDoctors.map((d) => {
                      const active = doctor?.id === d.id
                      return (
                        <button key={d.id} type="button" onClick={() => changeDoctor(d)}
                          className={`flex items-center gap-3 rounded-2xl p-3.5 text-left transition ${active ? 'bg-primary-50 ring-2 ring-primary-500' : 'bg-white ring-1 ring-slate-200 hover:ring-primary-300'}`}>
                          <Avatar first={d.firstName} last={d.lastName} src={d.photoUrl ? resolveMediaUrl(d.photoUrl) : null} size="h-12 w-12 text-sm" />
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-semibold text-slate-900">Dr(a). {d.firstName} {d.lastName}</p>
                            <p className="truncate text-xs font-medium text-primary-700">{d.specialty?.name}</p>
                            <p className="mt-0.5 truncate text-xs text-slate-500">
                              {hasPrice(d.consultationPrice) ? formatMoney(d.consultationPrice) : 'Precio en recepción'} · {d.branches?.map((b) => b.name).join(', ')}
                            </p>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                )}
                <StepNav onNext={handleDoctorContinue} nextDisabled={!doctor} />
              </div>
            )}

            {step === 1 && doctor && (
              <form onSubmit={(e) => { e.preventDefault(); setStep(2) }} className="space-y-5 animate-fade-up">
                <StepTitle icon={Building2} title="¿En qué sede?" subtitle={`Dr(a). ${doctor.firstName} ${doctor.lastName} atiende en varias.`} />
                <div className="grid gap-3 sm:grid-cols-2">
                  {doctor.branches.map((b) => {
                    const active = String(branchId) === String(b.id)
                    return (
                      <label key={b.id} className={`flex cursor-pointer items-start gap-3 rounded-2xl p-4 transition ${active ? 'bg-primary-50 ring-2 ring-primary-500' : 'bg-white ring-1 ring-slate-200 hover:ring-primary-300'}`}>
                        <input type="radio" name="branch" required className="mt-1 accent-primary-600" checked={active} onChange={() => setBranchId(String(b.id))} />
                        <span>
                          <span className="block font-semibold text-slate-900">{b.name}</span>
                          <span className="mt-0.5 flex items-center gap-1 text-xs text-slate-500"><MapPin className="h-3.5 w-3.5" /> {b.address}{b.city ? `, ${b.city}` : ''}</span>
                        </span>
                      </label>
                    )
                  })}
                </div>
                <StepNav onBack={() => setStep(0)} submit nextDisabled={!branchId} />
              </form>
            )}

            {step === 2 && doctor && (
              <div className="space-y-5 animate-fade-up">
                <StepTitle icon={CalendarClock} title="Elige día y hora" subtitle="Al elegir un horario te lo apartamos unos minutos mientras terminas." />
                <SlotPicker
                  days={days}
                  loading={loadingAvailability}
                  live={live}
                  selected={selectedDate && selectedTime ? { date: selectedDate, startTime: selectedTime } : null}
                  onSelect={handleSelectSlot}
                  busyTime={holdingKey}
                  canGoBack={fromDate > todayIso()}
                  onPrevWeek={() => setFromDate((d) => { const prev = addDaysIso(d, -7); return prev < todayIso() ? todayIso() : prev })}
                  onNextWeek={() => setFromDate((d) => addDaysIso(d, 7))}
                />
                {holdActive && <HoldBanner hold={slotHold.hold} secondsLeft={slotHold.secondsLeft} />}
                {slotHold.expired && (
                  <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800 ring-1 ring-inset ring-amber-600/20">
                    Tu apartado venció. Si nadie más tomó el horario, al continuar te lo volvemos a apartar.
                  </p>
                )}
                <StepNav onBack={() => { slotHold.release(); setSelectedDate(null); setSelectedTime(null); setStep(doctor.branches?.length > 1 ? 1 : 0) }}
                  onNext={handleDatetimeContinue} nextDisabled={!selectedDate || !selectedTime || Boolean(holdingKey)} />
              </div>
            )}

            {step === 3 && (
              <form onSubmit={handleDataSubmit} className="space-y-5 animate-fade-up" noValidate>
                <StepTitle icon={Hourglass} title={user ? 'Información para tu doctor' : 'Tus datos'}
                  subtitle={user ? 'Se actualiza en cada cita para que tu doctor tenga lo más reciente.' : 'Te mandamos la confirmación y el enlace para gestionar tu cita.'} />
                {!user && (
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <TextField label="Nombre" value={patient.firstName} error={showError('firstName')} autoComplete="given-name"
                      onBlur={() => setTouched((t) => ({ ...t, firstName: true }))} onChange={(v) => setPatient({ ...patient, firstName: v })} />
                    <TextField label="Apellido" value={patient.lastName} error={showError('lastName')} autoComplete="family-name"
                      onBlur={() => setTouched((t) => ({ ...t, lastName: true }))} onChange={(v) => setPatient({ ...patient, lastName: v })} />
                    <TextField label="Teléfono" value={patient.phone} error={showError('phone')} inputProps={PHONE_INPUT_PROPS}
                      onBlur={() => setTouched((t) => ({ ...t, phone: true }))} onChange={(v) => setPatient({ ...patient, phone: onlyDigits(v) })} />
                    <TextField label="Correo electrónico (opcional)" type="email" value={patient.email} error={showError('email')} autoComplete="email"
                      hint="Para mandarte la confirmación y el enlace de tu cita."
                      onBlur={() => setTouched((t) => ({ ...t, email: true }))} onChange={(v) => setPatient({ ...patient, email: v })} />
                  </div>
                )}
                <MedicalInfoFields value={medicalInfo} onChange={setMedicalInfo} idPrefix="book" />
                <div>
                  <label className="label" htmlFor="book-reason">Motivo de la consulta <span className="font-normal text-slate-400">(opcional)</span></label>
                  <textarea id="book-reason" className="input" rows={3} maxLength={1000} value={reasonForVisit} onChange={(e) => setReasonForVisit(e.target.value)}
                    placeholder="Ej. dolor de cabeza frecuente desde hace una semana" />
                  <p className="field-hint text-right">{reasonForVisit.length}/1000</p>
                </div>
                <StepNav onBack={() => setStep(2)} submit />
              </form>
            )}

            {step === 4 && (
              <form onSubmit={handleFinalSubmit} className="space-y-5 animate-fade-up">
                <StepTitle icon={Wallet} title="¿Cómo quieres pagar?" />
                {priced ? (
                  <>
                    <div className="flex items-center justify-between rounded-2xl bg-gradient-to-br from-primary-600 to-primary-800 px-5 py-4 text-white shadow-glow">
                      <span className="text-sm text-white/80">Precio de la consulta</span>
                      <span className="font-display text-3xl font-semibold">{formatMoney(doctor.consultationPrice)}</span>
                    </div>
                    <div className="grid gap-3">
                      {[
                        { value: 'RECEPTION', icon: Store, title: 'Pagar en recepción', hint: 'Al terminar tu consulta, en efectivo o con tarjeta.' },
                        { value: 'CARD', icon: CreditCard, title: 'Pago anticipado con tarjeta', hint: 'Cobro inmediato y seguro con OpenPay.' },
                        { value: 'SPEI', icon: Landmark, title: 'Transferencia (SPEI)', hint: 'Te mostramos la CLABE al confirmar; se marca pagada al acreditarse.' },
                      ].filter((o) => onlinePayments || o.value === 'RECEPTION').map((o) => {
                        const active = payChoice === o.value
                        return (
                          <label key={o.value} className={`flex cursor-pointer items-start gap-3 rounded-2xl p-4 transition ${active ? 'bg-primary-50 ring-2 ring-primary-500' : 'bg-white ring-1 ring-slate-200 hover:ring-primary-300'}`}>
                            <input type="radio" name="payChoice" className="sr-only" checked={active} onChange={() => setPayChoice(o.value)} disabled={submitting} />
                            <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${active ? 'bg-primary-600 text-white' : 'bg-slate-100 text-slate-500'}`}><o.icon className="h-5 w-5" /></span>
                            <span>
                              <span className="block font-semibold text-slate-900">{o.title}</span>
                              <span className="text-xs text-slate-500">{o.hint}</span>
                            </span>
                          </label>
                        )
                      })}
                    </div>
                    {payChoice === 'CARD' && <CardFields value={card} onChange={setCard} disabled={submitting} />}
                    <p className="flex items-start gap-2 rounded-xl bg-slate-50 px-4 py-3 text-xs text-slate-600 ring-1 ring-inset ring-slate-200">
                      <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                      Si cancelas una cita pagada con al menos 1 hora de anticipación, te reembolsamos el pago. Con menos de 1 hora, el reembolso queda a consideración del hospital.
                    </p>
                  </>
                ) : (
                  <div className="rounded-2xl bg-amber-50 px-5 py-4 text-sm text-amber-900 ring-1 ring-inset ring-amber-600/20">
                    El precio de la consulta se confirma en recepción, donde podrás pagar al terminar tu cita.
                  </div>
                )}
                <StepNav onBack={() => setStep(3)} submit disabled={submitting}
                  nextLabel={submitting ? 'Procesando...' : payChoice === 'RECEPTION' || !priced ? 'Confirmar cita' : 'Confirmar y pagar'} />
              </form>
            )}
          </div>

          <aside className="h-fit space-y-4 lg:sticky lg:top-24">
            <div className="card overflow-hidden">
              <div className="bg-gradient-to-br from-ink-900 to-ink-800 p-5 text-white">
                <p className="text-xs font-semibold uppercase tracking-[.16em] text-white/50">Tu cita</p>
                {doctor ? (
                  <div className="mt-3 flex items-center gap-3">
                    <Avatar first={doctor.firstName} last={doctor.lastName} src={doctor.photoUrl ? resolveMediaUrl(doctor.photoUrl) : null} size="h-12 w-12 text-sm" />
                    <div className="min-w-0">
                      <p className="truncate font-semibold">Dr(a). {doctor.firstName} {doctor.lastName}</p>
                      <p className="truncate text-xs text-primary-200">{doctor.specialty?.name}</p>
                    </div>
                  </div>
                ) : <p className="mt-3 text-sm text-white/60">Elige un doctor para empezar.</p>}
              </div>
              <dl className="divide-y divide-slate-100 text-sm">
                <SummaryRow icon={Building2} label="Sede" value={selectedBranch?.name} />
                <SummaryRow icon={CalendarClock} label="Fecha y hora"
                  value={selectedDate && selectedTime ? `${formatDateOnly(selectedDate)}, ${formatTimeOnly(selectedTime)}` : null} />
                <SummaryRow icon={Wallet} label="Consulta"
                  value={doctor ? (priced ? formatMoney(doctor.consultationPrice) : 'Por confirmar en recepción') : null} />
              </dl>
              {holdActive && step > 2 && (
                <div className="border-t border-slate-100 p-4"><HoldBanner hold={slotHold.hold} secondsLeft={slotHold.secondsLeft} compact /></div>
              )}
            </div>
            {doctor && (
              <div className="card p-5 text-sm text-slate-600">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">Antes de tu cita</p>
                <RecommendationsNotice text={doctor.specialty?.recommendations} className="space-y-1" />
              </div>
            )}
          </aside>
        </div>
      </div>
    </div>
  )
}

function HoldBanner({ secondsLeft, compact }) {
  const low = secondsLeft <= 60
  return (
    <div className={`flex items-center gap-3 rounded-2xl px-4 py-3 ring-1 ring-inset ${low ? 'bg-amber-50 text-amber-900 ring-amber-600/25' : 'bg-emerald-50 text-emerald-900 ring-emerald-600/20'}`}>
      <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${low ? 'bg-amber-500 text-white animate-pulse-ring' : 'bg-emerald-500 text-white'}`}>
        <Timer className="h-[18px] w-[18px]" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">Horario apartado para ti</p>
        {!compact && <p className="text-xs opacity-80">Nadie más puede tomarlo mientras terminas.</p>}
      </div>
      <span className="font-mono text-lg font-semibold tabular-nums">{formatCountdown(secondsLeft)}</span>
    </div>
  )
}

function StepTitle({ icon: Icon, title, subtitle }) {
  return (
    <div className="flex items-start gap-3">
      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary-50 text-primary-600 ring-1 ring-primary-100"><Icon className="h-5 w-5" /></div>
      <div>
        <h2 className="font-display text-xl font-semibold text-slate-900">{title}</h2>
        {subtitle && <p className="text-sm text-slate-500">{subtitle}</p>}
      </div>
    </div>
  )
}

function StepNav({ onBack, onNext, nextDisabled, submit, disabled, nextLabel = 'Continuar' }) {
  return (
    <div className="flex items-center justify-between border-t border-slate-100 pt-5">
      {onBack ? (
        <button type="button" onClick={onBack} className="btn-ghost" disabled={disabled}><ArrowLeft className="h-4 w-4" /> Atrás</button>
      ) : <span />}
      <button type={submit ? 'submit' : 'button'} onClick={submit ? undefined : onNext} className="btn-primary" disabled={nextDisabled || disabled}>
        {nextLabel} {nextLabel === 'Continuar' && <ArrowRight className="h-4 w-4" />}
      </button>
    </div>
  )
}

function FilterChip({ active, onClick, children }) {
  return (
    <button type="button" onClick={onClick}
      className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition ${active ? 'bg-primary-600 text-white shadow-sm' : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:ring-primary-300'}`}>
      {children}
    </button>
  )
}

function SummaryRow({ icon: Icon, label, value }) {
  return (
    <div className="flex items-start gap-3 px-5 py-3.5">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
      <div className="min-w-0">
        <dt className="text-xs text-slate-400">{label}</dt>
        <dd className={`truncate ${value ? 'font-medium text-slate-800' : 'text-slate-400'}`}>{value || '—'}</dd>
      </div>
    </div>
  )
}

function TextField({ label, value, onChange, onBlur, error, hint, type = 'text', inputProps = {}, autoComplete }) {
  return (
    <div>
      <label className="label">{label}</label>
      <input type={type} autoComplete={autoComplete} className={`input ${error ? 'input-error' : ''}`} value={value}
        onChange={(e) => onChange(e.target.value)} onBlur={onBlur} {...inputProps} />
      {error ? <p className="field-error">{error}</p> : hint ? <p className="field-hint">{hint}</p> : null}
    </div>
  )
}
