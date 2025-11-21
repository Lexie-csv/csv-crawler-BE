import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/cn';

const badgeVariants = cva(
    'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors',
    {
        variants: {
            variant: {
                default: 'bg-gray-100 text-gray-800',
                secondary: 'bg-gray-100 text-gray-800',
                pending: 'bg-amber-100 text-amber-800',
                running: 'bg-sky-100 text-sky-800',
                completed: 'bg-green-100 text-green-800',
                failed: 'bg-red-100 text-red-800',
                outline: 'text-textMain border border-border',
            },
        },
        defaultVariants: {
            variant: 'default',
        },
    }
);

export interface BadgeProps
    extends React.HTMLAttributes<HTMLDivElement>,
        VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
    return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
