'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import CsvRadarLogo from './CsvRadarLogo';

export default function Navigation() {
    const pathname = usePathname();

    const links = [
        { href: '/signals', label: 'Signals' },
        { href: '/sources', label: 'Sources' },
        { href: '/jobs', label: 'Jobs' },
        { href: '/newsletters', label: 'Newsletters' },
    ];

    return (
        <nav className="bg-[#1B3A57] text-white border-b border-[#2A4A67]">
            <div className="max-w-7xl mx-auto px-8">
                <div className="flex items-center justify-between h-16">
                    <Link href="/signals" className="flex items-center gap-3 hover:opacity-90 transition-opacity">
                        <CsvRadarLogo className="h-8 w-8" />
                        <div className="flex flex-col">
                            <span className="text-lg font-bold tracking-tight leading-none">CSV RADAR</span>
                            <span className="text-[10px] text-white/70 leading-none">Always on watch. Always in sync.</span>
                        </div>
                    </Link>

                    <div className="flex gap-1">
                        {links.map((link) => (
                            <Link
                                key={link.href}
                                href={link.href}
                                className={`px-5 py-2 rounded-lg text-sm font-medium transition-colors ${pathname === link.href
                                    ? 'bg-white/15 text-white'
                                    : 'text-white/80 hover:text-white hover:bg-white/10'
                                    }`}
                            >
                                {link.label}
                            </Link>
                        ))}
                    </div>
                </div>
            </div>
        </nav>
    );
}
