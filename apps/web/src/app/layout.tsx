import '@/styles/globals.css';
import type { Metadata } from 'next';
import { Plus_Jakarta_Sans } from 'next/font/google';
import { Navigation } from '@/components/Navigation';

const plusJakarta = Plus_Jakarta_Sans({
    subsets: ['latin'],
    weight: ['400', '500', '600', '700'],
    variable: '--font-plus-jakarta',
});

export const metadata: Metadata = {
    title: 'CSV RADAR — Policy & Regulatory Monitoring',
    description: 'Track regulatory and policy updates across Southeast Asian markets. Powered by Climate Smart Ventures.',
    icons: {
        icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="45" stroke="%23A2D45E" stroke-width="3.5" stroke-dasharray="12 8" fill="none" opacity="0.85"/><circle cx="50" cy="50" r="32" stroke="%23003366" stroke-width="6" fill="none"/><circle cx="50" cy="50" r="20" stroke="%23A2D45E" stroke-width="4" fill="none"/><circle cx="50" cy="50" r="10" fill="%23003366"/><path d="M 50 50 L 88 18" stroke="%23003366" stroke-width="6" stroke-linecap="round" opacity="0.9"/></svg>',
    },
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}): JSX.Element {
    return (
        <html lang="en" className={plusJakarta.variable}>
            <body className={plusJakarta.className}>
                <Navigation />
                <main className="min-h-screen bg-bgPage">
                    {children}
                </main>
            </body>
        </html>
    );
}
