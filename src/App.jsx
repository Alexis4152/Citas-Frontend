import { BrowserRouter, Routes, Route, useParams } from 'react-router-dom'
import { setHospitalSlug } from './tenant'
import { Navigate } from './router'
import { HospitalConfigProvider } from './context/HospitalConfigContext'
import { AuthProvider } from './context/AuthContext'
import { NotifyProvider } from './context/NotifyContext'
import PrivateRoute from './components/PrivateRoute'

import PublicLayout from './layouts/PublicLayout'
import PlatformLayout from './layouts/PlatformLayout'
import StaffLayout from './layouts/StaffLayout'

import Home from './pages/Home'
import Doctors from './pages/Doctors'
import DoctorDetail from './pages/DoctorDetail'
import BookAppointment from './pages/BookAppointment'
import AppointmentConfirmation from './pages/AppointmentConfirmation'
import CancelAppointment from './pages/CancelAppointment'
import Login from './pages/Login'
import Register from './pages/Register'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'
import ChangePassword from './pages/ChangePassword'
import MyAppointments from './pages/MyAppointments'
import NotFound from './pages/NotFound'
import PlatformHome from './pages/platform/PlatformHome'
import LegacyRedirect from './pages/platform/LegacyRedirect'
import SuperAdminHospitals from './pages/platform/SuperAdminHospitals'

import DoctorAgenda from './pages/doctor/DoctorAgenda'
import DoctorMyAppointments from './pages/doctor/DoctorMyAppointments'
import DoctorSchedule from './pages/doctor/DoctorSchedule'
import DoctorScheduleExceptions from './pages/doctor/DoctorScheduleExceptions'
import DoctorPrescriptions from './pages/doctor/DoctorPrescriptions'
import DoctorIncome from './pages/doctor/DoctorIncome'

import ReceptionDashboard from './pages/reception/ReceptionDashboard'
import ReceptionAppointments from './pages/reception/ReceptionAppointments'
import ReceptionNewAppointment from './pages/reception/ReceptionNewAppointment'
import ReceptionPatients from './pages/reception/ReceptionPatients'
import ReceptionPatientDetail from './pages/reception/ReceptionPatientDetail'
import ReceptionDoctorAgenda from './pages/reception/ReceptionDoctorAgenda'
import ReceptionCashCut from './pages/reception/ReceptionCashCut'
import ReceptionCharge from './pages/reception/ReceptionCharge'

import AdminDashboard from './pages/admin/AdminDashboard'
import AdminBranches from './pages/admin/AdminBranches'
import AdminSpecialties from './pages/admin/AdminSpecialties'
import AdminDoctors from './pages/admin/AdminDoctors'
import AdminDoctorDetail from './pages/admin/AdminDoctorDetail'
import AdminDoctorForm from './pages/admin/AdminDoctorForm'
import AdminReceptionists from './pages/admin/AdminReceptionists'
import AdminHospitalConfig from './pages/admin/AdminHospitalConfig'
import AdminEmailConfig from './pages/admin/AdminEmailConfig'
import AdminPayments from './pages/admin/AdminPayments'

const DOCTOR_LINKS = [
  { to: '/doctor', end: true, icon: '📅', label: 'Mi agenda' },
  { to: '/doctor/citas', icon: '📋', label: 'Mis citas' },
  { to: '/doctor/pacientes', icon: '👥', label: 'Pacientes' },
  { to: '/doctor/recetas', icon: '💊', label: 'Recetas' },
  { to: '/doctor/cobro', icon: '💵', label: 'Cobrar' },
  { to: '/doctor/corte', icon: '🧾', label: 'Corte de caja' },
  { to: '/doctor/cobros', icon: '💰', label: 'Cobros' },
  { to: '/doctor/horario', icon: '🕒', label: 'Mi horario' },
  { to: '/doctor/ausencias', icon: '🏖️', label: 'Ausencias' },
]

const RECEPTION_LINKS = [
  { to: '/recepcion', end: true, icon: '📊', label: 'Hoy' },
  { to: '/recepcion/citas', icon: '📋', label: 'Citas' },
  { to: '/recepcion/nueva-cita', icon: '➕', label: 'Nueva cita' },
  { to: '/recepcion/cobro', icon: '💵', label: 'Cobrar' },
  { to: '/recepcion/agenda-doctores', icon: '🗓️', label: 'Agenda doctores' },
  { to: '/recepcion/corte', icon: '🧾', label: 'Corte de caja' },
]

const ADMIN_LINKS = [
  { to: '/admin', end: true, icon: '📊', label: 'Dashboard' },
  { to: '/admin/citas', icon: '📋', label: 'Citas' },
  { to: '/admin/pacientes', icon: '👥', label: 'Pacientes' },
  { to: '/admin/cobro', icon: '💵', label: 'Cobrar' },
  { to: '/admin/corte', icon: '🧾', label: 'Corte de caja' },
  { to: '/admin/cobros', icon: '💰', label: 'Cobros' },
  { to: '/admin/sedes', icon: '🏥', label: 'Sedes' },
  { to: '/admin/especialidades', icon: '🏷️', label: 'Especialidades' },
  { to: '/admin/doctores', icon: '🩺', label: 'Doctores' },
  { to: '/admin/recepcionistas', icon: '🧑‍💼', label: 'Recepcionistas' },
  { to: '/admin/configuracion', icon: '⚙️', label: 'Configuración' },
  { to: '/admin/correo', icon: '✉️', label: 'Correo' },
]

const SUPERADMIN_LINKS = [
  { to: '/superadmin', end: true, icon: '🏥', label: 'Hospitales' },
]

/**
 * Multi-hospital: cada hospital/consultorio vive en /c/<slug> con TODO el sitio (público,
 * paneles de doctor/recepción/admin). La raíz es de la plataforma: portada de Nexora, login
 * y panel del SUPER_ADMIN, y la redirección de enlaces viejos sin /c/<slug>.
 */
export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/c/:slug/*" element={<HospitalApp />} />
        <Route path="/*" element={<PlatformApp />} />
      </Routes>
    </BrowserRouter>
  )
}

/** Sitio de un hospital. key={slug}: al cambiar de hospital se recarga su marca y su sesión. */
function HospitalApp() {
  const { slug } = useParams()
  // Antes de pintar a los hijos: axios, los Link y la sesión toman el hospital de aquí.
  setHospitalSlug(slug)
  return (
    <HospitalConfigProvider key={slug}>
      <AuthProvider key={slug}>
        <NotifyProvider>
          <HospitalRoutes />
        </NotifyProvider>
      </AuthProvider>
    </HospitalConfigProvider>
  )
}

/** Raíz del sitio (sin hospital). */
function PlatformApp() {
  setHospitalSlug(null)
  return (
    <HospitalConfigProvider key="platform">
      <AuthProvider key="platform">
        <NotifyProvider>
          <Routes>
            <Route element={<PlatformLayout />}>
              <Route index element={<PlatformHome />} />
              <Route path="login" element={<Login />} />
              <Route path="recuperar-password" element={<ForgotPassword />} />
              <Route path="restablecer-password/:token" element={<ResetPassword />} />
              <Route path="cambiar-password" element={<PrivateRoute><ChangePassword /></PrivateRoute>} />
              {/* Enlaces de cita que se mandaron por correo antes de /c/<slug>. */}
              <Route path="cancelar-cita/:token" element={<LegacyRedirect />} />
              <Route path="cita-confirmada" element={<LegacyRedirect />} />
              <Route path="*" element={<LegacyRedirect />} />
            </Route>
            <Route
              path="superadmin"
              element={
                <PrivateRoute roles={['SUPER_ADMIN']}>
                  <StaffLayout links={SUPERADMIN_LINKS} panelLabel="Panel Nexora" showPublicSiteLink={false} />
                </PrivateRoute>
              }
            >
              <Route index element={<SuperAdminHospitals />} />
            </Route>
          </Routes>
        </NotifyProvider>
      </AuthProvider>
    </HospitalConfigProvider>
  )
}

function HospitalRoutes() {
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route index element={<Home />} />
        <Route path="doctores" element={<Doctors />} />
        <Route path="doctores/:id" element={<DoctorDetail />} />
        <Route path="agendar" element={<BookAppointment />} />
        <Route path="cita-confirmada" element={<AppointmentConfirmation />} />
        <Route path="cancelar-cita" element={<CancelAppointment />} />
        <Route path="cancelar-cita/:token" element={<CancelAppointment />} />
        <Route path="login" element={<Login />} />
        <Route path="registro" element={<Register />} />
        <Route path="recuperar-password" element={<ForgotPassword />} />
        <Route path="restablecer-password/:token" element={<ResetPassword />} />
        <Route path="cambiar-password" element={<PrivateRoute><ChangePassword /></PrivateRoute>} />

        <Route path="mis-citas" element={<PrivateRoute roles={['PATIENT']}><MyAppointments /></PrivateRoute>} />

        <Route path="*" element={<NotFound />} />
      </Route>

      <Route
        path="doctor"
        element={
          <PrivateRoute roles={['DOCTOR']}>
            <StaffLayout links={DOCTOR_LINKS} panelLabel="Panel de doctor" showNotifications />
          </PrivateRoute>
        }
      >
        <Route index element={<DoctorAgenda />} />
        <Route path="citas" element={<DoctorMyAppointments />} />
        <Route path="recetas" element={<DoctorPrescriptions />} />
        {/* Mismos módulos que recepción; el backend los acota a los pacientes y citas del
            propio doctor (ver DoctorScope). */}
        <Route path="pacientes" element={<ReceptionPatients />} />
        <Route path="pacientes/:id" element={<ReceptionPatientDetail />} />
        <Route path="cobro" element={<ReceptionCharge />} />
        <Route path="corte" element={<ReceptionCashCut />} />
        <Route path="cobros" element={<DoctorIncome />} />
        <Route path="horario" element={<DoctorSchedule />} />
        <Route path="ausencias" element={<DoctorScheduleExceptions />} />
        {/* Nombre anterior del módulo: los enlaces guardados siguen funcionando. */}
        <Route path="excepciones" element={<Navigate to="/doctor/ausencias" replace />} />
      </Route>

      <Route
        path="recepcion"
        element={
          <PrivateRoute roles={['RECEPTIONIST', 'ADMIN']}>
            <StaffLayout links={RECEPTION_LINKS} panelLabel="Panel de recepción" showNotifications />
          </PrivateRoute>
        }
      >
        <Route index element={<ReceptionDashboard />} />
        <Route path="citas" element={<ReceptionAppointments />} />
        <Route path="nueva-cita" element={<ReceptionNewAppointment />} />
        <Route path="agenda-doctores" element={<ReceptionDoctorAgenda />} />
        {/* El módulo de pacientes es solo del panel administrativo (/admin/pacientes). */}
        <Route path="corte" element={<ReceptionCashCut />} />
        <Route path="cobro" element={<ReceptionCharge />} />
      </Route>

      <Route
        path="admin"
        element={
          <PrivateRoute roles={['ADMIN']}>
            <StaffLayout links={ADMIN_LINKS} panelLabel="Panel administrativo" showNotifications />
          </PrivateRoute>
        }
      >
        <Route index element={<AdminDashboard />} />
        {/* Mismo componente que /recepcion/citas: el backend ya autoriza ADMIN en
            /api/reception/** y esta pantalla no tiene nada específico de recepción
            -- así el director del hospital ve/filtra las citas de TODOS los
            doctores (agenda, canceladas, etc.) sin salir del panel administrativo. */}
        <Route path="citas" element={<ReceptionAppointments />} />
        {/* Mismo componente que /recepcion/agenda-doctores -- el botón "Ver agenda"
            de AdminDoctorDetail enlaza aquí con ?doctorId= para abrir directo la
            agenda del doctor seleccionado. */}
        <Route path="agenda-doctores" element={<ReceptionDoctorAgenda />} />
        {/* Mismo módulo de pacientes que recepción (el backend ya autoriza ADMIN en /api/reception/**). */}
        <Route path="pacientes" element={<ReceptionPatients />} />
        <Route path="pacientes/:id" element={<ReceptionPatientDetail />} />
        <Route path="corte" element={<ReceptionCashCut />} />
        <Route path="cobro" element={<ReceptionCharge />} />
        <Route path="cobros" element={<AdminPayments />} />
        <Route path="sedes" element={<AdminBranches />} />
        <Route path="especialidades" element={<AdminSpecialties />} />
        <Route path="doctores" element={<AdminDoctors />} />
        <Route path="doctores/nuevo" element={<AdminDoctorForm />} />
        <Route path="doctores/:id" element={<AdminDoctorDetail />} />
        <Route path="doctores/:id/editar" element={<AdminDoctorForm />} />
        <Route path="recepcionistas" element={<AdminReceptionists />} />
        <Route path="configuracion" element={<AdminHospitalConfig />} />
        <Route path="correo" element={<AdminEmailConfig />} />
      </Route>
    </Routes>
  )
}
