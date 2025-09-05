/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}"
  ],
  theme: {
    extend: {
      // Colores del brand identificados en la aplicación
      colors: {
        brand: {
          primary: '#2c4b8b',
          secondary: '#1e355e',
          light: '#e6f0fa',
        },
      },
      fontFamily: {
        montserrat: ["Montserrat", "sans-serif"],
        sans: ["Montserrat", "Inter", "system-ui", "sans-serif"],
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
      },
      boxShadow: {
        'brand': '0 4px 6px -1px rgba(44, 75, 139, 0.1), 0 2px 4px -1px rgba(44, 75, 139, 0.06)',
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [
    // Plugins comentados temporalmente - se pueden habilitar si se necesitan
    // require('@tailwindcss/forms')({
    //   strategy: 'class',
    // }),
    // require('@tailwindcss/typography'),
  ],
}