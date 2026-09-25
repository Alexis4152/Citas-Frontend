import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  cancelByToken, downloadGuestReceipt, getAppointmentByToken, requestGuestAppointmentLinks, rescheduleByToken,
} from '../api/appointments'
import { useAuth } from '../context/AuthContext'
import { useNotify } from '../context/NotifyContext'
import { downloadBlob } from '../utils/media'
import { onlyDigits, PHONE_INPUT_PROPS } from '../utils/phone'
import { formatDateOnly, formatTimeOnly } from '../utils/format'
import LoadingOverlay from '../components/LoadingOverlay'
import StatusBadge, { PaymentBadge } from '../components/StatusBadge'
import RefundNotice from '../components/RefundNotice'
import { formatMoney, hasPrice } from '../utils/money'
import RescheduleSlotModal from '../components/RescheduleSlotModal'

/**
 * Página pública /cancelar-cita/:token — sin login, con el código (UUID) de la cita del invitado.
 * Primero muestra QUÉ cita es (doctor, fecha, sede) y desde ahí se puede reprogramar, cancelar o
 * descargar el comprobante. Si el invitado perdió su código, "recuperar mis citas" le manda los
 * enlaces al correo que dejó al agendar -- la API nunca devuelve las citas al navegador (con
 * teléfono + nombre, que son fáciles de conocer, cualquiera podría verlas o cancelarlas).
 */
export default function CancelAppointment() {
  const { token: routeToken } = useParams()
  const { isPatient } = useAuth()
  const { notify } = useNotify()
  const [token, setToken] = useState(routeToken || '')
  const [appointment, setAppointment] = useState(null)
  const [loadingAppointment, setLoadingAppointment] = useState(false)
  const [showCancelForm, setShowCancelForm] = useState(false)
  const [reason, setReason] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [rescheduling, setRescheduling] = useState(false)
  const [savingReschedule, setSavingReschedule] = useState(false)

  // Recuperar el enlace por correo, para el invitado que ya ni tiene el código a la mano.
  const [showLookup, setShowLookup] = useState(false)
  const [lookupPhone, setLookupPhone] = useState('')
  const [lookupFirstName, setLookupFirstName] = useState('')
  const [lookupLastName, setLookupLastName] = useState('')
  const [lookupDate, setLookupDate] = useState('')
  const [lookupTime, setLookupTime] = useState('')
  const [lookupLoading, setLookupLoading] = useState(false)
  const [lookupSent, setLookupSent] = useState(false)

  async function loadAppointment(value = token) {
    const clean = value.trim()
    if (!clean) {
      notify('Ingresa tu código de cita', 'error')
      return
    }
    setLoadingAppointment(true)
    try {
      const res = await getAppointmentByToken(clean)
      setAppointment(res.data.data)
      setToken(clean)
    } catch (err) {
      setAppointment(null)
      notify(err.response?.data?.message || 'No encontramos una cita con ese código', 'error')
    } finally {
      setLoadingAppointment(false)
    }
  }

  useEffect(() => {
    if (routeToken) loadAppointment(routeToken)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeToken])

  async function handleLookup(e) {
    e.preventDefault()
    if (lookupPhone.length !== 10) {
      notify('El teléfono debe tener exactamente 10 dígitos', 'error')
      return
    }
    setLookupLoading(true)
    try {
      if ((lookupDate && !lookupTime) || (!lookupDate && lookupTime)) {
        notify('Indica la fecha Y la hora de tu cita, o deja ambas vacías para recibir los enlaces por correo', 'error')
        return
      }
      const res = await requestGuestAppointmentLinks(
        lookupPhone, lookupFirstName.trim(), lookupLastName.trim(), lookupDate, lookupTime)
      if (res.data.data) {
        // Coincidió con fecha y hora: se entra a la cita directo (sin correo).
        setAppointment(res.data.data)
        setToken(res.data.data.cancelToken)
        setShowLookup(false)
      } else {
        setLookupSent(true)
      }
    } catch (err) {
      notify(err.response?.data?.message || 'No se pudo procesar la solicitud', 'error')
    } finally {
      setLookupLoading(false)
    }
  }

  async function handleDownload() {
    setDownloading(true)
    try {
      const res = await downloadGuestReceipt(token.trim())
      downloadBlob(res.data, 'comprobante-cita.pdf')
    } catch (err) {
      notify(err.response?.data?.message || 'No se pudo descargar el comprobante.', 'error')
    } finally {
      setDownloading(false)
    }
  }

  async function handleCancel(e) {
    e.preventDefault()
    setSubmitting(true)
    try {
      await cancelByToken(token.trim(), reason || undefined)
      notify('Cita cancelada correctamente', 'success')
      setShowCancelForm(false)
      await loadAppointment(token)
    } catch (err) {
      notify(err.response?.data?.message || 'No se pudo cancelar la cita.', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleReschedule(date, startTime) {
    setSavingReschedule(true)
    try {
      const res = await rescheduleByToken(token.trim(), { appointmentDate: date, startTime })
      setAppointment(res.data.data)
      setRescheduling(false)
      notify('Cita reprogramada correctamente. Te enviamos el nuevo comprobante por correo.', 'success')
    } catch (err) {
      notify(err.response?.data?.message || 'No se pudo reprogramar la cita', 'error')
    } finally {
      setSavingReschedule(false)
    }
  }

  return (
    <div className="container-app py-12 sm:py-16 flex justify-center">
      <LoadingOverlay show={submitting} message="Cancelando tu cita..." />
      <LoadingOverlay show={downloading} message="Generando comprobante..." />
      <LoadingOverlay show={loadingAppointment} message="Buscando tu cita..." />
      <div className="w-full max-w-lg card p-6 sm:p-8">
        <h1 className="text-xl font-bold text-gray-900 mb-1">Mi cita</h1>

        {isPatient ? (
          <>
            <p className="text-sm text-gray-500 mb-6">
              Ya tienes una cuenta. Esta página es solo para citas agendadas como invitado (sin
              iniciar sesión). Ve a <span className="font-medium text-gray-700">Mis citas</span> para
              ver, reprogramar, cancelar o descargar el comprobante de tus propias citas.
            </p>
            <Link to="/mis-citas" className="btn-primary w-full inline-flex justify-center">Ir a Mis citas</Link>
          </>
        ) : appointment ? (
          <div className="space-y-5 mt-4">
            <div className="border border-gray-200 rounded-lg p-4 text-sm space-y-2">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <p className="font-semibold text-gray-900">
                  Dr(a). {appointment.doctor?.firstName} {appointment.doctor?.lastName}
                </p>
                <StatusBadge status={appointment.status} />
              </div>
              <p className="text-gray-500">{appointment.doctor?.specialty?.name}</p>
              <p className="text-gray-700 capitalize">
                {formatDateOnly(appointment.appointmentDate)}, {formatTimeOnly(appointment.startTime)}
              </p>
              <p className="text-gray-500">{appointment.branch?.name}</p>
              {hasPrice(appointment.price) && (
                <p className="text-gray-500">
                  Consulta: <span className="font-medium text-gray-700">{formatMoney(appointment.price)}</span>
                  <PaymentBadge appointment={appointment} />
                </p>
              )}
            </div>

            {appointment.status === 'SCHEDULED' && !showCancelForm && (
              <div className="flex flex-col sm:flex-row gap-3">
                <button type="button" className="btn-primary flex-1" onClick={() => setRescheduling(true)}>Reprogramar</button>
                <button type="button" className="btn-danger flex-1" onClick={() => setShowCancelForm(true)}>Cancelar mi cita</button>
              </div>
            )}

            {appointment.status === 'SCHEDULED' && showCancelForm && (
              <form onSubmit={handleCancel} className="space-y-3">
                {appointment.paymentStatus === 'PAID' && <RefundNotice />}
                <label className="block text-sm">
                  <span className="block text-gray-700 mb-1 font-medium">Motivo (opcional)</span>
                  <textarea className="input" rows={3} value={reason} onChange={(e) => setReason(e.target.value)} />
                </label>
                <div className="flex gap-3">
                  <button type="button" className="btn-secondary flex-1" onClick={() => setShowCancelForm(false)}>Volver</button>
                  <button type="submit" disabled={submitting} className="btn-danger flex-1">
                    {submitting ? 'Cancelando...' : 'Confirmar cancelación'}
                  </button>
                </div>
              </form>
            )}

            {appointment.status === 'CANCELLED' && (
              <div className="bg-green-50 border border-green-200 text-green-700 text-sm rounded-lg px-4 py-3">
                Esta cita está cancelada.
              </div>
            )}

            <button type="button" disabled={downloading} onClick={handleDownload} className="btn-secondary w-full">
              {downloading ? 'Descargando...' : 'Descargar comprobante'}
            </button>
            {!routeToken && (
              <button type="button" className="text-sm text-primary-700 hover:underline"
                onClick={() => { setAppointment(null); setToken(''); setShowCancelForm(false) }}>
                Buscar otra cita
              </button>
            )}
          </div>
        ) : (
          <>
            <p className="text-sm text-gray-500 mb-6">
              Ingresa el código de tu cita (viene en el correo de confirmación) para verla, reprogramarla,
              cancelarla o volver a descargar tu comprobante.
            </p>

            <form onSubmit={(e) => { e.preventDefault(); loadAppointment() }} className="space-y-4 mb-5">
              <label className="block text-sm">
                <span className="block text-gray-700 mb-1 font-medium">Código de la cita</span>
                <input
                  required
                  className="input font-mono text-xs"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  placeholder="00000000-0000-0000-0000-000000000000"
                />
              </label>
              <button type="submit" disabled={loadingAppointment} className="btn-primary w-full">Buscar mi cita</button>
            </form>

            <div>
              <button
                type="button"
                className="text-sm text-primary-700 hover:underline"
                onClick={() => setShowLookup((v) => !v)}
              >
                {showLookup ? 'Ocultar' : '¿Perdiste tu código? Encuentra tu cita con tus datos'}
              </button>

              {showLookup && (
                <div className="mt-3 border border-gray-200 rounded-lg p-4 space-y-3">
                  {lookupSent ? (
                    <div className="bg-green-50 border border-green-200 text-green-700 text-sm rounded-lg px-4 py-3">
                      Si encontramos citas con esos datos y un correo registrado, te enviamos los enlaces por
                      correo. Revisa también tu carpeta de spam. Si no dejaste correo, vuelve a intentar
                      indicando la fecha y la hora de tu cita.
                    </div>
                  ) : (
                    <form onSubmit={handleLookup} className="space-y-3">
                      <label className="block text-sm">
                        <span className="block text-gray-700 mb-1 font-medium">Teléfono</span>
                        <input
                          required
                          {...PHONE_INPUT_PROPS}
                          className="input"
                          value={lookupPhone}
                          onChange={(e) => setLookupPhone(onlyDigits(e.target.value))}
                        />
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <label className="block text-sm">
                          <span className="block text-gray-700 mb-1 font-medium">Nombre</span>
                          <input required className="input" value={lookupFirstName} onChange={(e) => setLookupFirstName(e.target.value)} />
                        </label>
                        <label className="block text-sm">
                          <span className="block text-gray-700 mb-1 font-medium">Apellido</span>
                          <input required className="input" value={lookupLastName} onChange={(e) => setLookupLastName(e.target.value)} />
                        </label>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <label className="block text-sm">
                          <span className="block text-gray-700 mb-1 font-medium">Fecha de tu cita</span>
                          <input type="date" className="input" value={lookupDate} onChange={(e) => setLookupDate(e.target.value)} />
                        </label>
                        <label className="block text-sm">
                          <span className="block text-gray-700 mb-1 font-medium">Hora de tu cita</span>
                          <input type="time" className="input" value={lookupTime} onChange={(e) => setLookupTime(e.target.value)} />
                        </label>
                      </div>
                      <p className="text-xs text-gray-400">
                        Usa los mismos datos con los que agendaste. Si recuerdas la fecha y la hora, tu cita aparece
                        de inmediato (no necesitas correo). Si no las recuerdas, déjalas vacías y te enviamos los
                        enlaces al correo que dejaste al agendar.
                      </p>
                      <button type="submit" disabled={lookupLoading} className="btn-secondary w-full">
                        {lookupLoading ? 'Buscando...' : lookupDate && lookupTime ? 'Buscar mi cita' : 'Enviarme los enlaces por correo'}
                      </button>
                    </form>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {rescheduling && appointment && (
        <RescheduleSlotModal
          doctor={appointment.doctor}
          hint="Puedes cambiar tu cita por tu cuenta si faltan al menos 24 horas; después, comunícate con el hospital."
          saving={savingReschedule}
          onClose={() => setRescheduling(false)}
          onConfirm={handleReschedule}
        />
      )}
    </div>
  )
}
