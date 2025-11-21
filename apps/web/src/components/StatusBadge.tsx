/**
 * StatusBadge Component
 * Displays job/status with appropriate styling
 */

interface StatusBadgeProps {
    status: 'pending' | 'running' | 'done' | 'failed';
    className?: string;
}

const statusStyles = {
    pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    running: 'bg-blue-100 text-blue-800 border-blue-200',
    done: 'bg-green-100 text-green-800 border-green-200',
    failed: 'bg-red-100 text-red-800 border-red-200',
};

export function StatusBadge({ status, className = '' }: StatusBadgeProps): JSX.Element {
    return (
        <span
            className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium border ${statusStyles[status]} ${className}`}
        >
            {status}
        </span>
    );
}
