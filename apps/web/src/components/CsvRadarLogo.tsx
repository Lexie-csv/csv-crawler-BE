export default function CsvRadarLogo({ className = 'h-8 w-8' }: { className?: string }) {
    return (
        <svg viewBox="0 0 100 100" className={className} xmlns="http://www.w3.org/2000/svg">
            <defs>
                <linearGradient id="radarGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#2D5F3F" />
                    <stop offset="100%" stopColor="#4A9ECC" />
                </linearGradient>
            </defs>

            {/* Radar circles */}
            <circle cx="50" cy="50" r="45" fill="none" stroke="url(#radarGradient)" strokeWidth="2" opacity="0.3" />
            <circle cx="50" cy="50" r="32" fill="none" stroke="url(#radarGradient)" strokeWidth="2" opacity="0.5" />
            <circle cx="50" cy="50" r="19" fill="none" stroke="url(#radarGradient)" strokeWidth="2" opacity="0.7" />

            {/* Center point */}
            <circle cx="50" cy="50" r="6" fill="#2D5F3F" />

            {/* Radar sweep line */}
            <line x1="50" y1="50" x2="50" y2="8" stroke="#4A9ECC" strokeWidth="3" strokeLinecap="round">
                <animateTransform
                    attributeName="transform"
                    attributeType="XML"
                    type="rotate"
                    from="0 50 50"
                    to="360 50 50"
                    dur="3s"
                    repeatCount="indefinite"
                />
            </line>

            {/* Data blips */}
            <circle cx="65" cy="30" r="3" fill="#2D5F3F" opacity="0.8" />
            <circle cx="35" cy="40" r="3" fill="#4A9ECC" opacity="0.8" />
            <circle cx="60" cy="60" r="3" fill="#2D5F3F" opacity="0.8" />
        </svg>
    );
}
