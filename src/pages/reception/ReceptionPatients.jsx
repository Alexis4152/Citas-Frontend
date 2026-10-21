import { useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useNavigate } from '../../router'
import { searchPatients, downloadPatientsTemplate, exportPatients, importPatients, createPatient } from '../../api/reception'
import { getSpecialties, searchDoctors } from '../../api/publicCatalog'
import { useAuth } from '../../context/AuthContext'
import { downloadBlob } from '../../utils/media'
import { useNotify } from '../../context/NotifyContext'
import AdminPagination from '../../components/AdminPagination'
import SearchableSelect from '../../components/SearchableSelect'
import Modal from '../../components/Modal'
import MedicalInfoFields, { EMPTY_MEDICAL_INFO, toMedicalInfoPayload } from '../../components/MedicalInfoFields'
import useDebouncedValue from '../../hooks/useDebouncedValue'
import { onlyDigits, PHONE_INPUT_PROPS } from '../../utils/phone'
import { staffBasePath } from '../../utils/staffPath'
import PatientProfileFields, { EMPTY_PROFILE, profileProblem, toProfilePayload } from '../../components/PatientProfileFields'
import { Avatar, Badge, EmptyState, PageHeader, Skeleton } from '../../components/ui'
import { ChevronRight, Download, Plus, Upload, Users } from 'lucide-react'

const EMPTY_PATIENT = { firstName: '', lastName: '', phone: '', email: '', createAccount: false, privacyConsent: false }

export default function ReceptionPatients() {
  const navigate = useNavigate()
  // Misma pantalla para recepción, doctor y admin: los enlaces se quedan dentro del panel actual.
  const basePath = staffBasePath(useLocation().pathname)
  const { notify } = useNotify()
  const { user, can } = useAuth()
  const canOpen = can('PATIENTS_MODULE')
  const isDoctorPanel = user?.role === 'DOCTOR'
  // null = recepcionista general (o admin), sin restricción -- mismo criterio que Citas.
  const allowedSpecialtyIds = user?.specialties?.length ? new Set(user.specialties.map((s) => s.id)) : null
  const [specialties, setSpecialties] = useState([])
  const [doctors, setDoctors] = useState([])
  const [specialtyId, setSpecialtyId] = useState('')
  const [doctorId, setDoctorId] = useState('')
  const [query, setQuery] = useState('')
  const debouncedQuery = useDebouncedValue(query, 400)
  const [page, setPage] = useState(0)
  const [size, setSize] = useState(20)
  const [result, setResult] = useState({ content: [], page: 0, totalPages: 0, totalElements: 0 })
  const [loading, setLoading] = useState(true)
  const [importing, setImporting] = useState(false)
  const [downloadingTemplate, setDownloadingTemplate] = useState(false)
  const [exporting, setExporting] = useState(false)
  const importInputRef = useRef(null)

  const [modalOpen, setModalOpen] = useState(false)
  const [newPatient, setNewPatient] = useState(EMPTY_PATIENT)
  const [newPatientMedicalInfo, setNewPatientMedicalInfo] = useState(EMPTY_MEDICAL_INFO)
  const [newPatientProfile, setNewPatientProfile] = useState(EMPTY_PROFILE)
  const [savingPatient, setSavingPatient] = useState(false)
  const [createdInfo, setCreatedInfo] = useState(null)

  function load() {
    setLoading(true)
    searchPatients({ q: debouncedQuery || undefined, specialtyId: specialtyId || undefined, doctorId: doctorId || undefined, page, size })
      .then((r) => setResult(r.data.data))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [page, size, debouncedQuery, specialtyId, doctorId])
  useEffect(() => { setPage(0) }, [debouncedQuery, specialtyId, doctorId])

  useEffect(() => {
    getSpecialties().then((r) => {
      const list = r.data.data
      setSpecialties(allowedSpecialtyIds ? list.filter((sp) => allowedSpecialtyIds.has(sp.id)) : list)
    }).catch(() => {})
    searchDoctors({ page: 0, size: 100 }).then((r) => {
      const list = r.data.data.content
      setDoctors(allowedSpecialtyIds ? list.filter((d) => allowedSpecialtyIds.has(d.specialty?.id)) : list)
    }).catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Cascada especialidad -> doctor: elegir especialidad acota la lista de doctores, y si el
  // doctor ya elegido no es de esa especialidad se limpia.
  function handleSpecialtyChange(value) {
    setSpecialtyId(value)
    if (value && doctorId) {
      const current = doctors.find((d) => String(d.id) === String(doctorId))
      if (current && String(current.specialty?.id) !== String(value)) setDoctorId('')
    }
  }
  const doctorOptions = doctors
    .filter((d) => !specialtyId || String(d.specialty?.id) === String(specialtyId))
    .map((d) => ({ value: d.id, label: `Dr(a). ${d.firstName} ${d.lastName}` }))

  function handleClearSearch() {
    setQuery('')
    setSpecialtyId('')
    setDoctorId('')
    setPage(0)
  }

  function viewPatient(id) {
    navigate(`${basePath}/pacientes/${id}`)
  }

  async function handleDownloadTemplate() {
    setDownloadingTemplate(true)
    try {
      const res = await downloadPatientsTemplate()
      downloadBlob(res.data, 'plantilla-pacientes.xlsx')
    } catch {
      notify('No se pudo descargar la plantilla', 'error')
    } finally {
      setDownloadingTemplate(false)
    }
  }

  async function handleExport() {
    setExporting(true)
    try {
      const res = await exportPatients()
      downloadBlob(res.data, 'pacientes.xlsx')
    } catch {
      notify('No se pudo exportar el Excel', 'error')
    } finally {
      setExporting(false)
    }
  }

  function openCreatePatient() {
    setNewPatient(EMPTY_PATIENT)
    setNewPatientMedicalInfo(EMPTY_MEDICAL_INFO)
    setNewPatientProfile(EMPTY_PROFILE)
    setModalOpen(true)
  }

  async function handleCreatePatient(e) {
    e.preventDefault()
    if (newPatient.phone.length !== 10) {
      notify('El teléfono debe tener exactamente 10 dígitos', 'error')
      return
    }
    if (!newPatient.privacyConsent) {
      notify('Confirma que el paciente aceptó el aviso de privacidad', 'error')
      return
    }
    if (newPatient.createAccount && !newPatient.email) {
      notify('Se requiere un correo para crear la cuenta de acceso', 'error')
      return
    }
    const problem = profileProblem(newPatientProfile)
    if (problem) {
      notify(problem, 'error')
      return
    }
    setSavingPatient(true)
    try {
      const res = await createPatient({ ...newPatient, ...toProfilePayload(newPatientProfile), medicalInfo: toMedicalInfoPayload(newPatientMedicalInfo) })
      setModalOpen(false)
      notify('Paciente creado correctamente', 'success')
      if (res.data.data.temporaryPassword) {
        setCreatedInfo(res.data.data)
      }
      setPage(0)
      load()
    } catch (err) {
      notify(err.response?.data?.message || 'No se pudo crear el paciente', 'error')
    } finally {
      setSavingPatient(false)
    }
  }

  async function handleImportFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setImporting(true)
    try {
      const res = await importPatients(file)
      const { created, errors } = res.data.data
      if (errors.length === 0) {
        notify(`Se importaron ${created} pacientes correctamente`, 'success')
      } else {
        notify(`Se importaron ${created} pacientes. ${errors.length} fila(s) con error: ${errors.map((er) => `fila ${er.row} (${er.message})`).join(', ')}`, 'error')
      }
      setPage(0)
      load()
    } catch (err) {
      notify(err.response?.data?.message || 'No se pudo importar el archivo', 'error')
    } finally {
      setImporting(false)
      if (importInputRef.current) importInputRef.current.value = ''
    }
  }

  return (
    <div>
      <PageHeader icon={Users} eyebrow="Expedientes" title="Pacientes" description={canOpen ? 'Toca un paciente para abrir su expediente.' : 'Lista de pacientes. Abrir expedientes requiere permiso del administrador.'}
        actions={<>
          {can('PATIENTS_IMPORT') && (
            <button className="btn-ghost" disabled={downloadingTemplate} onClick={handleDownloadTemplate}>
              {downloadingTemplate ? 'Descargando...' : 'Plantilla'}
            </button>
          )}
          {can('PATIENTS_IMPORT') && (
            <label className="btn-secondary cursor-pointer">
              <Upload className="h-4 w-4" /> {importing ? 'Importando...' : 'Importar'}
              <input ref={importInputRef} type="file" accept=".xlsx" className="hidden" disabled={importing} onChange={handleImportFile} />
            </label>
          )}
          {can('PATIENTS_EXPORT') && (
            <button className="btn-secondary" disabled={exporting} onClick={handleExport}>
              <Download className="h-4 w-4" /> {exporting ? 'Exportando...' : 'Exportar'}
            </button>
          )}
          <button className="btn-primary" onClick={openCreatePatient}><Plus className="h-4 w-4" /> Agregar paciente</button>
        </>} />

      <div className="card p-4 mb-4 flex flex-wrap items-end gap-3">
        <div className="flex-1 min-w-[220px]">
          <label className="text-xs font-medium text-gray-600 block mb-1">Nombre, correo o teléfono</label>
          <input className="input" placeholder="Buscar..." value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        {/* El doctor solo ve a sus propios pacientes: filtrar por doctor/especialidad no aplica. */}
        {!isDoctorPanel && (<>
        <div className="min-w-[180px]">
          <label className="text-xs font-medium text-gray-600 block mb-1">Especialidad</label>
          <select className="input" value={specialtyId} onChange={(e) => handleSpecialtyChange(e.target.value)}>
            <option value="">Todas</option>
            {specialties.map((sp) => <option key={sp.id} value={sp.id}>{sp.name}</option>)}
          </select>
        </div>
        <div className="min-w-[220px]">
          <label className="text-xs font-medium text-gray-600 block mb-1">Doctor</label>
          <SearchableSelect options={doctorOptions} value={doctorId} onChange={setDoctorId} />
        </div>
        </>)}
        {(query || specialtyId || doctorId) && (
          <button type="button" className="btn-secondary text-sm" onClick={handleClearSearch}>
            Limpiar
          </button>
        )}
      </div>

      <div className="card p-0 overflow-hidden">
        {loading ? (
          <div className="space-y-3 p-5">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-12" />)}</div>
        ) : result.content.length === 0 ? (
          <EmptyState icon={Users} title="Sin pacientes" description="Prueba con otra búsqueda." />
        ) : (
          <ul className="divide-y divide-slate-100">
            {result.content.map((p) => (
              <li key={p.id}>
                <button onClick={() => viewPatient(p.id)} disabled={!canOpen} className="group flex w-full items-center gap-3 px-5 py-3.5 text-left transition hover:bg-slate-50 disabled:cursor-default disabled:hover:bg-transparent">
                  <Avatar first={p.firstName} last={p.lastName} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-slate-900">{p.firstName} {p.lastName}</p>
                    <p className="truncate text-xs text-slate-500">
                      {p.phone}{p.email && ` · ${p.email}`}{p.age != null && ` · ${p.age} años`}
                    </p>
                  </div>
                  <Badge tone={p.hasAccount ? 'green' : 'slate'} className="hidden sm:inline-flex">{p.hasAccount ? 'Con cuenta' : 'Sin cuenta'}</Badge>
                  {canOpen && <ChevronRight className="h-4 w-4 text-slate-300 transition group-hover:text-primary-600" />}
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

      {modalOpen && (
        <Modal title="Nuevo paciente" onClose={() => setModalOpen(false)}>
          <form onSubmit={handleCreatePatient} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Nombre"><input required className="input" value={newPatient.firstName} onChange={(e) => setNewPatient({ ...newPatient, firstName: e.target.value })} /></Field>
              <Field label="Apellido"><input required className="input" value={newPatient.lastName} onChange={(e) => setNewPatient({ ...newPatient, lastName: e.target.value })} /></Field>
              <Field label="Teléfono"><input required className="input" {...PHONE_INPUT_PROPS} value={newPatient.phone} onChange={(e) => setNewPatient({ ...newPatient, phone: onlyDigits(e.target.value) })} /></Field>
              <Field label={newPatient.createAccount ? 'Correo (obligatorio)' : 'Correo (opcional)'}>
                <input type="email" required={newPatient.createAccount} className="input" value={newPatient.email} onChange={(e) => setNewPatient({ ...newPatient, email: e.target.value })} />
              </Field>
            </div>
            <label className="flex items-start gap-2 text-sm text-gray-700 bg-gray-50 border border-gray-200 rounded-lg p-3">
              <input
                type="checkbox"
                className="mt-0.5"
                checked={newPatient.createAccount}
                onChange={(e) => setNewPatient({ ...newPatient, createAccount: e.target.checked })}
              />
              <span>
                Crear cuenta de acceso para este paciente — le llegará una contraseña temporal por
                correo y se le pedirá cambiarla en su primer inicio de sesión.
              </span>
            </label>
            <label className="flex items-start gap-2 rounded-xl bg-primary-50/60 p-3 text-sm text-slate-700 ring-1 ring-inset ring-primary-600/15">
              <input type="checkbox" className="mt-0.5 accent-primary-600" checked={!!newPatient.privacyConsent}
                onChange={(e) => setNewPatient({ ...newPatient, privacyConsent: e.target.checked })} />
              <span>El paciente leyó el <strong>aviso de privacidad</strong> y aceptó el tratamiento de sus datos, incluidos los de salud. Queda la constancia con fecha y versión del aviso.</span>
            </label>
            <MedicalInfoFields value={newPatientMedicalInfo} onChange={setNewPatientMedicalInfo} idPrefix="patients-new" />
            <details className="group rounded-xl ring-1 ring-slate-200">
              <summary className="cursor-pointer select-none px-4 py-3 text-sm font-semibold text-slate-700">
                Datos personales y domicilio <span className="font-normal text-slate-400">(opcional)</span>
              </summary>
              <div className="border-t border-slate-100 p-4">
                <PatientProfileFields value={newPatientProfile} onChange={setNewPatientProfile} />
              </div>
            </details>
            <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
              <button type="button" className="btn-secondary" onClick={() => setModalOpen(false)}>Cancelar</button>
              <button type="submit" disabled={savingPatient} className="btn-primary">{savingPatient ? 'Guardando...' : 'Crear paciente'}</button>
            </div>
          </form>
        </Modal>
      )}

      {createdInfo && (
        <Modal title="Cuenta creada" onClose={() => setCreatedInfo(null)} maxWidth="max-w-sm">
          <p className="text-sm text-gray-700 mb-4">
            Comunícale estos datos de acceso al paciente. Se le pedirá cambiar la contraseña la primera vez que inicie sesión.
          </p>
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-sm space-y-1">
            <p><span className="font-medium">Correo:</span> {createdInfo.email}</p>
            <p><span className="font-medium">Contraseña temporal:</span> <code>{createdInfo.temporaryPassword}</code></p>
          </div>
          <button className="btn-primary w-full mt-4" onClick={() => setCreatedInfo(null)}>Entendido</button>
        </Modal>
      )}
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
