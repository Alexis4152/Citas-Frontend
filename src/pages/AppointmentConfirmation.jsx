import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useNotify } from '../context/NotifyContext'
import { downloadOwnReceipt, downloadGuestReceipt } from '../api/appointments'
import RecommendationsNotice from '../components/RecommendationsNotice'
import SpeiInstructions from '../components/SpeiInstructions'
import { formatMoney, hasPrice } from '../utils/money'
import { downloadBlob } from '../utils/media'
import { formatDateOnly, formatTimeOnly } from '../utils/format'

export default function AppointmentConfirmation() {
  const location = useLocation()
  const { user } = useAuth()
  const { notify } = useNotify()
  const appointment = location.state?.appointment
  // Resultado del pago anticipado (si el paciente eligió pagar al agendar).
  const payment = location.state?.payment
  const paymentError = location.state?.paymentError
  const [downloading, setDownloading] = useState(false)

  async function handleDownloadReceipt() {
    setDownloading(true)
    try {
      const res = user ? await downloadOwnReceipt(appointment.id) : await downloadGuestReceipt(appointment.cancelToken)
      downloadBlob(res.data, `comprobante-cita-${appointment.id}.pdf`)
    } catch {
      notify('No se pudo descargar el comprobante', 'error')
    } finally {
      setDownloading(false)
    }
  }

  return (
    <div className="container-app py-8 sm:py-12">
      <div className="max-w-2xl mx-auto text-center mb-8">
        <p className="text-5xl mb-3">✅</p>
        <h1 className="text-2xl font-bold text-gray-900">¡Cita agendada!</h1>
        {appointment && <p className="text-gray-600 mt-1">Folio de cita: <span className="font-semibold">#{appointment.id}</span></p>}
      </div>

      {appointment ? (
        <div className="max-w-2xl mx-auto card p-6 sm:p-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm mb-6">
            <div>
              <h3 className="font-semibold text-gray-900 mb-1">Doctor</h3>
              <p className="text-gray-600">Dr(a). {appointment.doctor?.firstName} {appointment.doctor?.lastName}</p>
              <p className="text-gray-600">{appointment.doctor?.specialty?.name}</p>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-1">Sede</h3>
              <p className="text-gray-600">{appointment.branch?.name}</p>
              <p className="text-gray-600">{appointment.branch?.address}, {appointment.branch?.city}</p>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-1">Fecha y hora</h3>
              <p className="text-gray-600 capitalize">{formatDateOnly(appointment.appointmentDate)}</p>
              <p className="text-gray-600">{formatTimeOnly(appointment.startTime)} – {formatTimeOnly(appointment.endTime)}</p>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-1">Paciente</h3>
              <p className="text-gray-600">{appointment.patient?.firstName} {appointment.patient?.lastName}</p>
              <p className="text-gray-600">{appointment.patient?.phone}</p>
            </div>
          </div>

          {appointment.reasonForVisit && (
            <div className="mb-6 text-sm">
              <h3 className="font-semibold text-gray-900 mb-1">Motivo de la consulta</h3>
              <p className="text-gray-600">{appointment.reasonForVisit}</p>
            </div>
          )}

          {hasPrice(appointment.price) && (
            <div className="mb-6 text-sm space-y-3">
              <div className="flex items-center justify-between border border-gray-200 rounded-lg px-4 py-3">
                <span className="text-gray-600">Precio de la consulta</span>
                <span className="font-bold text-gray-900">{formatMoney(appointment.price)}</span>
              </div>
              {payment?.status === 'COMPLETED' && (
                <div className="bg-green-50 border border-green-200 text-green-800 rounded-lg px-4 py-3">
                  <p className="font-semibold">Pago recibido ✓</p>
                  <p className="text-xs mt-0.5">
                    Tu consulta ya está pagada{payment.authorizationCode ? ` (autorización ${payment.authorizationCode})` : ''}.
                    Si cancelas con al menos 1 hora de anticipación, se te reembolsa.
                  </p>
                </div>
              )}
              {payment?.status === 'PENDING' && <SpeiInstructions payment={payment} amount={appointment.price} />}
              {paymentError && (
                <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3">
                  <p className="font-semibold">No se pudo procesar tu pago</p>
                  <p className="text-xs mt-0.5">{paymentError}. Tu cita quedó agendada y podrás pagar en recepción.</p>
                </div>
              )}
              {!payment && !paymentError && (
                <p className="text-gray-500 text-xs">Pagarás en recepción al terminar tu consulta (efectivo o tarjeta).</p>
              )}
            </div>
          )}

          <RecommendationsNotice
            text={appointment.doctor?.specialty?.recommendations}
            className="bg-primary-50 border border-primary-200 text-primary-800 text-sm rounded-lg px-4 py-3"
          />

          {appointment.cancelToken && (
            <div className="mt-6 pt-6 border-t border-dashed border-gray-200 text-sm">
              <h3 className="font-semibold text-gray-900 mb-1">¿Necesitas cancelar?</h3>
              <p className="text-gray-500 mb-2">
                Como agendaste sin iniciar sesión, guarda este enlace para cancelar tu cita cuando lo necesites:
              </p>
              <Link
                to={`/cancelar-cita/${appointment.cancelToken}`}
                className="text-primary-700 font-medium hover:underline break-all"
              >
                {window.location.origin}/cancelar-cita/{appointment.cancelToken}
              </Link>
            </div>
          )}
        </div>
      ) : (
        <p className="text-center text-gray-500">
          No tenemos el detalle de esta cita a la mano. {user ? 'Consulta tus citas para ver el detalle completo.' : ''}
        </p>
      )}

      <div className="max-w-2xl mx-auto flex flex-wrap gap-3 justify-center mt-8">
        {appointment && (
          <button onClick={handleDownloadReceipt} disabled={downloading} className="btn-secondary">
            {downloading ? 'Descargando...' : 'Descargar comprobante (PDF)'}
          </button>
        )}
        {user ? (
          <Link to="/mis-citas" className="btn-primary">Ver mis citas</Link>
        ) : (
          <Link to="/doctores" className="btn-primary">Buscar otro doctor</Link>
        )}
        <Link to="/" className="btn-secondary">Volver al inicio</Link>
      </div>
    </div>
  )
}
