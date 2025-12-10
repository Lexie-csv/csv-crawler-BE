import '@/styles/globals.css';
import type { Metadata } from 'next';
import { Plus_Jakarta_Sans } from 'next/font/google';
import Navigation from '@/components/Navigation';

const plusJakarta = Plus_Jakarta_Sans({
    subsets: ['latin'],
    weight: ['400', '500', '600', '700'],
    variable: '--font-plus-jakarta',
});

export const metadata: Metadata = {
    title: 'CSV RADAR',
    description: 'Southeast Asia Policy & Data Intelligence',
    icons: {
        icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="45" fill="none" stroke="%232D5F3F" stroke-width="2"/><circle cx="50" cy="50" r="6" fill="%232D5F3F"/></svg>',
    },
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}): JSX.Element {
    return (
        <html lang="en" className={plusJakarta.variable}>
            <body className="antialiased">
                <Navigation />
                <main>
                    {children}
                </main>
            </body>
        </html>
    );
}
