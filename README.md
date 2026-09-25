# Hospital — Frontend de citas

SPA para pacientes y personal (doctores, recepción, administración) de un sistema de citas
hospitalarias. Consume la API REST de `hospital-backend` (Spring Boot + PostgreSQL), que ya
está completa y corriendo por separado.

## Stack

- React 18 + Vite 5
- Tailwind CSS 3 (paleta de marca dinámica vía variables CSS, ver `src/utils/theme.js`)
- React Router 6
- Axios
- Context API para estado global (sin Redux/Zustand)
- JavaScript plano, sin TypeScript

Misma arquitectura y convenciones que `libreria-frontend` (ver `src/api/axios.js`,
`src/context/*`, `src/layouts/*`), adaptada al dominio de citas médicas.

## Prerrequisitos

- Node.js 18+
- El backend (`hospital-backend`) corriendo en `http://localhost:8082` contra una base
  PostgreSQL (`hospital_citas`) ya sembrada con datos de demo.

## Instalación y ejecución

```bash
npm install
npm run dev      # http://localhost:5175, con proxy /api y /uploads -> :8082
```

```bash
npm run build     # build de producción a dist/
npm run preview   # sirve el build
```

## Arquitectura

```
src/
  api/                     un módulo por recurso del backend (axios.js es la instancia
                            compartida con el interceptor de JWT y el manejo de 401)
  context/
    AuthContext.jsx         sesión (JWT + user), expone role/isAdmin/isDoctor/isReceptionist/isPatient
    NotifyContext.jsx        toasts + confirmDialog (reemplaza alert()/confirm())
    HospitalConfigContext.jsx  marca del hospital (nombre/color) — ver nota abajo
  components/
    PrivateRoute.jsx         guard de rutas por rol (roles=[...])
    AvailabilityCalendar.jsx  grid días×horas reutilizable (reserva y agenda del doctor)
    Header.jsx / Footer.jsx / AdminPagination.jsx
  layouts/
    PublicLayout.jsx          Header + Footer + Outlet (público + paciente)
    StaffLayout.jsx            sidebar responsive compartido por /doctor, /recepcion, /admin
                                (recibe `links` y `panelLabel` como props)
  pages/
    Home, Doctors, DoctorDetail, BookAppointment, AppointmentConfirmation,
    CancelAppointment, Login, Register, MyAppointments, NotFound
    doctor/     DoctorAgenda, DoctorSchedule, DoctorScheduleExceptions
    reception/  ReceptionDashboard, ReceptionAppointments, ReceptionNewAppointment, ReceptionPatients
    admin/      AdminDashboard, AdminBranches, AdminSpecialties, AdminDoctors + AdminDoctorForm,
                AdminReceptionists, AdminHospitalConfig, AdminEmailConfig
  utils/
    theme.js    generador de rampa de color (hex -> HSL -> variables CSS), copiado verbatim
    format.js   formatDate, formatTimeOnly, formatDateOnly
```

Rutas: un `<Route element={<PublicLayout/>}>` envuelve todas las páginas públicas + de
paciente con un `*` -> NotFound; y tres secciones protegidas por rol, cada una con su propio
`StaffLayout`: `/doctor` (DOCTOR), `/recepcion` (RECEPTIONIST, ADMIN), `/admin` (ADMIN).

## Decisiones y desviaciones

- **`HospitalConfigContext` no hace fetch a un endpoint público.** El backend solo expone
  `GET /api/admin/hospital-config` protegido con `ADMIN` (`AdminHospitalConfigController`) —
  no existe un equivalente público al `store-config` del proyecto de referencia. Como este
  contexto envuelve toda la app (incluidas las páginas públicas, donde no hay sesión), no
  puede depender de un endpoint que solo un admin autenticado puede leer. Se usa una marca
  por defecto fija (nombre, color) y solo se aplica el tema de color dinámico. La página
  `AdminHospitalConfig.jsx` sí lee/edita la configuración real vía la API de admin.
- **`AdminHospitalConfig.jsx` y `AdminEmailConfig.jsx` son páginas separadas** (con rutas y
  entradas de sidebar propias), a diferencia del proyecto de referencia donde
  `AdminStoreConfig.jsx` incluye la tarjeta de correo en la misma pantalla — así se pidió
  explícitamente en el encargo.
- **`AdminDoctors`/`AdminDoctorForm` son solo de listado + alta.** `AdminDoctorController`
  en el backend no expone un endpoint de edición (`PUT`), solo `GET` (listar/detalle) y
  `POST` (alta combinada de User+Doctor+especialidad+sedes+horario inicial). No se inventó
  un endpoint de edición en el frontend.
- **`AdminReceptionists` es solo de alta**, por el mismo motivo:
  `AdminReceptionistController` solo expone `POST`.
- **`AvailabilityCalendar`** se reutiliza en dos modos: `selectable` (reserva pública/
  recepción, consume `DayAvailabilityResponse` tal cual lo entrega el backend) y `agenda`
  (vista propia del doctor). Para el modo `agenda` no existe un endpoint de "grid" en el
  backend — se arma manualmente a partir de `GET /doctor/appointments?from&to`, agrupando
  las citas propias por fecha/hora en el mismo formato de filas/columnas.
- No se usó ninguna librería de calendario ni de fechas (mismo criterio que
  `libreria-frontend`, que tampoco usa una librería de fechas).

## Credenciales de prueba (ya sembradas en la base real)

| Rol | Correo | Contraseña |
|---|---|---|
| ADMIN | admin@hospital-demo.com | Admin123! |
| RECEPTIONIST | recepcion@hospital-demo.com | Recepcion123! |
| DOCTOR | doctor.pediatria@hospital-demo.com | Doctor123! |
| PATIENT | paciente@demo.com | Paciente123! |

## Flujo principal de usuario

1. Un visitante entra a `/`, va a "Buscar doctor" (`/doctores`), filtra por especialidad/sede.
2. Entra al perfil de un doctor (`/doctores/:id`), ve su disponibilidad semanal y elige un
   horario disponible.
3. Cae en `/agendar` (asistente de 4 pasos: doctor → sede → horario → datos). Si no tiene
   sesión, captura nombre/apellido/teléfono (correo opcional) y agenda como invitado
   (`POST /appointments/guest`); si tiene sesión de paciente, solo captura el motivo de la
   consulta y agenda para sí mismo (`POST /appointments`).
4. Ve la confirmación (`/cita-confirmada`) con folio, doctor, sede, fecha/hora y las
   recomendaciones. Si agendó como invitado, ahí mismo obtiene el enlace de cancelación
   (`/cancelar-cita/:token`, no requiere cuenta).
5. Un paciente con cuenta gestiona sus citas en `/mis-citas` (próximas/historial, cancelar).
6. El personal usa sus paneles respectivos (`/doctor`, `/recepcion`, `/admin`) para agenda,
   horarios, recepción telefónica de citas y administración del catálogo (sedes,
   especialidades, doctores, recepcionistas, configuración del hospital y de correo).

## Verificación realizada

- `npm install` sin errores.
- `npm run dev` levanta limpio en el puerto 5175 (ver log: `VITE v5.4.21 ready in 741 ms`),
  con el proxy `/api` reenviando correctamente al backend real en `:8082` (confirmado con
  `curl http://localhost:5175/api/public/specialties`).
- `npm run build` compila sin errores ni warnings (139 módulos, ~330 kB de JS sin comprimir).
- Se validaron por `curl` contra el backend real (con datos sembrados, doctor id 1 / sede id 1)
  los payloads exactos que envía cada pantalla: login de los 4 roles, reserva como invitado,
  reserva de un paciente autenticado, alta de especialidad (admin), alta de paciente + reserva
  desde recepción, cancelación por token, y alta de horario del doctor — los 9 devolvieron
  200/201 con la forma de respuesta esperada, sin ajustes necesarios en los nombres de campo.

**No verificado visualmente.** No hay navegador ni herramienta de captura de pantalla
disponible en este entorno: no se hizo click-through de la UI. La barra de calidad usada fue
build limpio + arranque limpio del dev server + los `curl` anteriores confirmando que los
contratos de la API coinciden exactamente entre frontend y backend. Layout responsive,
estados de carga/error visuales, y la interacción real del `AvailabilityCalendar` no se
comprobaron con los ojos.
