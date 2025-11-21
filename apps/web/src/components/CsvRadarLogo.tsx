export function CsvRadarLogo({ className = 'w-10 h-10' }: { className?: string }) {
    return (
        <svg
            viewBox="0 0 100 100"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={className}
        >
            {/* Outer ring (green, dashed orbital path) */}
            <circle
                cx="50"
                cy="50"
                r="45"
                stroke="#A2D45E"
                strokeWidth="3.5"
                strokeDasharray="12 8"
                fill="none"
                opacity="0.85"
            />
            
            {/* Middle ring (navy, solid) */}
            <circle
                cx="50"
                cy="50"
                r="32"
                stroke="#003366"
                strokeWidth="6"
                fill="none"
            />
            
            {/* Inner ring (green, solid) */}
            <circle
                cx="50"
                cy="50"
                r="20"
                stroke="#A2D45E"
                strokeWidth="4"
                fill="none"
            />
            
            {/* Center core (navy filled) */}
            <circle cx="50" cy="50" r="10" fill="#003366" />
            
            {/* Radar sweeping beam (wide to narrow) */}
            <path
                d="M 50 50 L 88 18"
                stroke="#003366"
                strokeWidth="6"
                strokeLinecap="round"
                opacity="0.9"
            />
            
            {/* Beam highlight accent */}
            <path
                d="M 50 50 L 88 18"
                stroke="#A2D45E"
                strokeWidth="3"
                strokeLinecap="round"
                opacity="0.6"
            />
        </svg>
    );
}
