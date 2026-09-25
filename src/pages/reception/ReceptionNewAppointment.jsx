import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  searchPatients, createPatient, updatePatientMedicalInfo, bookForPatient, getStaffDoctorAvailability,
} from '../../api/reception'
import { getSpecialties, searchDoctors } from '../../api/publicCatalog'
import { useAuth } from '../../context/AuthContext'
import { useNotify } from '../../context/NotifyContext'
import AvailabilityCalendar from '../../components/AvailabilityCalendar'
import LoadingOverlay from '../../components/LoadingOverlay'
import RecommendationsNotice from '../../components/RecommendationsNotice'
import Modal from '../../components/Modal'
import MedicalInfoFields, {
  EMPTY_MEDICAL_INFO, allergiesLabel, bloodTypeLabel, fromPatientResponse, toMedicalInfoPayload,
} from '../../components/MedicalInfoFields'
import WizardSteps from '../../components/WizardSteps'
import { formatDateOnly, formatTimeOnly, localTodayIso } from '../../utils/format'
import { onlyDigits, PHONE_INPUT_PROPS } from '../../utils/phone'
import { formatMoney, hasPrice } from '../../utils/money'

// Hora LOCAL del navegador (toISOString() es UTC y cambia de día a las 6 pm en México).
const todayIso = localTodayIso

const STEPS = ['Paciente', 'Doctor', 'Horario', 'Motivo']

/** Asistente de reserva telefónica para recepción: mismo AvailabilityCalendar que la
 * reserva pública, pero contra POST /reception/appointments, que exige un patientId ya
 * existente — así que el primer paso busca o da de alta al paciente por teléfono
 * (GET/POST /reception/patients) antes de continuar con doctor/sede/horario.
 *
 * Layout de dos columnas con resumen fijo (mismo patrón que BookAppointment.jsx, el
 * asistente público) para que recepción vea de un vistazo lo ya capturado sin desplazarse
 * de vuelta a pasos anteriores. */
export default function ReceptionNewAppointment() {
  const navigate = useNavigate()
  const { notify } = useNotify()
  const { user } = useAuth()
  // Recepcionista asignada a una o más especialidades: solo puede agendar con doctores de
  // esas especialidades (el backend igual lo valida al confirmar -- esto es nada más para
  // no ofrecerle en el selector doctores con los que de todos modos no podrá agendar).
  // null = recepcionista general, sin restricción (incluye siempre al ADMIN).
  const allowedSpecialtyIds = user?.specialties?.length ? new Set(user.specialties.map((s) => s.id)) : null

  const [step, setStep] = useState(0)

  // Paso 0: paciente
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [patient, setPatient] = useState(null)
  const [showNewPatient, setShowNewPatient] = useState(false)
  const [newPatient, setNewPatient] = useState({ firstName: '', lastName: '', phone: '', email: '', createAccount: false })
  const [newPatientMedicalInfo, setNewPatientMedicalInfo] = useState(EMPTY_MEDICAL_INFO)
  const [creatingPatient, setCreatingPatient] = useState(false)
  const [newPatientCredentials, setNewPatientCredentials] = useState(null)
  const [editingMedicalInfo, setEditingMedicalInfo] = useState(false)
  const [medicalInfoForm, setMedicalInfoForm] = useState(EMPTY_MEDICAL_INFO)
  const [savingMedicalInfo, setSavingMedicalInfo] = useState(false)

  // Paso 1: doctor + sede
  const [specialties, setSpecialties] = useState([])
  const [specialtyId, setSpecialtyId] = useState('')
  const [doctorsList, setDoctorsList] = useState([])
  const [doctor, setDoctor] = useState(null)
  const [branchId, setBranchId] = useState('')

  // Paso 2: fecha/hora
  const [fromDate, setFromDate] = useState(todayIso())
  const [days, setDays] = useState([])
  const [loadingAvailability, setLoadingAvailability] = useState(false)
  const [selectedDate, setSelectedDate] = useState(null)
  const [selectedTime, setSelectedTime] = useState(null)
  // El horario elegido ya tiene otra cita y recepción decidió empalmarlo (sobrecupo).
  const [selectedOverbook, setSelectedOverbook] = useState(false)

  const [reasonForVisit, setReasonForVisit] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    getSpecialties().then((r) => {
      const list = r.data.data
      setSpecialties(allowedSpecialtyIds ? list.filter((s) => allowedSpecialtyIds.has(s.id)) : list)
    }).catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (step !== 1) return
    searchDoctors({ specialtyId: specialtyId || undefined, page: 0, size: 100 })
      .then((r) => {
        const list = r.data.data.content
        setDoctorsList(allowedSpecialtyIds ? list.filter((d) => allowedSpecialtyIds.has(d.specialty?.id)) : list)
      })
      .catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, specialtyId])

  useEffect(() => {
    if (step < 2 || !doctor) return
    setLoadingAvailability(true)
    // Reglas de recepción: sin los 30 min de anticipación (paciente que llega sin cita) y con
    // los espacios ocupados marcados como sobrecupo.
    getStaffDoctorAvailability(doctor.id, fromDate, 7)
      .then((r) => setDays(r.data.data))
      .finally(() => setLoadingAvailability(false))
  }, [step, doctor, fromDate])

  function handleSearch(e) {
    e.preventDefault()
    setSearching(true)
    searchPatients({ q: query, page: 0, size: 20 })
      .then((r) => setResults(r.data.data.content))
      .finally(() => setSearching(false))
  }

  async function handleCreatePatient(e) {
    e.preventDefault()
    if (newPatient.phone.length !== 10) {
      notify('El teléfono debe tener exactamente 10 dígitos', 'error')
      return
    }
    if (newPatient.createAccount && !newPatient.email) {
      notify('Se requiere un correo para crear la cuenta de acceso', 'error')
      return
    }
    setCreatingPatient(true)
    try {
      const res = await createPatient({ ...newPatient, medicalInfo: toMedicalInfoPayload(newPatientMedicalInfo) })
      setPatient(res.data.data)
      setShowNewPatient(false)
      notify('Paciente creado correctamente', 'success')
      if (res.data.data.temporaryPassword) {
        setNewPatientCredentials(res.data.data)
      }
    } catch (err) {
      notify(err.response?.data?.message || 'No se pudo crear el paciente', 'error')
    } finally {
      setCreatingPatient(false)
    }
  }

  // Un paciente ya existente (elegido por búsqueda, no recién creado aquí) puede tener su
  // información médica desactualizada o nunca capturada (si se registró antes de este
  // campo) -- se puede corregir sin salir del asistente, en vez de mandar a recepción a la
  // ficha del paciente y volver a empezar la cita.
  function openEditMedicalInfo() {
    setMedicalInfoForm(fromPatientResponse(patient))
    setEditingMedicalInfo(true)
  }

  async function handleSaveMedicalInfo(e) {
    e.preventDefault()
    setSavingMedicalInfo(true)
    try {
      const res = await updatePatientMedicalInfo(patient.id, toMedicalInfoPayload(medicalInfoForm))
      setPatient(res.data.data)
      setEditingMedicalInfo(false)
      notify('Información médica actualizada', 'success')
    } catch (err) {
      notify(err.response?.data?.message || 'No se pudo guardar', 'error')
    } finally {
      setSavingMedicalInfo(false)
    }
  }

  function handleDoctorSubmit(e) {
    e.preventDefault()
    if (!doctor || !branchId) return
    setStep(2)
  }

  function handleSelectSlot(date, slot) {
    setSelectedDate(date)
    setSelectedTime(slot.startTime)
    setSelectedOverbook(!slot.available && !!slot.overbookable)
  }

  async function handleFinalSubmit(e) {
    e.preventDefault()
    setSubmitting(true)
    try {
      const res = await bookForPatient({
        patientId: patient.id,
        doctorId: doctor.id,
        branchId: Number(branchId),
        appointmentDate: selectedDate,
        startTime: selectedTime,
        reasonForVisit: reasonForVisit || undefined,
        overbook: selectedOverbook || undefined,
      })
      notify('Cita agendada correctamente', 'success')
      navigate('/recepcion/citas', { state: { created: res.data.data } })
    } catch (err) {
      notify(err.response?.data?.message || 'No se pudo agendar la cita', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const selectedBranch = doctor?.branches?.find((b) => String(b.id) === String(branchId))

  return (
    <div>
      <LoadingOverlay show={submitting} message="Agendando la cita..." />
      <LoadingOverlay show={creatingPatient} message="Creando paciente..." />

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Nueva cita telefónica</h1>
        <p className="text-sm text-gray-500 mt-1">Registra una cita agendada por teléfono a nombre del paciente.</p>
      </div>

      <WizardSteps steps={STEPS} currentStep={step} />

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-8">
        <div className="card p-5 sm:p-6">
          {step === 0 && (
            <div className="space-y-4">
              <h2 className="font-semibold text-gray-900">Buscar paciente</h2>
              <form onSubmit={handleSearch} className="flex gap-2">
                <input className="input" placeholder="Nombre o teléfono" value={query} onChange={(e) => setQuery(e.target.value)} />
                <button type="submit" className="btn-secondary shrink-0">{searching ? 'Buscando...' : 'Buscar'}</button>
              </form>

              {results.length > 0 && (
                <div className="space-y-2">
                  {results.map((p) => {
                    const selected = patient?.id === p.id
                    return (
                      <label
                        key={p.id}
                        className={`flex items-center gap-3 border rounded-lg p-3 cursor-pointer text-sm transition-colors ${
                          selected ? 'border-primary-400 bg-primary-50 ring-1 ring-primary-200' : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <input type="radio" name="patient" className="accent-primary-600" checked={selected} onChange={() => setPatient(p)} />
                        <span>
                          <span className="font-medium text-gray-900">{p.firstName} {p.lastName}</span>
                          <span className="text-gray-500"> — {p.phone}</span>
                        </span>
                      </label>
                    )
                  })}
                </div>
              )}

              {patient && (
                <div className="bg-primary-50 border border-primary-200 text-primary-800 text-sm rounded-lg px-3 py-2.5 space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="h-5 w-5 rounded-full bg-primary-600 text-white flex items-center justify-center text-xs shrink-0">✓</span>
                    Paciente seleccionado: <span className="font-semibold">{patient.firstName} {patient.lastName}</span> ({patient.phone})
                  </div>
                  <div className="flex items-center justify-between gap-2 flex-wrap pl-7">
                    <p className="text-xs">
                      <span className="font-medium">Alergias:</span> {allergiesLabel(patient)} · <span className="font-medium">Tipo de sangre:</span> {bloodTypeLabel(patient)}
                    </p>
                    <button type="button" onClick={openEditMedicalInfo} className="text-xs font-medium underline shrink-0">Editar</button>
                  </div>
                </div>
              )}

              {newPatientCredentials && (
                <div className="bg-amber-50 border border-amber-200 text-amber-900 text-sm rounded-lg px-3 py-2">
                  Cuenta creada para {newPatientCredentials.firstName} {newPatientCredentials.lastName} — anota su
                  contraseña temporal antes de continuar: <code className="font-semibold">{newPatientCredentials.temporaryPassword}</code>
                  <button type="button" className="block mt-1 text-xs underline" onClick={() => setNewPatientCredentials(null)}>Ya la anoté</button>
                </div>
              )}

              {!showNewPatient ? (
                <button type="button" className="text-primary-700 text-sm font-medium hover:underline" onClick={() => setShowNewPatient(true)}>
                  + Registrar paciente nuevo
                </button>
              ) : (
                <form onSubmit={handleCreatePatient} className="border border-gray-200 rounded-lg p-4 space-y-3 bg-gray-50/60">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <input required className="input" placeholder="Nombre" value={newPatient.firstName} onChange={(e) => setNewPatient({ ...newPatient, firstName: e.target.value })} />
                    <input required className="input" placeholder="Apellido" value={newPatient.lastName} onChange={(e) => setNewPatient({ ...newPatient, lastName: e.target.value })} />
                    <input required className="input" {...PHONE_INPUT_PROPS} placeholder="Teléfono" value={newPatient.phone} onChange={(e) => setNewPatient({ ...newPatient, phone: onlyDigits(e.target.value) })} />
                    <input
                      type="email" className="input" required={newPatient.createAccount}
                      placeholder={newPatient.createAccount ? 'Correo (obligatorio)' : 'Correo (opcional)'}
                      value={newPatient.email} onChange={(e) => setNewPatient({ ...newPatient, email: e.target.value })}
                    />
                  </div>
                  <label className="flex items-start gap-2 text-xs text-gray-600 bg-white border border-gray-200 rounded-lg p-2.5">
                    <input
                      type="checkbox" className="mt-0.5 accent-primary-600"
                      checked={newPatient.createAccount}
                      onChange={(e) => setNewPatient({ ...newPatient, createAccount: e.target.checked })}
                    />
                    <span>Crear cuenta de acceso — le llegará una contraseña temporal por correo.</span>
                  </label>
                  {/* Obligatorio: el doctor lo necesita para poder recetar con seguridad. */}
                  <MedicalInfoFields value={newPatientMedicalInfo} onChange={setNewPatientMedicalInfo} idPrefix="new-patient" />
                  <div className="flex gap-2 justify-end">
                    <button type="button" className="btn-secondary text-sm" onClick={() => setShowNewPatient(false)}>Cancelar</button>
                    <button type="submit" disabled={creatingPatient} className="btn-primary text-sm">{creatingPatient ? 'Guardando...' : 'Crear paciente'}</button>
                  </div>
                </form>
              )}

              <div className="flex justify-end pt-2 border-t border-gray-100">
                <button type="button" className="btn-primary" disabled={!patient} onClick={() => setStep(1)}>Continuar</button>
              </div>
            </div>
          )}

          {step === 1 && (
            <form onSubmit={handleDoctorSubmit} className="space-y-4">
              <h2 className="font-semibold text-gray-900">Doctor y sede</h2>
              {allowedSpecialtyIds && (
                <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                  Tu cuenta solo puede agendar con doctores de: {user.specialties.map((s) => s.name).join(', ')}.
                </p>
              )}
              <label className="block text-sm">
                <span className="block text-gray-700 mb-1 font-medium">Especialidad</span>
                <select className="input" value={specialtyId} onChange={(e) => { setSpecialtyId(e.target.value); setDoctor(null); setBranchId('') }}>
                  <option value="">Todas</option>
                  {specialties.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </label>
              <label className="block text-sm">
                <span className="block text-gray-700 mb-1 font-medium">Doctor</span>
                <select required className="input" value={doctor?.id || ''} onChange={(e) => {
                  const d = doctorsList.find((x) => String(x.id) === e.target.value) || null
                  setDoctor(d)
                  setBranchId(d?.branches?.length === 1 ? String(d.branches[0].id) : '')
                }}>
                  <option value="">Selecciona...</option>
                  {doctorsList.map((d) => (
                    <option key={d.id} value={d.id}>Dr(a). {d.firstName} {d.lastName} — {d.specialty?.name}{hasPrice(d.consultationPrice) ? ` (${formatMoney(d.consultationPrice)})` : ''}</option>
                  ))}
                </select>
              </label>
              {doctor && (
                <div className="text-sm bg-primary-50 border border-primary-200 text-primary-800 rounded-lg px-3 py-2.5">
                  <p className="font-medium mb-1">
                    Precio de la consulta:{' '}
                    {hasPrice(doctor.consultationPrice)
                      ? <span className="text-base font-bold">{formatMoney(doctor.consultationPrice)}</span>
                      : <span className="font-normal">sin precio definido (se captura al cobrar)</span>}
                  </p>
                  <p className="font-medium mb-1">Coméntale esto al paciente:</p>
                  <RecommendationsNotice text={doctor.specialty?.recommendations} />
                </div>
              )}
              {doctor && (
                <label className="block text-sm">
                  <span className="block text-gray-700 mb-1 font-medium">Sede</span>
                  <select required className="input" value={branchId} onChange={(e) => setBranchId(e.target.value)}>
                    <option value="">Selecciona...</option>
                    {doctor.branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                </label>
              )}
              <div className="flex justify-between pt-2 border-t border-gray-100">
                <button type="button" className="btn-secondary" onClick={() => setStep(0)}>Atrás</button>
                <button type="submit" className="btn-primary" disabled={!doctor || !branchId}>Continuar</button>
              </div>
            </form>
          )}

          {step === 2 && doctor && (
            <div className="space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <h2 className="font-semibold text-gray-900">Fecha y horario</h2>
                <label className="text-sm flex items-center gap-2">
                  <span className="text-gray-600">Desde</span>
                  <input type="date" className="input !w-auto py-1" value={fromDate} min={todayIso()} onChange={(e) => setFromDate(e.target.value)} />
                </label>
              </div>
              <AvailabilityCalendar
                days={days}
                mode="selectable"
                allowOverbook
                loading={loadingAvailability}
                selected={selectedDate && selectedTime ? { date: selectedDate, startTime: selectedTime } : null}
                onSelectSlot={handleSelectSlot}
              />
              <div className="flex justify-between pt-2 border-t border-gray-100">
                <button type="button" className="btn-secondary" onClick={() => setStep(1)}>Atrás</button>
                <button type="button" className="btn-primary" disabled={!selectedDate || !selectedTime} onClick={() => setStep(3)}>Continuar</button>
              </div>
            </div>
          )}

          {step === 3 && (
            <form onSubmit={handleFinalSubmit} className="space-y-4">
              <h2 className="font-semibold text-gray-900">Confirmar cita</h2>
              {selectedOverbook && (
                <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                  Ese horario ya tiene otra cita: se agendará como <span className="font-semibold">sobrecupo</span>.
                  Avísale al doctor.
                </p>
              )}
              <label className="block text-sm">
                <span className="block text-gray-700 mb-1 font-medium">Motivo de la consulta (opcional)</span>
                <textarea className="input" rows={3} value={reasonForVisit} onChange={(e) => setReasonForVisit(e.target.value)} />
              </label>
              <div className="flex justify-between pt-2 border-t border-gray-100">
                <button type="button" className="btn-secondary" onClick={() => setStep(2)} disabled={submitting}>Atrás</button>
                <button type="submit" className="btn-primary" disabled={submitting}>{submitting ? 'Agendando...' : 'Confirmar cita'}</button>
              </div>
            </form>
          )}
        </div>

        <aside className="card p-5 h-fit lg:sticky lg:top-24">
          <h2 className="font-semibold text-gray-900 mb-4">Resumen</h2>
          <ul className="space-y-3 text-sm text-gray-600">
            <li>
              <span className="block text-gray-400 text-xs">Paciente</span>
              {patient ? `${patient.firstName} ${patient.lastName}` : '—'}
            </li>
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
              <span className="block text-gray-400 text-xs">Precio de la consulta</span>
              {doctor ? (hasPrice(doctor.consultationPrice) ? formatMoney(doctor.consultationPrice) : 'Sin definir') : '—'}
            </li>
            <li>
              <span className="block text-gray-400 text-xs">Fecha y hora</span>
              {selectedDate && selectedTime ? `${formatDateOnly(selectedDate)}, ${formatTimeOnly(selectedTime)}${selectedOverbook ? ' (sobrecupo)' : ''}` : '—'}
            </li>
          </ul>
        </aside>
      </div>

      {editingMedicalInfo && (
        <Modal title="Editar información médica" onClose={() => setEditingMedicalInfo(false)} maxWidth="max-w-sm">
          <form onSubmit={handleSaveMedicalInfo} className="space-y-4">
            <MedicalInfoFields value={medicalInfoForm} onChange={setMedicalInfoForm} idPrefix="existing-patient" />
            <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
              <button type="button" className="btn-secondary" onClick={() => setEditingMedicalInfo(false)}>Cancelar</button>
              <button type="submit" disabled={savingMedicalInfo} className="btn-primary">{savingMedicalInfo ? 'Guardando...' : 'Guardar'}</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
