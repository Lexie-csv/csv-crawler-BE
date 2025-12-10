import Link from 'next/link';
import CsvRadarLogo from '@/components/CsvRadarLogo';

export default function Page(): JSX.Element {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-navy via-navy/95 to-green">
            <div className="text-center space-y-8 px-6">
                <div className="flex justify-center">
                    <CsvRadarLogo className="h-32 w-32" />
                </div>

                <div className="space-y-4">
                    <h1 className="text-6xl font-bold text-white tracking-tight">CSV RADAR</h1>
                    <p className="text-xl text-white/80 max-w-2xl mx-auto">
                        Southeast Asia Policy & Data Intelligence Platform
                    </p>
                    <p className="text-sm text-white/60 max-w-xl mx-auto">
                        Automated monitoring and analysis of regulatory updates, policy changes, and key datapoints across
                        Philippine and Southeast Asian markets.
                    </p>
                </div>

                <Link
                    href="/signals"
                    className="inline-block px-8 py-3 bg-green text-white font-semibold rounded-lg hover:bg-green/90 transition-colors"
                >
                    Launch Dashboard
                </Link>
            </div>
        </div>
    );
}
