import type { Config } from 'tailwindcss';

const config: Config = {
    content: ['./src/**/*.{js,ts,jsx,tsx}', './node_modules/@radix-ui/**/*.js'],
    theme: {
        extend: {
            fontFamily: {
                sans: ['Plus Jakarta Sans', 'system-ui', 'sans-serif'],
            },
            colors: {
                navy: {
                    DEFAULT: '#003366',
                    50: '#e6f0f7',
                    100: '#cce0ef',
                    200: '#99c2df',
                    300: '#66a3cf',
                    400: '#3385bf',
                    500: '#0066af',
                    600: '#003366',
                    700: '#00264d',
                    800: '#001a33',
                    900: '#000d1a',
                },
                green: {
                    DEFAULT: '#A2D45E',
                    50: '#f4f9ed',
                    100: '#e9f3db',
                    200: '#d3e7b7',
                    300: '#bcdb93',
                    400: '#a6cf6f',
                    500: '#A2D45E',
                    600: '#8bb751',
                    700: '#6d9040',
                    800: '#4f6a2e',
                    900: '#31431d',
                },
                sky: {
                    DEFAULT: '#38BDF8',
                    50: '#e9f7fe',
                    100: '#d3effd',
                    200: '#a7dffb',
                    300: '#7bcff9',
                    400: '#4fbff7',
                    500: '#38BDF8',
                    600: '#1da1dc',
                    700: '#1783b5',
                    800: '#11658e',
                    900: '#0b4767',
                },
                page: '#FAFAFA',
                card: '#FFFFFF',
                border: {
                    DEFAULT: '#E5E7EB',
                    sub: '#D1D5DB',
                },
                text: {
                    main: '#111827',
                    sub: '#6B7280',
                },
                gray: {
                    50: '#F9FAFB',
                    100: '#F3F4F6',
                    200: '#E5E7EB',
                    300: '#D1D5DB',
                    400: '#9CA3AF',
                    500: '#6B7280',
                    600: '#4B5563',
                    700: '#374151',
                    800: '#1F2937',
                    900: '#111827',
                },
            },
            animation: {
                'radar-sweep': 'radar-sweep 3s linear infinite',
            },
            keyframes: {
                'radar-sweep': {
                    '0%': { transform: 'rotate(0deg)' },
                    '100%': { transform: 'rotate(360deg)' },
                },
            },
        },
    },
    plugins: [],
};

export default config;
