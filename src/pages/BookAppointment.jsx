import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { getSpecialties, searchDoctors, getDoctorAvailability } from '../api/publicCatalog'
import { bookGuestAppointment, bookOwnAppointment } from '../api/appointments'
import { prepayByToken, prepayOwn } from '../api/payments'
import { useAuth } from '../context/AuthContext'
import { useNotify } from '../context/NotifyContext'
import AvailabilityCalendar from '../components/AvailabilityCalendar'
import LoadingOverlay from '../components/LoadingOverlay'
import RecommendationsNotice from '../components/RecommendationsNotice'
import MedicalInfoFields, { EMPTY_MEDICAL_INFO, toMedicalInfoPayload } from '../components/MedicalInfoFields'
import WizardSteps from '../components/WizardSteps'
import CardFields from '../components/CardFields'
import { EMPTY_CARD, tokenizeFields } from '../utils/openpay'
import { formatMoney, hasPrice } from '../utils/money'
import { formatDateOnly, formatTimeOnly } from '../utils/format'
import { onlyDigits, PHONE_INPUT_PROPS } from '../utils/phone'

function todayIso() {
  return new Date().toISOString().slice(0, 10)
}

const STEPS = ['Doctor', 'Sede', 'Horario', 'Datos', 'Pago']

/**
 * Asistente de reserva de cita, mismo patrón que Checkout.jsx del proyecto de referencia
 * (step numérico, un <form> por paso con validación nativa, resumen fijo en la barra
 * lateral). Se usa tanto para el flujo público/paciente logueado (POST /appointments/guest
 * o /appointments según haya sesión) como embebido en el flujo de recepción, que en cambio
 * usa este mismo AvailabilityCalendar pero contra /reception/appointments (ver
 * pages/reception/ReceptionNewAppointment.jsx).
 *
 * Puede llegar aquí "en frío" (paso 0, elegir especialidad y doctor) o ya con un doctor
 * elegido desde DoctorDetail.jsx (via router state: { doctor, date, startTime }), en cuyo
 * caso arranca en el primer paso que aún falte por resolver.
 */
export default function BookAppointment() {
  const location = useLocation()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { notify } = useNotify()

  const initialDoctor = location.state?.doctor || null
  const initialDate = location.state?.date || null
  const initialStartTime = location.state?.startTime || null

  const [specialties, setSpecialties] = useState([])
  const [specialtyId, setSpecialtyId] = useState('')
  const [doctorsList, setDoctorsList] = useState([])
  const [doctor, setDoctor] = useState(initialDoctor)
  const [branchId, setBranchId] = useState(
    initialDoctor?.branches?.length === 1 ? String(initialDoctor.branches[0].id) : ''
  )

  const [fromDate, setFromDate] = useState(initialDate || todayIso())
  const [days, setDays] = useState([])
  const [loadingAvailability, setLoadingAvailability] = useState(false)
  const [selectedDate, setSelectedDate] = useState(initialDate)
  const [selectedTime, setSelectedTime] = useState(initialStartTime)

  const [patient, setPatient] = useState({ firstName: '', lastName: '', phone: '', email: '' })
  const [reasonForVisit, setReasonForVisit] = useState('')
  const [medicalInfo, setMedicalInfo] = useState(EMPTY_MEDICAL_INFO)
  const [submitting, setSubmitting] = useState(false)
  // Paso 5: cómo se paga. RECEPTION = al terminar la consulta; CARD/SPEI = pago anticipado con OpenPay.
  const [payChoice, setPayChoice] = useState('RECEPTION')
  const [card, setCard] = useState(EMPTY_CARD)

  function computeInitialStep() {
    if (!initialDoctor) return 0
    if (initialDoctor.branches?.length > 1) return 1
    if (!initialDate || !initialStartTime) return 2
    return 3
  }
  const [step, setStep] = useState(computeInitialStep())

  useEffect(() => {
    getSpecialties().then((r) => setSpecialties(r.data.data)).catch(() => {})
  }, [])

  useEffect(() => {
    if (step !== 0) return
    searchDoctors({ specialtyId: specialtyId || undefined, page: 0, size: 100 })
      .then((r) => setDoctorsList(r.data.data.content))
      .catch(() => {})
  }, [step, specialtyId])

  useEffect(() => {
    if (step < 2 || !doctor) return
    setLoadingAvailability(true)
    getDoctorAvailability(doctor.id, fromDate, 7)
      .then((r) => setDays(r.data.data))
      .finally(() => setLoadingAvailability(false))
  }, [step, doctor, fromDate])

  function handleDoctorSubmit(e) {
    e.preventDefault()
    if (!doctor) return
    if (doctor.branches?.length === 1) setBranchId(String(doctor.branches[0].id))
    setStep(doctor.branches?.length > 1 ? 1 : 2)
  }

  function handleBranchSubmit(e) {
    e.preventDefault()
    setStep(2)
  }

  function handleSelectSlot(date, slot) {
    setSelectedDate(date)
    setSelectedTime(slot.startTime)
  }

  function handleDatetimeContinue() {
    if (!selectedDate || !selectedTime) return
    setStep(3)
  }

  function handleDataSubmit(e) {
    e.preventDefault()
    if (!user && patient.phone.length !== 10) {
      notify('El teléfono debe tener exactamente 10 dígitos', 'error')
      return
    }
    setStep(4)
  }

  const priced = hasPrice(doctor?.consultationPrice)

  async function handleFinalSubmit(e) {
    e.preventDefault()
    setSubmitting(true)
    try {
      // La tarjeta se valida y tokeniza ANTES de agendar: un dato mal capturado no deja una cita
      // creada a medias (el token se genera directo con OpenPay, la tarjeta no pasa por el backend).
      const cardToken = priced && payChoice === 'CARD' ? await tokenizeFields(card) : null
      const basePayload = {
        doctorId: doctor.id,
        branchId: Number(branchId),
        appointmentDate: selectedDate,
        startTime: selectedTime,
        reasonForVisit: reasonForVisit || undefined,
        medicalInfo: toMedicalInfoPayload(medicalInfo),
      }
      const res = user
        ? await bookOwnAppointment(basePayload)
        : await bookGuestAppointment({ ...basePayload, ...patient })
      const appointment = res.data.data

      // Pago anticipado: se hace DESPUÉS de agendar (el horario ya quedó apartado). Si el cobro
      // falla, la cita sigue en pie y se paga en recepción -- nunca se pierde el horario por una tarjeta.
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
      notify(err.response?.data?.message || (err.response ? 'No se pudo agendar la cita' : err.message), 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const selectedBranch = doctor?.branches?.find((b) => String(b.id) === String(branchId))

  return (
    <div className="container-app py-6 sm:py-8">
      <LoadingOverlay show={submitting} message="Agendando tu cita..." />
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Agendar cita</h1>

      <WizardSteps steps={STEPS} currentStep={step} />

      {/* Fuera del paso "Doctor" a propósito: si se llega aquí con un doctor ya elegido
          (ej. "Agendar con este doctor" desde DoctorDetail.jsx), computeInitialStep() salta
          directo al paso que falte -- a veces hasta "Datos" -- y ese paso nunca se muestra.
          Puesto aquí, se ve en CUALQUIER paso en cuanto hay un doctor, sin depender de que
          el usuario haya pasado por el selector. */}
      {doctor && (
        <div className="mb-6">
          <RecommendationsNotice
            text={doctor.specialty?.recommendations}
            className="text-sm bg-primary-50 border border-primary-200 text-primary-800 rounded-lg px-4 py-3"
          />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-8">
        <div className="card p-5 sm:p-6">
          {step === 0 && (
            <form onSubmit={handleDoctorSubmit} className="space-y-4">
              <h2 className="font-semibold text-gray-900">Elige especialidad y doctor</h2>
              <Field label="Especialidad">
                <select
                  className="input"
                  value={specialtyId}
                  onChange={(e) => { setSpecialtyId(e.target.value); setDoctor(null) }}
                >
                  <option value="">Todas</option>
                  {specialties.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </Field>
              <Field label="Doctor">
                <select
                  required
                  className="input"
                  value={doctor?.id || ''}
                  onChange={(e) => setDoctor(doctorsList.find((d) => String(d.id) === e.target.value) || null)}
                >
                  <option value="">Selecciona...</option>
                  {doctorsList.map((d) => (
                    <option key={d.id} value={d.id}>Dr(a). {d.firstName} {d.lastName} — {d.specialty?.name}</option>
                  ))}
                </select>
              </Field>
              <div className="flex justify-end pt-3 border-t border-gray-100">
                <button type="submit" className="btn-primary">Continuar</button>
              </div>
            </form>
          )}

          {step === 1 && doctor && (
            <form onSubmit={handleBranchSubmit} className="space-y-4">
              <h2 className="font-semibold text-gray-900">Elige la sede</h2>
              <div className="space-y-2">
                {doctor.branches.map((b) => {
                  const selected = String(branchId) === String(b.id)
                  return (
                    <label
                      key={b.id}
                      className={`flex items-start gap-2 border rounded-lg p-3 cursor-pointer text-sm transition-colors ${
                        selected ? 'border-primary-400 bg-primary-50 ring-1 ring-primary-200' : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <input
                        type="radio"
                        name="branch"
                        required
                        className="accent-primary-600 mt-0.5"
                        checked={selected}
                        onChange={() => setBranchId(String(b.id))}
                      />
                      <span>
                        <span className="font-medium text-gray-900">{b.name}</span>
                        <span className="text-gray-500"> — {b.address}, {b.city}</span>
                      </span>
                    </label>
                  )
                })}
              </div>
              <div className="flex justify-between pt-3 border-t border-gray-100">
                <button type="button" onClick={() => setStep(0)} className="btn-secondary">Atrás</button>
                <button type="submit" className="btn-primary" disabled={!branchId}>Continuar</button>
              </div>
            </form>
          )}

          {step === 2 && doctor && (
            <div className="space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <h2 className="font-semibold text-gray-900">Elige fecha y horario</h2>
                <label className="text-sm flex items-center gap-2">
                  <span className="text-gray-600">Desde</span>
                  <input
                    type="date"
                    className="input !w-auto py-1"
                    value={fromDate}
                    min={todayIso()}
                    onChange={(e) => setFromDate(e.target.value)}
                  />
                </label>
              </div>
              <AvailabilityCalendar
                days={days}
                mode="selectable"
                loading={loadingAvailability}
                selected={selectedDate && selectedTime ? { date: selectedDate, startTime: selectedTime } : null}
                onSelectSlot={handleSelectSlot}
              />
              <div className="flex justify-between pt-3 border-t border-gray-100">
                <button type="button" onClick={() => setStep(doctor.branches?.length > 1 ? 1 : 0)} className="btn-secondary">Atrás</button>
                <button type="button" onClick={handleDatetimeContinue} className="btn-primary" disabled={!selectedDate || !selectedTime}>
                  Continuar
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <form onSubmit={handleDataSubmit} className="space-y-4">
              <h2 className="font-semibold text-gray-900">
                {user ? 'Información médica y motivo de la consulta' : 'Tus datos de contacto e información médica'}
              </h2>
              {!user && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="Nombre">
                    <input required className="input" value={patient.firstName}
                      onChange={(e) => setPatient({ ...patient, firstName: e.target.value })} />
                  </Field>
                  <Field label="Apellido">
                    <input required className="input" value={patient.lastName}
                      onChange={(e) => setPatient({ ...patient, lastName: e.target.value })} />
                  </Field>
                  <Field label="Teléfono">
                    <input required className="input" {...PHONE_INPUT_PROPS} value={patient.phone}
                      onChange={(e) => setPatient({ ...patient, phone: onlyDigits(e.target.value) })} />
                  </Field>
                  <Field label="Correo electrónico (opcional)">
                    <input type="email" className="input" value={patient.email}
                      onChange={(e) => setPatient({ ...patient, email: e.target.value })} />
                  </Field>
                </div>
              )}
              {/* Obligatorio sea invitado o paciente con cuenta: el doctor lo necesita para
                  poder recetar con seguridad (ver MedicalInfoFields.jsx). */}
              <MedicalInfoFields value={medicalInfo} onChange={setMedicalInfo} idPrefix="book" />
              <Field label="Motivo de la consulta (opcional)">
                <textarea className="input" rows={3} value={reasonForVisit} onChange={(e) => setReasonForVisit(e.target.value)} />
              </Field>
              <div className="flex justify-between pt-3 border-t border-gray-100">
                <button type="button" onClick={() => setStep(2)} className="btn-secondary">Atrás</button>
                <button type="submit" className="btn-primary">Continuar</button>
              </div>
            </form>
          )}

          {step === 4 && (
            <form onSubmit={handleFinalSubmit} className="space-y-4">
              <h2 className="font-semibold text-gray-900">Pago de la consulta</h2>

              {priced ? (
                <>
                  <div className="bg-primary-50 border border-primary-200 rounded-xl px-4 py-3 flex items-center justify-between">
                    <span className="text-sm text-primary-800">Precio de la consulta</span>
                    <span className="text-2xl font-black text-primary-800">{formatMoney(doctor.consultationPrice)}</span>
                  </div>
                  <p className="text-sm text-gray-600">¿Cómo prefieres pagar?</p>
                  <div className="space-y-2">
                    {[
                      { value: 'RECEPTION', title: 'Pagar en recepción', hint: 'Pagas al terminar tu consulta, en efectivo o con tarjeta.' },
                      { value: 'CARD', title: 'Pago anticipado con tarjeta', hint: 'Cobro inmediato y seguro con OpenPay.' },
                      { value: 'SPEI', title: 'Pago anticipado por transferencia (SPEI)', hint: 'Te mostramos la CLABE al confirmar; tu cita se marca pagada al acreditarse.' },
                    ].map((o) => (
                      <label
                        key={o.value}
                        className={`flex items-start gap-2 border rounded-lg p-3 cursor-pointer text-sm transition-colors ${
                          payChoice === o.value ? 'border-primary-400 bg-primary-50 ring-1 ring-primary-200' : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <input type="radio" name="payChoice" className="accent-primary-600 mt-0.5" checked={payChoice === o.value}
                          onChange={() => setPayChoice(o.value)} disabled={submitting} />
                        <span>
                          <span className="font-medium text-gray-900 block">{o.title}</span>
                          <span className="text-gray-500 text-xs">{o.hint}</span>
                        </span>
                      </label>
                    ))}
                  </div>
                  {payChoice === 'CARD' && <CardFields value={card} onChange={setCard} disabled={submitting} />}
                  <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                    Si cancelas una cita pagada con al menos 1 hora de anticipación, te reembolsamos el pago. Si cancelas con menos
                    de 1 hora, el reembolso queda a consideración del administrador del hospital.
                  </p>
                </>
              ) : (
                <div className="bg-amber-50 border border-amber-200 text-amber-900 text-sm rounded-lg px-4 py-3">
                  El precio de la consulta se confirma en recepción, donde podrás pagar al terminar tu cita.
                </div>
              )}

              <div className="flex justify-between pt-3 border-t border-gray-100">
                <button type="button" onClick={() => setStep(3)} className="btn-secondary" disabled={submitting}>Atrás</button>
                <button type="submit" className="btn-primary" disabled={submitting}>
                  {submitting ? 'Procesando...' : payChoice === 'RECEPTION' || !priced ? 'Confirmar cita' : 'Confirmar y pagar'}
                </button>
              </div>
            </form>
          )}
        </div>

        <aside className="card p-5 h-fit lg:sticky lg:top-24">
          <h2 className="font-semibold text-gray-900 mb-4">Resumen</h2>
          <ul className="space-y-2 text-sm text-gray-600">
            <li>
              <span className="block text-gray-400 text-xs">Doctor</span>
              {doctor ? `Dr(a). ${doctor.firstName} ${doctor.lastName}` : '—'}
            </li>
            <li>
              <span className="block text-gray-400 text-xs">Especialidad</span>
              {doctor?.specialty?.name || '—'}
            </li>
            <li>
              <span className="block text-gray-400 text-xs">Sede</span>
              {selectedBranch?.name || '—'}
            </li>
            <li>
              <span className="block text-gray-400 text-xs">Fecha y hora</span>
              {selectedDate && selectedTime ? `${formatDateOnly(selectedDate)}, ${formatTimeOnly(selectedTime)}` : '—'}
            </li>
            <li>
              <span className="block text-gray-400 text-xs">Precio de la consulta</span>
              {doctor ? (priced ? formatMoney(doctor.consultationPrice) : 'Por confirmar en recepción') : '—'}
            </li>
          </ul>
        </aside>
      </div>
    </div>
  )
}

function Field({ label, children, className = '' }) {
  return (
    <label className={`block text-sm ${className}`}>
      <span className="block text-gray-700 mb-1 font-medium">{label}</span>
      {children}
    </label>
  )
}
