import type { NextConfig } from 'next';

const config: NextConfig = {
    reactStrictMode: true,
    // Proxy API requests to backend server
    async rewrites() {
        return [
            {
                source: '/api/v1/:path*',
                destination: 'http://localhost:3001/api/v1/:path*',
            },
        ];
    },
    // `turbopack` experimental option can be present at runtime but TypeScript types
    // for the installed Next version may not include it. Use a wide-typed cast to
    // avoid type errors while keeping the runtime config.
    experimental: ({
        turbopack: {
            resolveAlias: {
                '@/*': './src/*',
            },
        },
    } as unknown) as NextConfig['experimental'],
};

export default config;
