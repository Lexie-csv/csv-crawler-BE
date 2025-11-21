'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { cn } from '@/lib/cn';
import { CsvRadarLogo } from '@/components/CsvRadarLogo';

const navItems = [
    { href: '/dashboard', label: 'Signals' },
    { href: '/sources', label: 'Sources' },
    { href: '/crawl', label: 'Jobs' },
    { href: '/digests', label: 'Newsletters' },
];

export function Navigation() {
    const pathname = usePathname();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    return (
        <nav className="shadow-lg sticky top-0 z-50 border-b border-white/10" style={{ backgroundColor: '#003366' }}>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between h-20">
                    {/* Logo */}
                    <Link href="/dashboard" className="flex items-center gap-3 transition-opacity hover:opacity-90">
                        <CsvRadarLogo className="h-10 w-10" />
                        <div className="flex flex-col">
                            <span className="text-xl font-bold tracking-tight text-white">CSV RADAR</span>
                            <span className="text-xs text-white/80">Always on watch. Always in sync.</span>
                        </div>
                    </Link>

                    {/* Desktop Navigation */}
                    <div className="hidden lg:flex items-center gap-1">
                        {navItems.map((item) => {
                            const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className={cn(
                                        'px-4 py-2 rounded-lg text-sm font-medium transition-all duration-150',
                                        isActive
                                            ? 'bg-white/10 text-white border border-white/20'
                                            : 'text-white/80 hover:bg-white/5 hover:text-white'
                                    )}
                                >
                                    {item.label}
                                </Link>
                            );
                        })}
                    </div>

                    {/* Mobile menu button */}
                    <div className="lg:hidden flex items-center">
                        <button
                            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                            className="p-2 rounded-md text-navy-300 hover:text-white hover:bg-navy-600 transition-colors min-h-[44px] min-w-[44px]"
                            aria-label="Toggle menu"
                        >
                            <svg
                                className="h-6 w-6"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                            >
                                {mobileMenuOpen ? (
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth="1.5"
                                        d="M6 18L18 6M6 6l12 12"
                                    />
                                ) : (
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth="1.5"
                                        d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"
                                    />
                                )}
                            </svg>
                        </button>
                    </div>
                </div>
            </div>

            {/* Mobile menu */}
            {mobileMenuOpen && (
                <div className="lg:hidden border-t border-white/10">
                    <div className="px-2 pt-2 pb-3 space-y-1">
                        {navItems.map((item) => {
                            const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    onClick={() => setMobileMenuOpen(false)}
                                    className={cn(
                                        'block px-4 py-3 rounded-lg text-base font-medium min-h-[44px] transition-all duration-150',
                                        isActive
                                            ? 'bg-white/10 text-white border border-white/20'
                                            : 'text-white/80 hover:bg-white/5 hover:text-white'
                                    )}
                                >
                                    {item.label}
                                </Link>
                            );
                        })}
                    </div>
                </div>
            )}
        </nav>
    );
}
