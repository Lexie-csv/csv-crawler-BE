'use client';

import { useEffect } from 'react';
import { logger } from '@/lib/logger';
import Link from 'next/link';

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        // Log error to console in development
        logger.error({ msg: 'App error', error: error.message, stack: error.stack, digest: error.digest });
    }, [error]);

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#FAFAFA] p-4">
            <div className="max-w-md w-full bg-white border border-[#DCDCDC] rounded-lg p-8 text-center">
                <div className="mb-6">
                    <div className="text-6xl mb-4">⚠️</div>
                    <h1 className="text-2xl font-semibold text-[#202020] mb-2">
                        Something went wrong
                    </h1>
                    <p className="text-[#727272]">
                        We encountered an unexpected error. Please try again.
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
