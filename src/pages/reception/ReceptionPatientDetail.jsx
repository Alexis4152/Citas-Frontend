import { useEffect, useState } from 'react'
import { useLocation, useParams } from 'react-router-dom'
import { ArrowLeft, ChevronRight, Droplets, FileText, HeartPulse, MapPin, Pencil, Phone, ShieldAlert, UserRound } from 'lucide-react'
import { Link } from '../../router'
import {
  getPatient, searchAppointments, updatePatientMedicalInfo, updatePatientProfile, listPatientPrescriptions, downloadPrescriptionPdfStaff,
  listPatientDuplicates, mergePatients, downloadAppointmentReceipt,
} from '../../api/reception'
import { formatDate, formatDateOnly, formatTimeOnly } from '../../utils/format'
import { downloadBlob } from '../../utils/media'
import { useNotify } from '../../context/NotifyContext'
import { useAuth } from '../../context/AuthContext'
import AdminPagination from '../../components/AdminPagination'
import Modal from '../../components/Modal'
import PrescriptionViewModal from '../../components/PrescriptionViewModal'
import AppointmentDetailCard from '../../components/AppointmentDetailCard'
import { AppointmentBadges } from '../../components/StatusBadge'
import MedicalInfoFields, { EMPTY_MEDICAL_INFO, allergiesLabel, bloodTypeLabel, fromPatientResponse, toMedicalInfoPayload } from '../../components/MedicalInfoFields'
import PatientProfileFields, { SEX_LABELS, profileFromPatient, profileProblem, toProfilePayload } from '../../components/PatientProfileFields'
import { Avatar, Badge, EmptyState, Skeleton } from '../../components/ui'
import { onlyDigits, PHONE_INPUT_PROPS } from '../../utils/phone'
import { nameError, emailError, phoneError } from '../../utils/validators'
import { staffBasePath } from '../../utils/staffPath'
import PatientPrivacyPanel from '../../components/PatientPrivacyPanel'

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

const address = (p) => [p.addressLine, p.neighborhood, [p.postalCode && `CP ${p.postalCode}`, p.city].filter(Boolean).join(' '), p.state]
  .filter(Boolean).join(', ')

/**
 * Expediente del paciente: datos personales y de contacto, información médica, recetas e
 * historial de citas. Cada cita o receta se abre al tocarla (el detalle trae sus acciones).
 * Editar y fusionar dependen de los permisos del rol.
 */
export default function ReceptionPatientDetail() {
  const { id } = useParams()
  const basePath = staffBasePath(useLocation().pathname)
  const { notify, confirmDialog } = useNotify()
  const { can } = useAuth()
  const canEdit = can('PATIENTS_EDIT')
  const [patient, setPatient] = useState(null)
  const [loadingProfile, setLoadingProfile] = useState(true)
  const [counts, setCounts] = useState(null)

  const [editingMedicalInfo, setEditingMedicalInfo] = useState(false)
  const [medicalInfoForm, setMedicalInfoForm] = useState(EMPTY_MEDICAL_INFO)
  const [savingMedicalInfo, setSavingMedicalInfo] = useState(false)
  const [editingProfile, setEditingProfile] = useState(false)
  const [profileForm, setProfileForm] = useState(null)
  const [savingProfile, setSavingProfile] = useState(false)

  const [status, setStatus] = useState('')
  const [page, setPage] = useState(0)
  const [size, setSize] = useState(20)
  const [result, setResult] = useState({ content: [], page: 0, totalPages: 0, totalElements: 0 })
  const [loadingAppointments, setLoadingAppointments] = useState(true)
  const [selected, setSelected] = useState(null)
  const [busyAction, setBusyAction] = useState(null)

  const [prescriptions, setPrescriptions] = useState([])
  const [viewingPrescription, setViewingPrescription] = useState(null)
  // Posibles duplicados (mismo teléfono o correo) y fusión de registros.
  const [duplicates, setDuplicates] = useState([])
  const [merging, setMerging] = useState(false)
  // Se incrementa tras fusionar para volver a cargar la ficha (citas, recetas, conteos).
  const [reloadKey, setReloadKey] = useState(0)
  const [loadingPrescriptions, setLoadingPrescriptions] = useState(true)

  useEffect(() => {
    setLoadingProfile(true)
    getPatient(id).then((r) => setPatient(r.data.data)).finally(() => setLoadingProfile(false))

    if (can('PATIENTS_MERGE')) listPatientDuplicates(id).then((r) => setDuplicates(r.data.data)).catch(() => setDuplicates([]))

    setLoadingPrescriptions(true)
    if (!can('PRESCRIPTIONS_VIEW')) setLoadingPrescriptions(false)
    else listPatientPrescriptions(id).then((r) => setPrescriptions(r.data.data)).catch(() => setPrescriptions([])).finally(() => setLoadingPrescriptions(false))

    // Conteos por estado: varias llamadas livianas con size=1 solo para leer totalElements.
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
    return <div className="space-y-4"><Skeleton className="h-48 rounded-2xl" /><Skeleton className="h-64 rounded-2xl" /></div>
  }

  function openEditProfile() {
    setProfileForm({ firstName: patient.firstName, lastName: patient.lastName, phone: patient.phone || '', email: patient.email || '', ...profileFromPatient(patient) })
    setEditingProfile(true)
  }

  async function handleSaveProfile(e) {
    e.preventDefault()
    const labeled = (label, err) => err && `${label}: ${err}`
    const problem = labeled('Nombre', nameError(profileForm.firstName)) || labeled('Apellidos', nameError(profileForm.lastName))
      || labeled('Teléfono', phoneError(profileForm.phone)) || labeled('Correo', emailError(profileForm.email, false)) || profileProblem(profileForm)
    if (problem) {
      notify(problem, 'error')
      return
    }
    setSavingProfile(true)
    try {
      const res = await updatePatientProfile(id, toProfilePayload(profileForm))
      setPatient((p) => ({ ...p, ...res.data.data }))
      setEditingProfile(false)
      notify('Datos del paciente actualizados', 'success')
    } catch (err) {
      notify(err.response?.data?.message || 'No se pudo guardar', 'error')
    } finally {
      setSavingProfile(false)
    }
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

  async function handleDownloadReceipt(appointmentId) {
    setBusyAction('download')
    try {
      const res = await downloadAppointmentReceipt(appointmentId)
      downloadBlob(res.data, `comprobante-${appointmentId}.pdf`)
    } catch {
      notify('No se pudo descargar el comprobante', 'error')
    } finally {
      setBusyAction(null)
    }
  }

  const addr = address(patient)
  // Un expediente bloqueado o anónimo (Cancelación ARCO) ya no se edita.
  const editable = canEdit && (!patient.privacyStatus || patient.privacyStatus === 'ACTIVE')

  return (
    <div>
      <Link to={`${basePath}/pacientes`} className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-primary-700">
        <ArrowLeft className="h-4 w-4" /> Pacientes
      </Link>

      <div className="card mb-5 mt-3 overflow-hidden">
        <div className="flex flex-col gap-5 p-6 sm:flex-row sm:items-start">
          <Avatar first={patient.firstName} last={patient.lastName} size="h-16 w-16 text-xl" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h1 className="font-display text-2xl font-semibold tracking-tight text-slate-900">{patient.firstName} {patient.lastName}</h1>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-slate-500">
                  {patient.age != null && <span>{patient.age} años</span>}
                  {patient.sex && <span>· {SEX_LABELS[patient.sex]}</span>}
                  <Badge tone={patient.hasAccount ? 'green' : 'slate'}>{patient.hasAccount ? 'Con cuenta' : 'Sin cuenta'}</Badge>
                </div>
              </div>
              {editable && <button onClick={openEditProfile} className="btn-secondary btn-sm"><Pencil className="h-3.5 w-3.5" /> Editar datos</button>}
            </div>
            <dl className="mt-4 grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
              <Info icon={Phone} label="Contacto">{patient.phone}{patient.email && <span className="block text-slate-500">{patient.email}</span>}</Info>
              <Info icon={MapPin} label="Domicilio">{addr || <span className="text-slate-400">Sin capturar</span>}</Info>
              <Info icon={UserRound} label="Nacimiento y CURP">
                {patient.birthDate ? formatDateOnly(patient.birthDate) : <span className="text-slate-400">Sin fecha</span>}
                {patient.curp && <span className="block font-mono text-xs text-slate-500">{patient.curp}</span>}
              </Info>
              <Info icon={ShieldAlert} label="Contacto de emergencia">
                {patient.emergencyContactName ? <>{patient.emergencyContactName} <span className="text-slate-500">· {patient.emergencyContactPhone}</span></> : <span className="text-slate-400">Sin capturar</span>}
              </Info>
            </dl>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-slate-100 bg-slate-50/60 px-6 py-3.5 text-sm">
          <span className="flex items-center gap-1.5"><HeartPulse className="h-4 w-4 text-slate-400" /> Alergias:
            <span className={`font-medium ${patient.allergies?.trim() ? 'text-slate-800' : 'text-rose-600'}`}>{allergiesLabel(patient)}</span></span>
          <span className="flex items-center gap-1.5"><Droplets className="h-4 w-4 text-slate-400" /> Sangre:
            <span className={`font-medium ${patient.bloodType ? 'text-slate-800' : 'text-rose-600'}`}>{bloodTypeLabel(patient)}</span></span>
          {patient.medicalInfoUpdatedAt && (
            <span className="text-xs text-slate-400">Actualizada por {patient.medicalInfoUpdatedByName || 'el propio paciente (invitado)'}, {formatDate(patient.medicalInfoUpdatedAt)}</span>
          )}
          {editable && (
            <button className="btn-ghost btn-sm ml-auto" onClick={() => { setMedicalInfoForm(fromPatientResponse(patient)); setEditingMedicalInfo(true) }}>
              <Pencil className="h-3.5 w-3.5" /> Información médica
            </button>
          )}
        </div>
      </div>

      <PatientPrivacyPanel patient={patient} />

      {duplicates.length > 0 && (
        <div className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm">
          <p className="font-semibold text-amber-900">Posibles registros duplicados</p>
          <p className="mb-3 mt-0.5 text-xs text-amber-800">
            Comparten teléfono o correo con este paciente. Una familia puede compartir teléfono: revisa antes de fusionar.
          </p>
          <ul className="space-y-2">
            {duplicates.map((d) => (
              <li key={d.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-100 bg-white px-3 py-2">
                <div className="min-w-0">
                  <Link to={`${basePath}/pacientes/${d.id}`} className="font-medium text-slate-900 hover:underline">{d.firstName} {d.lastName}</Link>
                  <p className="text-xs text-slate-500">{d.phone}{d.email && ` · ${d.email}`}{d.hasAccount && ' · con cuenta'}</p>
                </div>
                <button type="button" disabled={merging} onClick={() => handleMerge(d)} className="btn-secondary btn-sm shrink-0">
                  {merging ? 'Fusionando...' : 'Fusionar en este paciente'}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-5">
        <Count label="Total" value={counts?.total} />
        <Count label="Programadas" value={counts?.scheduled} />
        <Count label="Atendidas" value={counts?.completed} />
        <Count label="Canceladas" value={counts?.cancelled} />
        <Count label="No asistió" value={counts?.noShow} />
      </div>

      {can('PRESCRIPTIONS_VIEW') && <div className="card mb-5 overflow-hidden">
        <div className="border-b border-slate-100 px-5 py-3.5">
          <h2 className="font-semibold text-slate-900">Recetas</h2>
          <p className="text-xs text-slate-500">Las genera el doctor durante la consulta. Toca una para verla o descargarla.</p>
        </div>
        {loadingPrescriptions ? (
          <div className="p-5"><Skeleton className="h-12" /></div>
        ) : prescriptions.length === 0 ? (
          <p className="p-5 text-center text-sm text-slate-400">Sin recetas</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {prescriptions.map((p) => (
              <li key={p.id}>
                <button className="group flex w-full items-center gap-3 px-5 py-3 text-left text-sm transition hover:bg-slate-50"
                  onClick={() => setViewingPrescription({ ...p, patientName: p.patientName || `${patient.firstName} ${patient.lastName}` })}>
                  <FileText className="h-4 w-4 shrink-0 text-slate-400" />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-slate-900">{p.doctorName} · {p.specialtyName}</p>
                    <p className="text-xs text-slate-500">Cita del {formatDateOnly(p.appointmentDate)} · emitida el {formatDate(p.createdAt)}</p>
                    {p.voided && p.voidReason && <p className="text-xs text-rose-500">Anulada: {p.voidReason}</p>}
                  </div>
                  {p.voided && <Badge tone="red">Anulada</Badge>}
                  <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-primary-600" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>}

      <div className="card overflow-hidden">
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 px-5 py-3.5">
          <h2 className="mr-auto font-semibold text-slate-900">Historial de citas</h2>
          {STATUS_TABS.map((t) => (
            <button key={t.value} onClick={() => { setStatus(t.value); setPage(0) }}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${status === t.value ? 'bg-primary-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
              {t.label}
            </button>
          ))}
        </div>
        {loadingAppointments ? (
          <div className="space-y-3 p-5">{[0, 1].map((i) => <Skeleton key={i} className="h-12" />)}</div>
        ) : result.content.length === 0 ? (
          <EmptyState title="Sin citas" description="Aquí aparecerán sus citas." />
        ) : (
          <ul className="divide-y divide-slate-100">
            {result.content.map((a) => (
              <li key={a.id}>
                <button onClick={() => setSelected(a)} className="group flex w-full flex-col gap-2 px-5 py-3.5 text-left transition hover:bg-slate-50 sm:flex-row sm:items-center sm:gap-4">
                  <div className="w-36 shrink-0 text-sm">
                    <p className="font-medium capitalize text-slate-900">{formatDateOnly(a.appointmentDate)}</p>
                    <p className="text-xs tabular-nums text-slate-500">{formatTimeOnly(a.startTime)}</p>
                  </div>
                  <div className="min-w-0 flex-1 text-sm">
                    <p className="truncate font-medium text-slate-800">Dr(a). {a.doctor?.firstName} {a.doctor?.lastName}</p>
                    <p className="truncate text-xs text-slate-500">
                      {a.branch?.name}
                      {a.status === 'CANCELLED' && ` · Cancelada por ${CANCELLED_BY_LABEL[a.cancelledByRole] || a.cancelledByName}`}
                      {a.status === 'SCHEDULED' && a.reasonForVisit && ` · ${a.reasonForVisit}`}
                    </p>
                  </div>
                  <AppointmentBadges appointment={a} />
                  <ChevronRight className="hidden h-4 w-4 text-slate-300 group-hover:text-primary-600 sm:block" />
                </button>
              </li>
            ))}
          </ul>
        )}
        <AdminPagination
          page={result.page} size={size} totalPages={result.totalPages} totalElements={result.totalElements}
          contentLength={result.content.length}
          onPageChange={setPage} onSizeChange={(s) => { setSize(s); setPage(0) }}
        />
      </div>

      {selected && (
        <AppointmentDetailCard appointment={selected} onClose={() => setSelected(null)} busyAction={busyAction}
          onDownload={() => handleDownloadReceipt(selected.id)} />
      )}

      {editingProfile && (
        <Modal title="Datos del paciente" onClose={() => setEditingProfile(false)} maxWidth="max-w-2xl">
          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <L label="Nombre(s)"><input required maxLength={100} className="input" value={profileForm.firstName} onChange={(e) => setProfileForm({ ...profileForm, firstName: e.target.value })} /></L>
              <L label="Apellidos"><input required maxLength={100} className="input" value={profileForm.lastName} onChange={(e) => setProfileForm({ ...profileForm, lastName: e.target.value })} /></L>
              <L label="Teléfono"><input required className="input" {...PHONE_INPUT_PROPS} value={profileForm.phone} onChange={(e) => setProfileForm({ ...profileForm, phone: onlyDigits(e.target.value) })} /></L>
              <L label="Correo (opcional)"><input type="email" className="input" value={profileForm.email} onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value.trim() })} /></L>
            </div>
            <PatientProfileFields value={profileForm} onChange={setProfileForm} />
            <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
              <button type="button" className="btn-secondary" onClick={() => setEditingProfile(false)}>Cancelar</button>
              <button type="submit" disabled={savingProfile} className="btn-primary">{savingProfile ? 'Guardando...' : 'Guardar datos'}</button>
            </div>
          </form>
        </Modal>
      )}

      {editingMedicalInfo && (
        <Modal title="Editar información médica" onClose={() => setEditingMedicalInfo(false)} maxWidth="max-w-sm">
          <form onSubmit={handleSaveMedicalInfo} className="space-y-4">
            <MedicalInfoFields value={medicalInfoForm} onChange={setMedicalInfoForm} idPrefix="patient-detail" />
            <div className="flex justify-end gap-2 border-t border-slate-100 pt-2">
              <button type="button" className="btn-secondary" onClick={() => setEditingMedicalInfo(false)}>Cancelar</button>
              <button type="submit" disabled={savingMedicalInfo} className="btn-primary">{savingMedicalInfo ? 'Guardando...' : 'Guardar'}</button>
            </div>
          </form>
        </Modal>
      )}

      {viewingPrescription && (
        <PrescriptionViewModal
          prescription={viewingPrescription}
          onClose={() => setViewingPrescription(null)}
          onDownload={handleDownloadPrescription}
        />
      )}
    </div>
  )
}

function Info({ icon: Icon, label, children }) {
  return (
    <div className="flex gap-2.5">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
      <div className="min-w-0">
        <dt className="text-xs font-medium text-slate-400">{label}</dt>
        <dd className="text-slate-800">{children}</dd>
      </div>
    </div>
  )
}

function Count({ label, value }) {
  return (
    <div className="card p-4 text-center">
      <p className="font-display text-2xl font-semibold tabular-nums text-slate-900">{value ?? '—'}</p>
      <p className="mt-1 text-xs text-slate-500">{label}</p>
    </div>
  )
}

function L({ label, children }) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block font-medium text-slate-700">{label}</span>
      {children}
    </label>
  )
}
