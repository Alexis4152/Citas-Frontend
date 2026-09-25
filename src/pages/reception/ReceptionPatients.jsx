import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
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

const EMPTY_PATIENT = { firstName: '', lastName: '', phone: '', email: '', createAccount: false }

export default function ReceptionPatients() {
  const navigate = useNavigate()
  // Misma pantalla para recepción y admin: los enlaces se quedan dentro del panel actual.
  const basePath = useLocation().pathname.startsWith('/admin') ? '/admin' : '/recepcion'
  const { notify } = useNotify()
  const { user } = useAuth()
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
    setModalOpen(true)
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
    setSavingPatient(true)
    try {
      const res = await createPatient({ ...newPatient, medicalInfo: toMedicalInfoPayload(newPatientMedicalInfo) })
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
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-gray-900">Pacientes</h1>
        <div className="flex flex-wrap gap-2 text-sm">
          <button className="btn-primary" onClick={openCreatePatient}>+ Agregar paciente</button>
          <button className="btn-secondary" disabled={downloadingTemplate} onClick={handleDownloadTemplate}>
            {downloadingTemplate ? 'Descargando...' : 'Plantilla Excel'}
          </button>
          <button className="btn-secondary" disabled={exporting} onClick={handleExport}>
            {exporting ? 'Exportando...' : 'Exportar Excel'}
          </button>
          <label className="btn-secondary cursor-pointer">
            {importing ? 'Importando...' : 'Importar Excel'}
            <input
              ref={importInputRef}
              type="file"
              accept=".xlsx"
              className="hidden"
              disabled={importing}
              onChange={handleImportFile}
            />
          </label>
        </div>
      </div>

      <div className="card p-4 mb-4 flex flex-wrap items-end gap-3">
        <div className="flex-1 min-w-[220px]">
          <label className="text-xs font-medium text-gray-600 block mb-1">Nombre, correo o teléfono</label>
          <input className="input" placeholder="Buscar..." value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
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
        {(query || specialtyId || doctorId) && (
          <button type="button" className="btn-secondary text-sm" onClick={handleClearSearch}>
            Limpiar
          </button>
        )}
      </div>

      <div className="card p-0 overflow-hidden">
        {loading ? (
          <p className="text-gray-500 text-sm p-4">Cargando...</p>
        ) : (
          <>
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-left text-gray-500">
                  <tr>
                    <th className="px-4 py-3 font-medium">Nombre</th>
                    <th className="px-4 py-3 font-medium">Teléfono</th>
                    <th className="px-4 py-3 font-medium">Correo</th>
                    <th className="px-4 py-3 font-medium">Cuenta</th>
                    <th className="px-4 py-3 font-medium"></th>
                  </tr>
                </thead>
                <tbody>
                  {result.content.map((p) => (
                    <tr
                      key={p.id}
                      onClick={() => viewPatient(p.id)}
                      className="border-t border-gray-100 cursor-pointer hover:bg-gray-50"
                    >
                      <td className="px-4 py-3 font-medium text-primary-700">{p.firstName} {p.lastName}</td>
                      <td className="px-4 py-3 text-gray-600">{p.phone}</td>
                      <td className="px-4 py-3 text-gray-600">{p.email || '—'}</td>
                      <td className="px-4 py-3">
                        <span className={p.hasAccount ? 'text-green-600' : 'text-gray-400'}>{p.hasAccount ? 'Sí' : 'No'}</span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={(e) => { e.stopPropagation(); viewPatient(p.id) }}
                          className="text-primary-700 hover:underline"
                        >
                          Ver historial
                        </button>
                      </td>
                    </tr>
                  ))}
                  {result.content.length === 0 && (
                    <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">Sin pacientes</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="md:hidden divide-y divide-gray-100">
              {result.content.map((p) => (
                <button
                  key={p.id}
                  onClick={() => viewPatient(p.id)}
                  className="w-full text-left px-4 py-3 hover:bg-gray-50"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-medium text-primary-700">{p.firstName} {p.lastName}</p>
                    <span className={`text-xs ${p.hasAccount ? 'text-green-600' : 'text-gray-400'}`}>{p.hasAccount ? 'Con cuenta' : 'Sin cuenta'}</span>
                  </div>
                  <p className="text-sm text-gray-600 mt-0.5">{p.phone}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{p.email || '—'}</p>
                </button>
              ))}
              {result.content.length === 0 && (
                <p className="px-4 py-8 text-center text-gray-400 text-sm">Sin pacientes</p>
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
            <MedicalInfoFields value={newPatientMedicalInfo} onChange={setNewPatientMedicalInfo} idPrefix="patients-new" />
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
