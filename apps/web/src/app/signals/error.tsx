'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { logger } from '@/lib/logger';

export default function SignalsError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        logger.error({ msg: 'Signals page error', error: error.message, stack: error.stack, digest: error.digest });
    }, [error]);

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#FAFAFA] p-4">
            <div className="max-w-md w-full bg-white border border-[#DCDCDC] rounded-lg p-8 text-center">
                <div className="mb-6">
                    <div className="text-6xl mb-4">📊</div>
                    <h1 className="text-2xl font-semibold text-[#202020] mb-2">
                        Error loading signals
                    </h1>
                    <p className="text-[#727272]">
                        We couldn't load the signals dashboard. Please try again.
                    </p>
                </div>

                {process.env.NODE_ENV === 'development' && (
                    <div className="mb-6 p-4 bg-[#FAFAFA] rounded text-left">
                        <p className="text-xs text-[#727272] font-mono break-all">
                            {error.message}
                        </p>
                    </div>
                )}

                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <button
                        onClick={reset}
                        className="px-4 py-2 bg-[#202020] text-white rounded-md hover:bg-[#404040] transition-colors"
                    >
                        Try again
                    </button>
                    <Link
                        href="/"
                        className="px-4 py-2 bg-white border border-[#DCDCDC] text-[#202020] rounded-md hover:bg-[#FAFAFA] transition-colors inline-block"
                    >
                        Go home
                    </Link>
                </div>
            </div>
        </div>
    );
}
