import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <div className="container-app py-20 text-center">
      <p className="text-5xl mb-4">🩺</p>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Página no encontrada</h1>
      <p className="text-gray-500 mb-6">La página que buscas no existe o fue movida.</p>
      <Link to="/" className="btn-primary">Volver al inicio</Link>
    </div>
  )
}
