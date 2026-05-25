/** @type {import('tailwindcss').Config} */
module.exports = {
    // Include webapp src + desktop-specific components
    content: [
        '../src/**/*.{js,ts,jsx,tsx}',
        './src/renderer/**/*.{js,ts,jsx,tsx}'
    ],
    darkMode: 'class',
    safelist: [
        'font-heading',
        'font-body',
    ],
    theme: {
        extend: {
            fontFamily: {
                heading: ['Space Grotesk', 'Inter', 'system-ui', 'sans-serif'],
                body: ['Montserrat', 'Inter', 'system-ui', 'sans-serif'],
            },
            colors: {
                primary: {
                    50: 'var(--color-primary-50)',
                    100: 'var(--color-primary-100)',
                    200: 'var(--color-primary-200)',
                    300: 'var(--color-primary-300)',
                    400: 'var(--color-primary-400)',
                    500: 'var(--color-primary-500)',
                    600: 'var(--color-primary-600)',
                    700: 'var(--color-primary-700)',
                    800: 'var(--color-primary-800)',
                    900: 'var(--color-primary-900)',
                    950: 'var(--color-primary-950)',
                },
                secondary: {
                    50: 'var(--color-secondary-50)',
                    100: 'var(--color-secondary-100)',
                    200: 'var(--color-secondary-200)',
                    300: 'var(--color-secondary-300)',
                    400: 'var(--color-secondary-400)',
                    500: 'var(--color-secondary-500)',
                    600: 'var(--color-secondary-600)',
                    700: 'var(--color-secondary-700)',
                    800: 'var(--color-secondary-800)',
                    900: 'var(--color-secondary-900)',
                    950: 'var(--color-secondary-950)',
                },
                accent: {
                    50: 'var(--color-accent-50)',
                    100: 'var(--color-accent-100)',
                    200: 'var(--color-accent-200)',
                    300: 'var(--color-accent-300)',
                    400: 'var(--color-accent-400)',
                    500: 'var(--color-accent-500)',
                    600: 'var(--color-accent-600)',
                    700: 'var(--color-accent-700)',
                    800: 'var(--color-accent-800)',
                    900: 'var(--color-accent-900)',
                },
                medical: {
                    50: 'var(--color-medical-50)',
                    100: 'var(--color-medical-100)',
                    200: 'var(--color-medical-200)',
                    300: 'var(--color-medical-300)',
                    400: 'var(--color-medical-400)',
                    500: 'var(--color-medical-500)',
                    600: 'var(--color-medical-600)',
                    700: 'var(--color-medical-700)',
                    800: 'var(--color-medical-800)',
                    900: 'var(--color-medical-900)',
                },
                health: {
                    50: 'var(--color-health-50)',
                    100: 'var(--color-health-100)',
                    200: 'var(--color-health-200)',
                    300: 'var(--color-health-300)',
                    400: 'var(--color-health-400)',
                    500: 'var(--color-health-500)',
                    600: 'var(--color-health-600)',
                    700: 'var(--color-health-700)',
                    800: 'var(--color-health-800)',
                    900: 'var(--color-health-900)',
                },
                safety: {
                    high: {
                        50: 'var(--color-safety-high-50)',
                        100: 'var(--color-safety-high-100)',
                        500: 'var(--color-safety-high-500)',
                        600: 'var(--color-safety-high-600)',
                        700: 'var(--color-safety-high-700)',
                    },
                    medium: {
                        50: 'var(--color-safety-medium-50)',
                        100: 'var(--color-safety-medium-100)',
                        500: 'var(--color-safety-medium-500)',
                        600: 'var(--color-safety-medium-600)',
                        700: 'var(--color-safety-medium-700)',
                    },
                    low: {
                        50: 'var(--color-safety-low-50)',
                        100: 'var(--color-safety-low-100)',
                        500: 'var(--color-safety-low-500)',
                        600: 'var(--color-safety-low-600)',
                        700: 'var(--color-safety-low-700)',
                    },
                },
            },
            backgroundImage: {
                'gradient-medical': 'linear-gradient(135deg, var(--color-primary-700) 0%, var(--color-primary-600) 40%, var(--color-primary-500) 100%)',
                'gradient-medical-light': 'linear-gradient(135deg, var(--color-primary-50) 0%, var(--color-primary-100) 100%)',
            },
            animation: {
                'fade-in': 'fadeIn 0.3s ease-in-out',
                'fade-out': 'fadeOut 0.2s ease-in-out',
                'scale-in': 'scaleIn 0.3s ease-in-out',
                'slide-up': 'slideUp 0.3s ease-in-out',
                'slide-down': 'slideDown 0.3s ease-in-out',
                'slide-in-right': 'slideInRight 0.3s ease-in-out',
            },
            keyframes: {
                fadeIn: {
                    '0%': { opacity: 0 },
                    '100%': { opacity: 1 },
                },
                fadeOut: {
                    '0%': { opacity: 1 },
                    '100%': { opacity: 0 },
                },
                scaleIn: {
                    '0%': { opacity: 0, transform: 'scale(0.95)' },
                    '100%': { opacity: 1, transform: 'scale(1)' },
                },
                slideUp: {
                    '0%': { opacity: 0, transform: 'translateY(10px)' },
                    '100%': { opacity: 1, transform: 'translateY(0)' },
                },
                slideDown: {
                    '0%': { opacity: 0, transform: 'translateY(-10px)' },
                    '100%': { opacity: 1, transform: 'translateY(0)' },
                },
                slideInRight: {
                    '0%': { opacity: 0, transform: 'translateX(-10px)' },
                    '100%': { opacity: 1, transform: 'translateX(0)' },
                },
            },
            boxShadow: {
                card: '0 2px 8px rgba(0, 0, 0, 0.08)',
                'card-hover': '0 4px 12px rgba(0, 0, 0, 0.12)',
            },
            fontSize: {
                xxs: '0.625rem',
            },
            spacing: {
                '72': '18rem',
                '80': '20rem',
                '96': '24rem',
            },
        },
    },
    plugins: []
}
