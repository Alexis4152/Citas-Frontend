import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { applyDefaultBrand, applyStoreBrand } from '../utils/theme'
import { resolveMediaUrl } from '../utils/media'
import { getHospitalConfig } from '../api/publicCatalog'

const HospitalConfigContext = createContext(null)

const DEFAULT_CONFIG = {
  name: 'Hospital San Rafael',
  logoUrl: null,
  primaryColor: '#155dea',
  description: 'Atención médica de calidad, cerca de ti.',
  contactPhone: '5555550101',
  contactEmail: 'contacto@hospital-demo.com',
}

/**
 * Trae la configuración real del hospital desde el nuevo endpoint público
 * (GET /api/public/hospital-config, ver PublicCatalogController) y la aplica a TODA la app:
 * nombre/logo en Header, Footer y StaffLayout, y color primario dinámico (rampa generada en
 * utils/theme.js) via CSS vars. logoUrl se resuelve a URL absoluta una sola vez aquí (mismo
 * criterio que el resto del proyecto usa para /uploads/**) para que los consumidores no
 * tengan que llamar resolveMediaUrl por su cuenta.
 */
export function HospitalConfigProvider({ children }) {
  const [config, setConfig] = useState(DEFAULT_CONFIG)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(() => {
    return getHospitalConfig()
      .then((r) => {
        const data = r.data.data
        const resolved = { ...data, logoUrl: resolveMediaUrl(data.logoUrl) }
        setConfig(resolved)
        applyStoreBrand(resolved.primaryColor)
        document.title = resolved.name || 'Hospital — Citas'
        return resolved
      })
      .catch(() => {
        applyDefaultBrand()
      })
  }, [])

  useEffect(() => {
    applyDefaultBrand()
    refresh().finally(() => setLoading(false))
  }, [refresh])

  return (
    <HospitalConfigContext.Provider value={{ config, loading, refresh }}>
      {children}
    </HospitalConfigContext.Provider>
  )
}

export const useHospitalConfig = () => useContext(HospitalConfigContext)
