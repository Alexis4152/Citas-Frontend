import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { getDoctorDetail, getDoctorAvailability } from '../api/publicCatalog'
import AvailabilityCalendar from '../components/AvailabilityCalendar'
import { resolveMediaUrl } from '../utils/media'
import { formatMoney, hasPrice } from '../utils/money'

function todayIso() {
  return new Date().toISOString().slice(0, 10)
}

export default function DoctorDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [doctor, setDoctor] = useState(null)
  const [days, setDays] = useState([])
  const [loadingAvailability, setLoadingAvailability] = useState(true)
  const [fromDate, setFromDate] = useState(todayIso())

  useEffect(() => {
    getDoctorDetail(id).then((r) => setDoctor(r.data.data)).catch(() => {})
  }, [id])

  useEffect(() => {
    setLoadingAvailability(true)
    getDoctorAvailability(id, fromDate, 7)
      .then((r) => setDays(r.data.data))
      .finally(() => setLoadingAvailability(false))
  }, [id, fromDate])

  function handleSelectSlot(date, slot) {
    navigate('/agendar', {
      state: { doctor, date, startTime: slot.startTime },
    })
  }

  if (!doctor) return <div className="container-app py-10 text-gray-500">Cargando...</div>

  return (
    <div className="container-app py-8 sm:py-10">
      <div className="card p-6 mb-6 flex flex-col sm:flex-row gap-6">
        {doctor.photoUrl ? (
          <img src={resolveMediaUrl(doctor.photoUrl)} alt="" className="w-24 h-24 rounded-full object-cover shrink-0" />
        ) : (
          <div className="w-24 h-24 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-2xl font-bold shrink-0">
            {doctor.firstName?.[0]}{doctor.lastName?.[0]}
          </div>
        )}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dr(a). {doctor.firstName} {doctor.lastName}</h1>
          <p className="text-primary-700 font-medium">{doctor.specialty?.name}</p>
          <p className="text-sm mt-2">
            <span className="font-medium text-gray-700">Consulta: </span>
            {hasPrice(doctor.consultationPrice)
              ? <span className="font-bold text-gray-900">{formatMoney(doctor.consultationPrice)}</span>
              : <span className="text-gray-500">precio por confirmar en recepción</span>}
          </p>
          {doctor.licenseNumber && <p className="text-xs text-gray-400 mt-1">Cédula profesional: {doctor.licenseNumber}</p>}
          {doctor.bio && <p className="text-sm text-gray-600 mt-3">{doctor.bio}</p>}
          <p className="text-sm text-gray-500 mt-3">
            <span className="font-medium text-gray-700">Sedes: </span>
            {doctor.branches?.map((b) => b.name).join(' · ') || 'Sin sede asignada'}
          </p>
        </div>
      </div>

      <div className="card p-6">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <h2 className="font-semibold text-gray-900">Disponibilidad</h2>
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
        <AvailabilityCalendar days={days} mode="selectable" loading={loadingAvailability} onSelectSlot={handleSelectSlot} />
        <p className="text-xs text-gray-400 mt-4">Selecciona un horario disponible para continuar con tu reserva.</p>
      </div>
    </div>
  )
}
