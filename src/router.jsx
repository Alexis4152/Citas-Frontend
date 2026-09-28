import { forwardRef, useCallback } from 'react'
import {
  Link as RouterLink, NavLink as RouterNavLink, Navigate as RouterNavigate, useNavigate as useRouterNavigate,
} from 'react-router-dom'
import { hospitalPath } from './tenant'

/**
 * Link/NavLink/Navigate/useNavigate con el hospital incluido: las rutas absolutas del sitio
 * ('/login', '/admin/citas', ...) se mandan a /c/<slug>/... del hospital actual, así las
 * pantallas siguen escribiendo rutas como si hubiera un solo hospital.
 */
function withHospital(to) {
  if (typeof to === 'string') return hospitalPath(to)
  if (to && typeof to === 'object' && typeof to.pathname === 'string') {
    return { ...to, pathname: hospitalPath(to.pathname) }
  }
  return to
}

export const Link = forwardRef(function Link({ to, ...props }, ref) {
  return <RouterLink ref={ref} to={withHospital(to)} {...props} />
})

export const NavLink = forwardRef(function NavLink({ to, ...props }, ref) {
  return <RouterNavLink ref={ref} to={withHospital(to)} {...props} />
})

export function Navigate({ to, ...props }) {
  return <RouterNavigate to={withHospital(to)} {...props} />
}

export function useNavigate() {
  const navigate = useRouterNavigate()
  return useCallback((to, options) => (
    typeof to === 'number' ? navigate(to) : navigate(withHospital(to), options)
  ), [navigate])
}
