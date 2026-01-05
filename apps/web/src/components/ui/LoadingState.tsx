import React from 'react';

export interface LoadingStateProps {
    variant?: 'skeleton' | 'spinner' | 'pulse';
    message?: string;
    className?: string;
}

function SkeletonLoader({ className = '' }: { className?: string }) {
    return (
        <div className={`space-y-4 ${className}`}>
            <div className="h-4 bg-gray-200 rounded w-3/4 animate-pulse" />
            <div className="h-4 bg-gray-200 rounded w-1/2 animate-pulse" />
            <div className="h-4 bg-gray-200 rounded w-5/6 animate-pulse" />
        </div>
    );
}

function Spinner({ className = '' }: { className?: string }) {
    return (
        <div className={`flex items-center justify-center ${className}`}>
            <div className="w-8 h-8 border-4 border-gray-200 border-t-[#202020] rounded-full animate-spin" />
        </div>
    );
}

function PulseLoader({ className = '' }: { className?: string }) {
    return (
        <div className={`flex items-center justify-center gap-2 ${className}`}>
            <div className="w-3 h-3 bg-[#202020] rounded-full animate-pulse" style={{ animationDelay: '0ms' }} />
            <div className="w-3 h-3 bg-[#202020] rounded-full animate-pulse" style={{ animationDelay: '150ms' }} />
            <div className="w-3 h-3 bg-[#202020] rounded-full animate-pulse" style={{ animationDelay: '300ms' }} />
        </div>
    );
}

export function LoadingState({
    variant = 'spinner',
    message,
    className = '',
}: LoadingStateProps) {
    return (
        <div className={`flex flex-col items-center justify-center py-12 ${className}`}>
            {variant === 'skeleton' && <SkeletonLoader />}
            {variant === 'spinner' && <Spinner />}
            {variant === 'pulse' && <PulseLoader />}
            {message && (
                <p className="mt-4 text-sm text-[#727272]">{message}</p>
            )}
        </div>
    );
}
