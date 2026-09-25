import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import {
  listOwnAppointments, cancelOwnAppointment, releaseSlot, downloadAppointmentReceipt, updatePatientMedicalInfo,
  markAppointmentCompleted, markAppointmentNoShow, markAppointmentArrived, voidPrescription,
  getOwnProfile, createPrescription, downloadPrescriptionPdf, listAppointmentPrescriptions, sendPrescriptionEmail,
} from '../../api/doctorPortal'
import { useNotify } from '../../context/NotifyContext'
import AvailabilityCalendar from '../../components/AvailabilityCalendar'
import AppointmentDetailCard from '../../components/AppointmentDetailCard'
import Modal from '../../components/Modal'
import MedicalInfoFields, { EMPTY_MEDICAL_INFO, allergiesLabel, bloodTypeLabel, fromPatientResponse, toMedicalInfoPayload } from '../../components/MedicalInfoFields'
import { downloadBlob } from '../../utils/media'
import { formatDate, formatDateOnly, localTodayIso } from '../../utils/format'
import usePolling from '../../hooks/usePolling'
import LoadingOverlay from '../../components/LoadingOverlay'

// Hora LOCAL del navegador (toISOString() es UTC y cambia de día a las 6 pm en México).
const todayIso = localTodayIso

function addDays(iso, n) {
  const d = new Date(`${iso}T00:00:00`)
  d.setDate(d.getDate() + n)
  return d.toISOString().slice(0, 10)
}

// Lunes de la semana que contiene `iso` -- para saltar directo a la semana correcta cuando
// se llega aquí desde una notificación (ver NotificationBell.jsx, que manda jumpToDate).
function mondayOf(iso) {
  const d = new Date(`${iso}T00:00:00`)
  const day = d.getDay() // 0=domingo..6=sabado
  d.setDate(d.getDate() + (day === 0 ? -6 : 1 - day))
  return d.toISOString().slice(0, 10)
}

/**
 * Agenda semanal propia del doctor. A diferencia del calendario de reserva (que consume
 * DayAvailabilityResponse con slots libres/ocupados), aquí no existe un endpoint de "grid"
 * — se listan las citas propias (GET /doctor/appointments?from&to) y se arma manualmente el
 * mismo formato de días/slots que espera AvailabilityCalendar (mode="agenda"), con el
 * AppointmentResponse completo adjunto a cada slot ocupado.
 */
export default function DoctorAgenda() {
  const { notify, confirmDialog } = useNotify()
  const location = useLocation()
  const jumpToDate = location.state?.jumpToDate
  const highlightAppointmentId = location.state?.highlightAppointmentId
  const [weekStart, setWeekStart] = useState(() => (jumpToDate ? mondayOf(jumpToDate) : todayIso()))
  const [appointments, setAppointments] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  // Evita doble clic en Cancelar/Liberar/Comprobante del detalle mientras la petición está en curso.
  const [busyAction, setBusyAction] = useState(null)
  const [editingMedicalInfo, setEditingMedicalInfo] = useState(false)
  const [medicalInfoForm, setMedicalInfoForm] = useState(EMPTY_MEDICAL_INFO)
  const [savingMedicalInfo, setSavingMedicalInfo] = useState(false)

  const [prescriptionModal, setPrescriptionModal] = useState(false)
  const [prescriptionContent, setPrescriptionContent] = useState('')
  const [prescriptionDiagnosis, setPrescriptionDiagnosis] = useState('')
  const [previousPrescriptions, setPreviousPrescriptions] = useState([])
  const [loadingPrescriptionModal, setLoadingPrescriptionModal] = useState(false)
  const [savingPrescription, setSavingPrescription] = useState(false)
  // Receta que el doctor está anulando (pide motivo antes de confirmar).
  const [voiding, setVoiding] = useState(null)
  const [voidReason, setVoidReason] = useState('')
  const [savingVoid, setSavingVoid] = useState(false)

  const weekEnd = addDays(weekStart, 6)

  // `silent` distingue la carga inicial/cambio de semana (sí debe mostrar "Cargando...") del
  // refresco en segundo plano del polling (no debe: si no, la agenda entera parpadeaba cada
  // 30s -- AvailabilityCalendar reemplaza TODO el grid por el texto de carga mientras
  // `loading` es true, así que un refresco silencioso nunca debe tocar ese estado).
  function load(opts = {}) {
    const { silent = false } = opts
    if (!silent) setLoading(true)
    listOwnAppointments(weekStart, weekEnd)
      .then((r) => setAppointments(r.data.data))
      .finally(() => { if (!silent) setLoading(false) })
  }

  useEffect(() => { load() }, [weekStart])
  usePolling(() => load({ silent: true }), 30000)

  useEffect(() => {
    if (!highlightAppointmentId || appointments.length === 0) return
    const match = appointments.find((a) => String(a.id) === String(highlightAppointmentId))
    if (match) setSelected(match)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appointments])

  const dateList = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
  const days = dateList.map((date) => ({
    date,
    slots: appointments
      .filter((a) => a.appointmentDate === date)
      .sort((a, b) => a.startTime.localeCompare(b.startTime))
      .map((a) => ({ startTime: a.startTime, endTime: a.endTime, appointment: a })),
  }))

  function handleSlotClick(date, slot) {
    setSelected(slot.appointment)
  }

  async function handleCancel(id) {
    const ok = await confirmDialog('¿Cancelar esta cita?', { confirmText: 'Cancelar cita' })
    if (!ok) return
    setBusyAction('cancel')
    try {
      await cancelOwnAppointment(id)
      notify('Cita cancelada', 'success')
      setSelected(null)
      load()
    } catch (err) {
      notify(err.response?.data?.message || 'No se pudo cancelar la cita', 'error')
    } finally {
      setBusyAction(null)
    }
  }

  async function handleRelease(id) {
    const ok = await confirmDialog('¿Liberar este horario? El espacio quedará disponible de nuevo para agendar.', { confirmText: 'Liberar horario' })
    if (!ok) return
    setBusyAction('release')
    try {
      await releaseSlot(id)
      notify('Espacio liberado correctamente', 'success')
      setSelected(null)
      load()
    } catch (err) {
      notify(err.response?.data?.message || 'No se pudo liberar el espacio', 'error')
    } finally {
      setBusyAction(null)
    }
  }

  async function handleDownloadReceipt(id) {
    setBusyAction('download')
    try {
      const res = await downloadAppointmentReceipt(id)
      downloadBlob(res.data, `comprobante-cita-${id}.pdf`)
    } catch {
      notify('No se pudo descargar el comprobante', 'error')
    } finally {
      setBusyAction(null)
    }
  }

  async function handleMarkCompleted(id) {
    const ok = await confirmDialog('¿Marcar esta cita como atendida?', { confirmText: 'Marcar atendida' })
    if (!ok) return
    setBusyAction('complete')
    try {
      await markAppointmentCompleted(id)
      notify('Cita marcada como atendida', 'success')
      setSelected(null)
      load()
    } catch (err) {
      notify(err.response?.data?.message || 'No se pudo marcar', 'error')
    } finally {
      setBusyAction(null)
    }
  }

  async function handleMarkArrived(id) {
    setBusyAction('arrived')
    try {
      await markAppointmentArrived(id)
      notify('Llegada del paciente registrada', 'success')
      setSelected(null)
      load()
    } catch (err) {
      notify(err.response?.data?.message || 'No se pudo registrar la llegada', 'error')
    } finally {
      setBusyAction(null)
    }
  }

  async function handleMarkNoShow(id) {
    const ok = await confirmDialog('¿Marcar esta cita como no asistió?', { confirmText: 'Marcar no asistió' })
    if (!ok) return
    setBusyAction('no-show')
    try {
      await markAppointmentNoShow(id)
      notify('Cita marcada como no asistió', 'success')
      setSelected(null)
      load()
    } catch (err) {
      notify(err.response?.data?.message || 'No se pudo marcar', 'error')
    } finally {
      setBusyAction(null)
    }
  }

  function openEditMedicalInfo() {
    setMedicalInfoForm(fromPatientResponse(selected.patient))
    setEditingMedicalInfo(true)
  }

  async function handleSaveMedicalInfo(e) {
    e.preventDefault()
    setSavingMedicalInfo(true)
    try {
      const res = await updatePatientMedicalInfo(selected.patient.id, toMedicalInfoPayload(medicalInfoForm))
      setSelected((s) => ({ ...s, patient: res.data.data }))
      setEditingMedicalInfo(false)
      notify('Información médica actualizada', 'success')
      load({ silent: true })
    } catch (err) {
      notify(err.response?.data?.message || 'No se pudo guardar', 'error')
    } finally {
      setSavingMedicalInfo(false)
    }
  }

  // Al abrir, se precarga la plantilla base del doctor (editable, no se usa tal cual -- ver
  // Doctor#prescriptionTemplate) y se listan las recetas que ya se hayan generado para esta
  // misma cita, para no perderlas de vista ni escribir una nueva a ciegas.
  async function openPrescriptionModal() {
    setPrescriptionModal(true)
    setPrescriptionDiagnosis('')
    setLoadingPrescriptionModal(true)
    try {
      const [profileRes, prescriptionsRes] = await Promise.all([
        getOwnProfile(),
        listAppointmentPrescriptions(selected.id),
      ])
      setPrescriptionContent(profileRes.data.data.prescriptionTemplate || '')
      setPreviousPrescriptions(prescriptionsRes.data.data)
    } catch {
      notify('No se pudo cargar la plantilla de receta', 'error')
    } finally {
      setLoadingPrescriptionModal(false)
    }
  }

  async function handleGeneratePrescription(e) {
    e.preventDefault()
    // Si la cita ya tiene una receta vigente, emitir otra es deliberado (no un doble clic): se confirma.
    const hasActive = previousPrescriptions.some((p) => !p.voided)
    if (hasActive) {
      const ok = await confirmDialog(
        'Esta cita ya tiene una receta vigente. ¿Emitir una receta adicional? (Si la anterior tiene un error, mejor anúlala primero.)',
        { confirmText: 'Emitir adicional' })
      if (!ok) return
    }
    setSavingPrescription(true)
    try {
      const res = await createPrescription({
        appointmentId: selected.id,
        diagnosis: prescriptionDiagnosis.trim() || undefined,
        content: prescriptionContent,
        confirmAdditional: hasActive || undefined,
      })
      const prescriptionId = res.data.data.id
      const pdf = await downloadPrescriptionPdf(prescriptionId)
      downloadBlob(pdf.data, `receta-${prescriptionId}.pdf`)
      notify('Receta generada y cita marcada como atendida', 'success')
      setPrescriptionModal(false)
      // Al emitir la receta el backend marca la cita como atendida (ver
      // PrescriptionServiceImpl.markCompletedFromPrescription) -- se recarga la agenda para
      // que el color/estado del slot y el detalle abierto reflejen el cambio.
      const patientEmail = selected.patient?.email
      setSelected(null)
      load({ silent: true })

      // Se pregunta cada vez, nunca se envía automático (decisión de producto: el doctor
      // decide caso por caso si corresponde compartir la receta por correo).
      if (patientEmail) {
        const wantsEmail = await confirmDialog(
          `¿Deseas enviarle esta receta al correo del paciente (${patientEmail})?`,
          { confirmText: 'Enviar por correo', cancelText: 'No, gracias' }
        )
        if (wantsEmail) {
          try {
            await sendPrescriptionEmail(prescriptionId)
            notify('Receta enviada al correo del paciente', 'success')
          } catch (emailErr) {
            notify(emailErr.response?.data?.message || 'No se pudo enviar la receta por correo', 'error')
          }
        }
      }
    } catch (err) {
      notify(err.response?.data?.message || 'No se pudo generar la receta', 'error')
    } finally {
      setSavingPrescription(false)
    }
  }

  async function handleVoidPrescription(e) {
    e.preventDefault()
    setSavingVoid(true)
    try {
      await voidPrescription(voiding.id, voidReason.trim())
      notify('Receta anulada', 'success')
      setPreviousPrescriptions((list) => list.map((p) => (p.id === voiding.id ? { ...p, voided: true, voidReason: voidReason.trim() } : p)))
      setVoiding(null)
      setVoidReason('')
    } catch (err) {
      notify(err.response?.data?.message || 'No se pudo anular la receta', 'error')
    } finally {
      setSavingVoid(false)
    }
  }

  async function handleDownloadPreviousPrescription(id) {
    try {
      const res = await downloadPrescriptionPdf(id)
      downloadBlob(res.data, `receta-${id}.pdf`)
    } catch {
      notify('No se pudo descargar la receta', 'error')
    }
  }

  return (
    <div>
      <LoadingOverlay show={busyAction === 'cancel'} message="Cancelando la cita..." />
      <LoadingOverlay show={busyAction === 'release'} message="Liberando el espacio..." />
      <LoadingOverlay show={busyAction === 'download'} message="Generando comprobante..." />
      <LoadingOverlay show={busyAction === 'complete'} message="Guardando..." />
      <LoadingOverlay show={busyAction === 'no-show'} message="Guardando..." />
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-gray-900">Mi agenda</h1>
        <div className="flex items-center gap-2 text-sm">
          <button className="btn-secondary py-1 px-3" onClick={() => setWeekStart(addDays(weekStart, -7))}>‹ Semana anterior</button>
          <span className="text-gray-600 capitalize">{formatDateOnly(weekStart)} – {formatDateOnly(weekEnd)}</span>
          <button className="btn-secondary py-1 px-3" onClick={() => setWeekStart(addDays(weekStart, 7))}>Semana siguiente ›</button>
        </div>
      </div>

      <div className="card p-6">
        <AvailabilityCalendar days={days} mode="agenda" loading={loading} onSlotClick={handleSlotClick} />
      </div>

      <AppointmentDetailCard
        appointment={selected}
        onClose={() => setSelected(null)}
        onDownload={() => handleDownloadReceipt(selected.id)}
        onRelease={() => handleRelease(selected.id)}
        onCancel={() => handleCancel(selected.id)}
        onEditMedicalInfo={openEditMedicalInfo}
        onMarkCompleted={() => handleMarkCompleted(selected.id)}
        onMarkNoShow={() => handleMarkNoShow(selected.id)}
        onMarkArrived={() => handleMarkArrived(selected.id)}
        onGeneratePrescription={openPrescriptionModal}
        busyAction={busyAction}
      />

      {editingMedicalInfo && (
        <Modal title="Editar información médica" onClose={() => setEditingMedicalInfo(false)} maxWidth="max-w-sm">
          <form onSubmit={handleSaveMedicalInfo} className="space-y-4">
            <MedicalInfoFields value={medicalInfoForm} onChange={setMedicalInfoForm} idPrefix="doctor-agenda" />
            <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
              <button type="button" className="btn-secondary" onClick={() => setEditingMedicalInfo(false)}>Cancelar</button>
              <button type="submit" disabled={savingMedicalInfo} className="btn-primary">{savingMedicalInfo ? 'Guardando...' : 'Guardar'}</button>
            </div>
          </form>
        </Modal>
      )}

      {voiding && (
        <Modal title="Anular receta" onClose={() => setVoiding(null)} maxWidth="max-w-sm">
          <form onSubmit={handleVoidPrescription} className="space-y-4">
            <p className="text-sm text-gray-600">
              La receta del {formatDate(voiding.createdAt)} no se borra: queda en el historial marcada como
              anulada (su PDF lo indica). Después puedes emitir la corregida.
            </p>
            <div>
              <label className="block text-gray-700 mb-1 font-medium text-sm">Motivo de la anulación</label>
              <textarea required rows={3} maxLength={500} className="input" value={voidReason} onChange={(e) => setVoidReason(e.target.value)} />
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
              <button type="button" className="btn-secondary" onClick={() => setVoiding(null)}>Cancelar</button>
              <button type="submit" disabled={savingVoid || !voidReason.trim()} className="btn-danger">{savingVoid ? 'Anulando...' : 'Anular receta'}</button>
            </div>
          </form>
        </Modal>
      )}

      {prescriptionModal && (
        <Modal title="Generar receta" onClose={() => setPrescriptionModal(false)} maxWidth="max-w-lg">
          {loadingPrescriptionModal ? (
            <p className="text-gray-500 text-sm">Cargando...</p>
          ) : (
            <>
              <div className="mb-4 bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm">
                <p className="text-amber-900"><span className="font-semibold">Alergias:</span> {allergiesLabel(selected?.patient)}</p>
                <p className="text-amber-900"><span className="font-semibold">Tipo de sangre:</span> {bloodTypeLabel(selected?.patient)}</p>
              </div>
              {previousPrescriptions.length > 0 && (
                <div className="mb-4 pb-4 border-b border-gray-100">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                    Recetas ya generadas para esta cita
                  </p>
                  <ul className="space-y-1.5">
                    {previousPrescriptions.map((p) => (
                      <li key={p.id} className="flex items-center justify-between gap-2 text-sm">
                        <span className="flex items-center gap-2">
                          <span className={p.voided ? 'text-gray-400 line-through' : 'text-gray-600'}>{formatDate(p.createdAt)}</span>
                          {p.voided && <span className="text-red-600 text-xs font-medium">Anulada</span>}
                        </span>
                        <span className="flex items-center gap-3 shrink-0">
                          <button
                            type="button"
                            className="text-primary-700 text-xs font-medium hover:underline"
                            onClick={() => handleDownloadPreviousPrescription(p.id)}
                          >
                            Descargar PDF
                          </button>
                          {!p.voided && (
                            <button
                              type="button"
                              className="text-red-600 text-xs font-medium hover:underline"
                              onClick={() => { setVoiding(p); setVoidReason('') }}
                            >
                              Anular
                            </button>
                          )}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <form onSubmit={handleGeneratePrescription} className="space-y-4">
                <div>
                  <label className="block text-gray-700 mb-1 font-medium text-sm">Diagnóstico (opcional)</label>
                  <textarea
                    rows={3} maxLength={2000} className="input"
                    placeholder="Ej. Faringoamigdalitis aguda"
                    value={prescriptionDiagnosis}
                    onChange={(e) => setPrescriptionDiagnosis(e.target.value)}
                  />
                  <p className="text-xs text-gray-400 mt-1">Se imprime en la receta antes de las indicaciones.</p>
                </div>
                <div>
                  <label className="block text-gray-700 mb-1 font-medium text-sm">Indicaciones / receta</label>
                  <textarea
                    required rows={10} className="input"
                    value={prescriptionContent}
                    onChange={(e) => setPrescriptionContent(e.target.value)}
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    Se precargó tu plantilla base -- ajústala para este paciente antes de generar el PDF.
                  </p>
                </div>
                <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
                  <button type="button" className="btn-secondary" onClick={() => setPrescriptionModal(false)}>Cancelar</button>
                  <button type="submit" disabled={savingPrescription} className="btn-primary">
                    {savingPrescription ? 'Generando...' : 'Generar receta'}
                  </button>
                </div>
              </form>
            </>
          )}
        </Modal>
      )}
    </div>
  )
}
