import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/cn';

const buttonVariants = cva(
    'inline-flex items-center justify-center whitespace-nowrap rounded-lg font-medium transition-all duration-150 ease-in-out focus-visible:outline-none focus-visible:ring-2 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98] min-h-[44px]',
    {
        variants: {
            variant: {
                default: 'text-white shadow-sm hover:opacity-90 hover:shadow-md focus-visible:ring-offset-2',
                destructive: 'bg-red-600 text-white hover:bg-red-700 shadow-sm hover:shadow-md',
                outline: 'border border-gray-200 text-gray-900 bg-white hover:bg-gray-50 shadow-sm hover:shadow',
                secondary: 'bg-gray-100 text-gray-900 hover:bg-gray-200 shadow-sm hover:shadow',
                ghost: 'hover:bg-gray-100 text-gray-900',
                link: 'text-gray-900 underline-offset-4 hover:underline',
            },
            size: {
                default: 'px-6 py-2 text-base font-semibold',
                sm: 'px-4 py-2 text-sm',
                lg: 'px-8 py-3 text-lg',
                icon: 'h-11 w-11',
            },
        },
        defaultVariants: {
            variant: 'default',
            size: 'default',
        },
    }
);

export interface ButtonProps
    extends React.ButtonHTMLAttributes<HTMLButtonElement>,
        VariantProps<typeof buttonVariants> {
    asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant, size, asChild = false, style, ...props }, ref) => {
        const Comp = asChild ? Slot : 'button';
        // Apply CSV Radar green for default variant
        const defaultStyle = variant === 'default' || variant === undefined
            ? { backgroundColor: '#A2D45E', ...style }
            : style;
        
        return (
            <Comp 
                className={cn(buttonVariants({ variant, size, className }))} 
                style={defaultStyle}
                ref={ref} 
                {...props} 
            />
        );
    }
);
Button.displayName = 'Button';

export { Button, buttonVariants };
