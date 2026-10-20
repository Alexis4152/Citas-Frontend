import colors from 'tailwindcss/colors'

// Paleta de marca dinámica: "primary" (y su alias "brand") apuntan a variables CSS que
// utils/theme.js genera a partir del color del hospital, así cada hospital tiene su color sin
// recompilar ni tocar componentes — mismo mecanismo que nexora-hotel y DemoPV.
function withOpacity(variableName) {
  return ({ opacityValue }) =>
    opacityValue !== undefined ? `rgb(var(${variableName}) / ${opacityValue})` : `rgb(var(${variableName}))`
}

const ramp = (prefix) =>
  Object.fromEntries([50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950].map((k) => [k, withOpacity(`--${prefix}-${k}`)]))

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        primary: ramp('brand'),
        brand: ramp('brand'),
        // Grises fríos (slate) en todo el sitio: más limpios que el gris neutro por defecto.
        gray: colors.slate,
        // Superficies oscuras de marca (menú lateral, fondos "aurora").
        ink: {
          950: '#05080f',
          900: '#0a0f1c',
          850: '#0e1526',
          800: '#131b30',
          700: '#1d2742',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Fraunces', 'Georgia', 'serif'],
      },
      boxShadow: {
        soft: '0 1px 2px rgb(15 23 42 / 0.04), 0 8px 24px -8px rgb(15 23 42 / 0.12)',
        glow: '0 0 0 1px rgb(var(--brand-500) / 0.25), 0 12px 40px -12px rgb(var(--brand-600) / 0.55)',
        lift: '0 2px 4px rgb(15 23 42 / 0.04), 0 18px 40px -16px rgb(15 23 42 / 0.25)',
      },
      keyframes: {
        'fade-up': { from: { opacity: 0, transform: 'translateY(10px)' }, to: { opacity: 1, transform: 'none' } },
        'scale-in': { from: { opacity: 0, transform: 'scale(.97)' }, to: { opacity: 1, transform: 'none' } },
        'slide-in-right': { from: { opacity: 0, transform: 'translateX(24px)' }, to: { opacity: 1, transform: 'none' } },
        float: { '0%,100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-10px)' } },
        'pulse-ring': { '0%': { boxShadow: '0 0 0 0 rgb(245 158 11 / .45)' }, '100%': { boxShadow: '0 0 0 8px rgb(245 158 11 / 0)' } },
      },
      animation: {
        'fade-up': 'fade-up .5s cubic-bezier(.2,.8,.2,1) both',
        'scale-in': 'scale-in .2s ease-out both',
        'slide-in-right': 'slide-in-right .3s cubic-bezier(.2,.8,.2,1) both',
        float: 'float 7s ease-in-out infinite',
        'pulse-ring': 'pulse-ring 1.6s ease-out infinite',
      },
    },
  },
  plugins: [],
}
