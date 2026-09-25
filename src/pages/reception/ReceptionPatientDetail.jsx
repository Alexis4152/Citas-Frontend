import { useEffect, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import {
  getPatient, searchAppointments, updatePatientMedicalInfo, listPatientPrescriptions, downloadPrescriptionPdfStaff,
  listPatientDuplicates, mergePatients,
} from '../../api/reception'
import { formatDate, formatDateOnly, formatTimeOnly } from '../../utils/format'
import { downloadBlob } from '../../utils/media'
import { useNotify } from '../../context/NotifyContext'
import AdminPagination from '../../components/AdminPagination'
import Modal from '../../components/Modal'
import MedicalInfoFields, { EMPTY_MEDICAL_INFO, allergiesLabel, bloodTypeLabel, fromPatientResponse, toMedicalInfoPayload } from '../../components/MedicalInfoFields'

const STATUS_TABS = [
  { value: '', label: 'Todas' },
  { value: 'SCHEDULED', label: 'Programadas' },
  { value: 'COMPLETED', label: 'Atendidas' },
  { value: 'CANCELLED', label: 'Canceladas' },
  { value: 'NO_SHOW', label: 'No asistió' },
]

const CANCELLED_BY_LABEL = {
  PATIENT: 'el paciente',
  DOCTOR: 'el doctor',
  RECEPTIONIST: 'recepción',
  ADMIN: 'administración',
  GUEST: 'el paciente (invitado, sin cuenta)',
}

/**
 * Ficha de un paciente para recepción/admin: datos de contacto y su historial completo de
 * citas (mismo patrón que AdminDoctorDetail.jsx) -- reemplaza el panel lateral "Historial de
 * citas" que antes vivía dentro de ReceptionPatients.jsx, ahora en su propia pantalla para
 * no amontonar el listado y el detalle en la misma vista.
 */
export default function ReceptionPatientDetail() {
  const { id } = useParams()
  const basePath = useLocation().pathname.startsWith('/admin') ? '/admin' : '/recepcion'
  const { notify, confirmDialog } = useNotify()
  const [patient, setPatient] = useState(null)
  const [loadingProfile, setLoadingProfile] = useState(true)
  const [counts, setCounts] = useState(null)

  const [editingMedicalInfo, setEditingMedicalInfo] = useState(false)
  const [medicalInfoForm, setMedicalInfoForm] = useState(EMPTY_MEDICAL_INFO)
  const [savingMedicalInfo, setSavingMedicalInfo] = useState(false)

  const [status, setStatus] = useState('')
  const [page, setPage] = useState(0)
  const [size, setSize] = useState(20)
  const [result, setResult] = useState({ content: [], page: 0, totalPages: 0, totalElements: 0 })
  const [loadingAppointments, setLoadingAppointments] = useState(true)

  const [prescriptions, setPrescriptions] = useState([])
  // Posibles duplicados (mismo teléfono o correo) y fusión de registros.
  const [duplicates, setDuplicates] = useState([])
  const [merging, setMerging] = useState(false)
  // Se incrementa tras fusionar para volver a cargar la ficha (citas, recetas, conteos).
  const [reloadKey, setReloadKey] = useState(0)
  const [loadingPrescriptions, setLoadingPrescriptions] = useState(true)

  useEffect(() => {
    setLoadingProfile(true)
    getPatient(id).then((r) => setPatient(r.data.data)).finally(() => setLoadingProfile(false))

    listPatientDuplicates(id).then((r) => setDuplicates(r.data.data)).catch(() => setDuplicates([]))

    setLoadingPrescriptions(true)
    listPatientPrescriptions(id).then((r) => setPrescriptions(r.data.data)).finally(() => setLoadingPrescriptions(false))

    // Conteos por estado (patrón: varias llamadas livianas con size=1 solo para leer
    // totalElements, en vez de traer todas las citas para contarlas en el cliente) -- mismo
    // patrón que AdminDoctorDetail.jsx.
    Promise.all(
      ['SCHEDULED', 'COMPLETED', 'CANCELLED', 'NO_SHOW'].map((s) =>
        searchAppointments({ patientId: id, status: s, size: 1 }).then((r) => r.data.data.totalElements))
    ).then(([scheduled, completed, cancelled, noShow]) => {
      setCounts({ scheduled, completed, cancelled, noShow, total: scheduled + completed + cancelled + noShow })
    }).catch(() => {})
  }, [id, reloadKey])

  useEffect(() => {
    setLoadingAppointments(true)
    searchAppointments({ patientId: id, status: status || undefined, page, size })
      .then((r) => setResult(r.data.data))
      .finally(() => setLoadingAppointments(false))
  }, [id, status, page, size, reloadKey])

  if (loadingProfile || !patient) {
    return <p className="text-gray-500 text-sm">Cargando...</p>
  }

  function openEditMedicalInfo() {
    setMedicalInfoForm(fromPatientResponse(patient))
    setEditingMedicalInfo(true)
  }

  async function handleSaveMedicalInfo(e) {
    e.preventDefault()
    setSavingMedicalInfo(true)
    try {
      const res = await updatePatientMedicalInfo(id, toMedicalInfoPayload(medicalInfoForm))
      setPatient(res.data.data)
      setEditingMedicalInfo(false)
      notify('Información médica actualizada', 'success')
    } catch (err) {
      notify(err.response?.data?.message || 'No se pudo guardar', 'error')
    } finally {
      setSavingMedicalInfo(false)
    }
  }

  async function handleMerge(duplicate) {
    const ok = await confirmDialog(
      `¿Fusionar a ${duplicate.firstName} ${duplicate.lastName} (${duplicate.phone}) dentro de ${patient.firstName} ${patient.lastName}? ` +
      'Todas sus citas y recetas pasarán a esta ficha y el otro registro quedará inactivo. Nada se borra.',
      { confirmText: 'Fusionar' })
    if (!ok) return
    setMerging(true)
    try {
      await mergePatients(duplicate.id, patient.id)
      notify('Pacientes fusionados correctamente', 'success')
      setReloadKey((k) => k + 1)
    } catch (err) {
      notify(err.response?.data?.message || 'No se pudo fusionar', 'error')
    } finally {
      setMerging(false)
    }
  }

  async function handleDownloadPrescription(prescriptionId) {
    try {
      const res = await downloadPrescriptionPdfStaff(prescriptionId)
      downloadBlob(res.data, `receta-${prescriptionId}.pdf`)
    } catch {
      notify('No se pudo descargar la receta', 'error')
    }
  }

  return (
    <div>
      <Link to={`${basePath}/pacientes`} className="text-sm text-primary-700 hover:underline">‹ Volver a Pacientes</Link>

      <div className="card p-6 mt-3 mb-6 flex flex-col sm:flex-row gap-6">
        <div className="w-24 h-24 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-2xl font-bold shrink-0">
          {patient.firstName?.[0]}{patient.lastName?.[0]}
        </div>
        <div className="flex-1">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-gray-900">{patient.firstName} {patient.lastName}</h1>
            <button onClick={openEditMedicalInfo} className="btn-secondary text-sm">Editar información médica</button>
          </div>
          <p className="text-sm text-gray-500 mt-1">{patient.phone} {patient.email && `· ${patient.email}`}</p>
          <p className="text-sm text-gray-500">
            Cuenta de acceso: <span className={patient.hasAccount ? 'text-green-600 font-medium' : 'text-gray-400'}>{patient.hasAccount ? 'Sí' : 'No'}</span>
          </p>
          <div className="mt-3 pt-3 border-t border-gray-100 text-sm text-gray-600 space-y-0.5">
            {/* Rojo = dato sin capturar (falta información médica); verde = ya capturado. */}
            <p>
              <span className="font-medium text-gray-800">Alergias:</span>{' '}
              <span className={`font-medium ${patient.allergies?.trim() ? 'text-green-600' : 'text-red-600'}`}>{allergiesLabel(patient)}</span>
            </p>
            <p>
              <span className="font-medium text-gray-800">Tipo de sangre:</span>{' '}
              <span className={`font-medium ${patient.bloodType ? 'text-green-600' : 'text-red-600'}`}>{bloodTypeLabel(patient)}</span>
            </p>
            {patient.medicalInfoUpdatedAt && (
              <p className="text-xs text-gray-400">
                Última modificación: {patient.medicalInfoUpdatedByName || 'el propio paciente (invitado)'}, {formatDate(patient.medicalInfoUpdatedAt)}
              </p>
            )}
          </div>
        </div>
      </div>

      {duplicates.length > 0 && (
        <div className="mb-6 bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm">
          <p className="font-semibold text-amber-900">Posibles registros duplicados</p>
          <p className="text-amber-800 text-xs mt-0.5 mb-3">
            Comparten teléfono o correo con este paciente. Una familia puede compartir teléfono: revisa antes de fusionar.
          </p>
          <ul className="space-y-2">
            {duplicates.map((d) => (
              <li key={d.id} className="flex items-center justify-between gap-3 flex-wrap bg-white border border-amber-100 rounded-lg px-3 py-2">
                <div className="min-w-0">
                  <Link to={`${basePath}/pacientes/${d.id}`} className="font-medium text-gray-900 hover:underline">{d.firstName} {d.lastName}</Link>
                  <p className="text-xs text-gray-500">{d.phone}{d.email && ` · ${d.email}`}{d.hasAccount && ' · con cuenta'}</p>
                </div>
                <button type="button" disabled={merging} onClick={() => handleMerge(d)} className="btn-secondary text-xs shrink-0">
                  {merging ? 'Fusionando...' : 'Fusionar en este paciente'}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {editingMedicalInfo && (
        <Modal title="Editar información médica" onClose={() => setEditingMedicalInfo(false)} maxWidth="max-w-sm">
          <form onSubmit={handleSaveMedicalInfo} className="space-y-4">
            <MedicalInfoFields value={medicalInfoForm} onChange={setMedicalInfoForm} idPrefix="patient-detail" />
            <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
              <button type="button" className="btn-secondary" onClick={() => setEditingMedicalInfo(false)}>Cancelar</button>
              <button type="submit" disabled={savingMedicalInfo} className="btn-primary">{savingMedicalInfo ? 'Guardando...' : 'Guardar'}</button>
            </div>
          </form>
        </Modal>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mb-6">
        <StatCard label="Total" value={counts?.total} />
        <StatCard label="Programadas" value={counts?.scheduled} color="text-primary-700" />
        <StatCard label="Atendidas" value={counts?.completed} color="text-green-700" />
        <StatCard label="Canceladas" value={counts?.cancelled} color="text-red-600" />
        <StatCard label="No asistió" value={counts?.noShow} color="text-gray-500" />
      </div>

      <div className="card p-0 overflow-hidden mb-6">
        <div className="px-4 py-3 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Historial de recetas</h2>
          <p className="text-xs text-gray-500">Solo lectura -- las genera el doctor durante la consulta.</p>
        </div>
        {loadingPrescriptions ? (
          <p className="text-gray-500 text-sm p-4">Cargando...</p>
        ) : prescriptions.length === 0 ? (
          <p className="text-gray-400 text-sm p-4 text-center">Sin recetas</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {prescriptions.map((p) => (
              <li key={p.id} className="px-4 py-3 flex items-center justify-between gap-3 text-sm">
                <div className="min-w-0">
                  <p className="text-gray-900 font-medium">
                    {p.doctorName} · {p.specialtyName}
                    {p.voided && <span className="ml-2 text-xs font-medium text-red-600">Anulada</span>}
                  </p>
                  <p className="text-gray-500 text-xs">Cita del {formatDateOnly(p.appointmentDate)} · emitida el {formatDate(p.createdAt)}</p>
                  {p.voided && p.voidReason && <p className="text-red-500 text-xs">Motivo de la anulación: {p.voidReason}</p>}
                </div>
                <button
                  className="text-primary-700 text-xs font-medium hover:underline shrink-0"
                  onClick={() => handleDownloadPrescription(p.id)}
                >
                  Descargar PDF
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="card p-0 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 flex flex-wrap gap-2">
          {STATUS_TABS.map((t) => (
            <button
              key={t.value}
              onClick={() => { setStatus(t.value); setPage(0) }}
              className={`text-xs font-medium px-3 py-1.5 rounded-full ${
                status === t.value ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {loadingAppointments ? (
          <p className="text-gray-500 text-sm p-4">Cargando...</p>
        ) : (
          <>
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-left text-gray-500">
                  <tr>
                    <th className="px-4 py-3 font-medium">Doctor</th>
                    <th className="px-4 py-3 font-medium">Fecha</th>
                    <th className="px-4 py-3 font-medium">Sede</th>
                    <th className="px-4 py-3 font-medium">Estado</th>
                    <th className="px-4 py-3 font-medium">Detalle</th>
                  </tr>
                </thead>
                <tbody>
                  {result.content.map((a) => (
                    <tr key={a.id} className="border-t border-gray-100">
                      <td className="px-4 py-3 font-medium text-gray-900">Dr(a). {a.doctor?.firstName} {a.doctor?.lastName}</td>
                      <td className="px-4 py-3 text-gray-600 capitalize">{formatDateOnly(a.appointmentDate)}, {formatTimeOnly(a.startTime)}</td>
                      <td className="px-4 py-3 text-gray-600">{a.branch?.name}</td>
                      <td className="px-4 py-3 text-gray-600">{a.status}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs">
                        {a.status === 'CANCELLED' && (
                          <>
                            Cancelada por {CANCELLED_BY_LABEL[a.cancelledByRole] || a.cancelledByName}
                            {a.cancelReason && <> — {a.cancelReason}</>}
                          </>
                        )}
                        {a.status === 'SCHEDULED' && a.reasonForVisit}
                      </td>
                    </tr>
                  ))}
                  {result.content.length === 0 && (
                    <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">Sin citas</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="md:hidden divide-y divide-gray-100">
              {result.content.map((a) => (
                <div key={a.id} className="px-4 py-3">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-medium text-gray-900">Dr(a). {a.doctor?.firstName} {a.doctor?.lastName}</p>
                    <span className="text-xs text-gray-500 shrink-0">{a.status}</span>
                  </div>
                  <p className="text-sm text-gray-600 mt-0.5 capitalize">{formatDateOnly(a.appointmentDate)}, {formatTimeOnly(a.startTime)} · {a.branch?.name}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {a.status === 'CANCELLED' && (
                      <>
                        Cancelada por {CANCELLED_BY_LABEL[a.cancelledByRole] || a.cancelledByName}
                        {a.cancelReason && <> — {a.cancelReason}</>}
                      </>
                    )}
                    {a.status === 'SCHEDULED' && a.reasonForVisit}
                  </p>
                </div>
              ))}
              {result.content.length === 0 && (
                <p className="px-4 py-8 text-center text-gray-400 text-sm">Sin citas</p>
              )}
            </div>
          </>
        )}
        <AdminPagination
          page={result.page} size={size} totalPages={result.totalPages} totalElements={result.totalElements}
          contentLength={result.content.length}
          onPageChange={setPage} onSizeChange={(s) => { setSize(s); setPage(0) }}
        />
      </div>
    </div>
  )
}

function StatCard({ label, value, color = 'text-gray-900' }) {
  return (
    <div className="card p-4 text-center">
      <p className={`text-2xl font-bold ${color}`}>{value ?? '—'}</p>
      <p className="text-xs text-gray-500 mt-1">{label}</p>
    </div>
  )
}
