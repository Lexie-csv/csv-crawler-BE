'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/cn';
import {
    LayoutDashboard,
    Globe,
    PlayCircle,
    FileText,
    Database,
    Mail,
    Activity,
} from 'lucide-react';

const navItems = [
    { href: '/', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/sources', label: 'Sources', icon: Globe },
    { href: '/crawl', label: 'Crawl Jobs', icon: PlayCircle },
    { href: '/documents', label: 'Documents', icon: FileText },
    { href: '/datapoints', label: 'Datapoints', icon: Database },
    { href: '/digests', label: 'Digests', icon: Mail },
];

export function Sidebar() {
    const pathname = usePathname();

    return (
        <aside className="w-64 border-r border-border bg-white min-h-screen flex flex-col">
            <div className="p-6">
                <Link href="/" className="flex items-center gap-2">
                    <div className="text-2xl">📋</div>
                    <div>
                        <div className="text-xl font-bold text-copy">CSV</div>
                        <div className="text-xs text-caption">Policy Crawler</div>
                    </div>
                </Link>
            </div>

            <nav className="flex-1 px-3">
                {navItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = pathname === item.href;

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                                'flex items-center gap-3 px-3 py-2 rounded-md mb-1 text-sm font-medium transition-colors',
                                isActive
                                    ? 'bg-bg-contrast text-copy'
                                    : 'text-secondary hover:bg-bg-page hover:text-copy'
                            )}
                        >
                            <Icon className="w-4 h-4" />
                            {item.label}
                        </Link>
                    );
                })}
            </nav>

            <div className="p-4 border-t border-border">
                <a
                    href="http://localhost:3001/health"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-secondary hover:text-copy transition-colors"
                >
                    <Activity className="w-4 h-4" />
                    <span>API Status</span>
                    <div className="ml-auto w-2 h-2 bg-green-500 rounded-full"></div>
                </a>
            </div>
        </aside>
    );
}
