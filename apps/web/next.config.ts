import type { NextConfig } from 'next';

const config: NextConfig = {
    reactStrictMode: true,
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
