/** @type {import('tailwindcss').Config} */
const config = {
    content: ['./src/**/*.{js,ts,jsx,tsx}', './node_modules/@radix-ui/**/*.js'],
    theme: {
        extend: {
            fontFamily: {
                sans: ['Plus Jakarta Sans', 'system-ui', 'sans-serif'],
            },
            colors: {
                copy: '#202020',
                secondary: '#727272',
                caption: '#A0A0A0',
                bg: {
                    default: '#FFFFFF',
                    page: '#FAFAFA',
                    contrast: '#EFEFEF',
                },
                border: '#DCDCDC',
            },
            borderRadius: {
                md: '0.375rem',
                lg: '0.5rem',
            },
        },
    },
    plugins: [],
};

export default config;
