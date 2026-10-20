import { Compass } from 'lucide-react'
import { Link } from '../router'

export default function NotFound() {
  return (
    <div className="container-app flex flex-col items-center py-24 text-center">
      <div className="mb-6 grid h-16 w-16 place-items-center rounded-3xl bg-primary-50 text-primary-600 ring-1 ring-primary-100">
        <Compass className="h-8 w-8" />
      </div>
      <p className="eyebrow mb-2">Error 404</p>
      <h1 className="font-display text-3xl font-semibold tracking-tight text-slate-900">Esta página no existe</h1>
      <p className="mb-8 mt-2 max-w-md text-slate-500">La página que buscas no existe o fue movida.</p>
      <Link to="/" className="btn-primary">Volver al inicio</Link>
    </div>
  )
}
