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
import AdminArcoRequests from './pages/admin/AdminArcoRequests'
import AdminAuditLog from './pages/admin/AdminAuditLog'
import AdminPermissions from './pages/admin/AdminPermissions'
import ReportsPage from './pages/ReportsPage'
import ArcoRequestPage from './pages/ArcoRequestPage'
import PrivacyNotice from './pages/PrivacyNotice'
import PrivacyHub from './pages/PrivacyHub'
import TermsPage from './pages/TermsPage'
import ArcoTrackingPage from './pages/ArcoTrackingPage'
import PrivacyCenter from './pages/PrivacyCenter'
import DeleteAccountPage from './pages/DeleteAccountPage'
import ActivateAccount from './pages/ActivateAccount'
import AdminArcoDetail from './pages/admin/AdminArcoDetail'
import SuperAdminArco from './pages/platform/SuperAdminArco'
import {
  Banknote, Building2, CalendarDays, CalendarPlus, CalendarRange, ClipboardList, Clock3, Hospital, LayoutDashboard, Mail,
  BarChart3, History, KeyRound, Palette, Palmtree, Pill, Receipt, ShieldCheck, Stethoscope, Tags, UserCog, Users, Wallet,
} from 'lucide-react'

const DOCTOR_LINKS = [
  { section: 'Consulta', to: '/doctor', end: true, icon: CalendarDays, label: 'Mi agenda' },
  { section: 'Consulta', to: '/doctor/citas', icon: ClipboardList, label: 'Mis citas' },
  { section: 'Consulta', to: '/doctor/pacientes', icon: Users, label: 'Pacientes', perm: 'PATIENTS_MODULE' },
  { section: 'Consulta', to: '/doctor/recetas', icon: Pill, label: 'Recetas', perm: 'PRESCRIPTIONS_VIEW' },
  { section: 'Caja', to: '/doctor/cobro', icon: Banknote, label: 'Cobrar', perm: 'PAYMENTS_CHARGE' },
  { section: 'Caja', to: '/doctor/corte', icon: Receipt, label: 'Corte de caja', perm: 'CASH_CUT' },
  { section: 'Caja', to: '/doctor/cobros', icon: Wallet, label: 'Mis cobros' },
  { section: 'Caja', to: '/doctor/reportes', icon: BarChart3, label: 'Reportes', perm: 'REPORTS_VIEW' },
  { section: 'Disponibilidad', to: '/doctor/horario', icon: Clock3, label: 'Mi horario' },
  { section: 'Disponibilidad', to: '/doctor/ausencias', icon: Palmtree, label: 'Ausencias' },
]

const RECEPTION_LINKS = [
  { section: 'Operación', to: '/recepcion', end: true, icon: LayoutDashboard, label: 'Hoy' },
  { section: 'Operación', to: '/recepcion/citas', icon: ClipboardList, label: 'Citas' },
  { section: 'Operación', to: '/recepcion/nueva-cita', icon: CalendarPlus, label: 'Nueva cita', perm: 'APPOINTMENTS_CREATE' },
  { section: 'Operación', to: '/recepcion/agenda-doctores', icon: CalendarRange, label: 'Agenda de doctores', perm: 'AGENDA_DOCTORS' },
  { section: 'Operación', to: '/recepcion/pacientes', icon: Users, label: 'Pacientes', perm: 'PATIENTS_MODULE' },
  { section: 'Caja', to: '/recepcion/cobro', icon: Banknote, label: 'Cobrar', perm: 'PAYMENTS_CHARGE' },
  { section: 'Caja', to: '/recepcion/corte', icon: Receipt, label: 'Corte de caja', perm: 'CASH_CUT' },
  { section: 'Caja', to: '/recepcion/reportes', icon: BarChart3, label: 'Reportes', perm: 'REPORTS_VIEW' },
]

const ADMIN_LINKS = [
  { section: 'Operación', to: '/admin', end: true, icon: LayoutDashboard, label: 'Tablero' },
  { section: 'Operación', to: '/admin/citas', icon: ClipboardList, label: 'Citas' },
  { section: 'Operación', to: '/admin/pacientes', icon: Users, label: 'Pacientes' },
  { section: 'Caja', to: '/admin/cobro', icon: Banknote, label: 'Cobrar' },
  { section: 'Caja', to: '/admin/corte', icon: Receipt, label: 'Corte de caja' },
  { section: 'Caja', to: '/admin/cobros', icon: Wallet, label: 'Ingresos' },
  { section: 'Caja', to: '/admin/reportes', icon: BarChart3, label: 'Reportes' },
  { section: 'Catálogo', to: '/admin/doctores', icon: Stethoscope, label: 'Doctores' },
  { section: 'Catálogo', to: '/admin/especialidades', icon: Tags, label: 'Especialidades' },
  { section: 'Catálogo', to: '/admin/sedes', icon: Building2, label: 'Sedes' },
  { section: 'Catálogo', to: '/admin/recepcionistas', icon: UserCog, label: 'Recepción' },
  { section: 'Ajustes', to: '/admin/configuracion', icon: Palette, label: 'Hospital y marca' },
  { section: 'Ajustes', to: '/admin/correo', icon: Mail, label: 'Correo' },
  { section: 'Ajustes', to: '/admin/permisos', icon: KeyRound, label: 'Roles y permisos' },
  { section: 'Ajustes', to: '/admin/solicitudes-arco', icon: ShieldCheck, label: 'Solicitudes ARCO', badge: 'arco' },
  { section: 'Ajustes', to: '/admin/bitacora', icon: History, label: 'Bitácora' },
]

const SUPERADMIN_LINKS = [
  { section: 'Plataforma', to: '/superadmin', end: true, icon: Hospital, label: 'Hospitales' },
  { section: 'Plataforma', to: '/superadmin/arco', icon: ShieldCheck, label: 'Solicitudes ARCO' },
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
              <Route path="arco" element={<SuperAdminArco />} />
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
      {/* Acceso: pantalla completa dividida (ver layouts/AuthShell.jsx), sin encabezado público. */}
      <Route path="login" element={<Login />} />
      <Route path="registro" element={<Register />} />
      <Route path="recuperar-password" element={<ForgotPassword />} />
      <Route path="restablecer-password/:token" element={<ResetPassword />} />
      <Route path="cambiar-password" element={<PrivateRoute><ChangePassword /></PrivateRoute>} />

      <Route element={<PublicLayout />}>
        <Route index element={<Home />} />
        <Route path="doctores" element={<Doctors />} />
        <Route path="doctores/:id" element={<DoctorDetail />} />
        <Route path="agendar" element={<BookAppointment />} />
        <Route path="cita-confirmada" element={<AppointmentConfirmation />} />
        <Route path="cancelar-cita" element={<CancelAppointment />} />
        <Route path="cancelar-cita/:token" element={<CancelAppointment />} />
        <Route path="aviso-de-privacidad" element={<PrivacyNotice />} />
        <Route path="privacidad" element={<PrivacyHub />} />
        <Route path="terminos-y-condiciones" element={<TermsPage />} />
        <Route path="derechos-arco" element={<ArcoRequestPage />} />
        <Route path="derechos-arco/seguimiento/:token" element={<ArcoTrackingPage />} />
        <Route path="eliminar-cuenta" element={<DeleteAccountPage />} />
        <Route path="activar-cuenta/:token" element={<ActivateAccount />} />

        <Route path="mis-citas" element={<PrivateRoute roles={['PATIENT']}><MyAppointments /></PrivateRoute>} />
        <Route path="mi-privacidad" element={<PrivateRoute roles={['PATIENT']}><PrivacyCenter /></PrivateRoute>} />
        {/* Nombre anterior: los enlaces de correos viejos siguen funcionando. */}
        <Route path="mis-solicitudes-arco" element={<Navigate to="/mi-privacidad" replace />} />

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
        <Route path="reportes" element={<ReportsPage />} />
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
        {/* Solo con el permiso "Abrir expedientes" (el admin lo habilita en Roles y permisos). */}
        <Route path="pacientes" element={<ReceptionPatients />} />
        <Route path="pacientes/:id" element={<ReceptionPatientDetail />} />
        <Route path="reportes" element={<ReportsPage />} />
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
        <Route path="solicitudes-arco" element={<AdminArcoRequests />} />
        <Route path="solicitudes-arco/:id" element={<AdminArcoDetail />} />
        <Route path="bitacora" element={<AdminAuditLog />} />
        <Route path="permisos" element={<AdminPermissions />} />
        <Route path="reportes" element={<ReportsPage />} />
      </Route>
    </Routes>
  )
}
