import Modal from './Modal'
import { formatDate, formatDateOnly } from '../utils/format'

/**
 * Receta completa en pantalla (diagnóstico e indicaciones tal como se capturaron, con sus
 * saltos de línea), para consultarla sin tener que descargar el PDF. El PDF sigue disponible
 * desde el mismo botón de abajo.
 */
export default function PrescriptionViewModal({ prescription: p, onClose, onDownload }) {
  return (
    <Modal title={`Receta · ${p.patientName}`} onClose={onClose} maxWidth="max-w-2xl">
      <div className="space-y-4 text-sm">
        <div className="text-gray-500 text-xs space-y-0.5">
          {p.doctorName && <p className="text-gray-700 font-medium text-sm">{p.doctorName}{p.specialtyName ? ` · ${p.specialtyName}` : ''}</p>}
          <p className="capitalize">Cita del {formatDateOnly(p.appointmentDate)} · emitida el {formatDate(p.createdAt)}</p>
        </div>

        {p.voided && (
          <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-red-700 text-xs">
            <p className="font-medium">Receta anulada{p.voidedAt ? ` el ${formatDate(p.voidedAt)}` : ''}</p>
            {p.voidReason && <p>Motivo: {p.voidReason}</p>}
          </div>
        )}

        {p.diagnosis && (
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">Diagnóstico</h4>
            <p className="text-gray-900 whitespace-pre-wrap">{p.diagnosis}</p>
          </div>
        )}

        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">Indicaciones</h4>
          <div className="rounded-lg bg-gray-50 border border-gray-100 px-3 py-2 text-gray-900 whitespace-pre-wrap break-words">
            {p.content}
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" className="btn-secondary" onClick={onClose}>Cerrar</button>
          {onDownload && (
            <button type="button" className="btn-primary" onClick={() => onDownload(p.id)}>Descargar PDF</button>
          )}
        </div>
      </div>
    </Modal>
  )
}
