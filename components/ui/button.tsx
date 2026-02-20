import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

/**
 * Grand Maritime Button Component
 *
 * Classic maritime button hierarchy:
 * - Primary: Navy blue gradient with shadow
 * - Secondary: Cream background with navy text
 * - Destructive: Coral/red gradient
 * - Outline: Border only with navy text
 * - Ghost: Transparent background, navy text on hover
 * - Link: Navy text, underline
 * - Gold: Special accent button for achievements
 */
const buttonVariants = cva(
    "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
    {
        variants: {
            variant: {
                // Primary: Navy blue gradient
                default: "bg-gradient-to-r from-navy-700 to-navy-900 text-white shadow-md hover:shadow-lg hover:from-navy-600 hover:to-navy-800 active:translate-y-px",
                // Destructive: Coral gradient
                destructive: "bg-gradient-to-r from-coral-500 to-coral-600 text-white shadow-md hover:shadow-lg hover:from-coral-600 hover:to-coral-700 active:translate-y-px",
                // Outline: Navy border
                outline: "border-2 border-navy-700 text-navy-700 bg-transparent hover:bg-navy-50 active:bg-navy-100",
                // Secondary: Cream background
                secondary: "bg-cream-100 text-navy-900 border border-cream-200 hover:bg-cream-200 active:bg-cream-300",
                // Ghost: Transparent with hover
                ghost: "text-navy-700 hover:bg-cream-100 active:bg-cream-200",
                // Link: Text only with underline
                link: "text-navy-700 underline-offset-4 hover:underline decoration-gold-500 decoration-2",
                // Gold: Special accent
                gold: "bg-gradient-to-r from-gold-500 to-gold-600 text-white shadow-md hover:shadow-lg hover:from-gold-400 hover:to-gold-500 active:translate-y-px",
            },
            size: {
                default: "h-10 px-5 py-2",
                sm: "h-8 px-3 text-xs",
                lg: "h-12 px-8 text-base",
                icon: "h-10 w-10",
            },
        },
        defaultVariants: {
            variant: "default",
            size: "default",
        },
    }
)

export interface ButtonProps
    extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
    asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant, size, asChild = false, ...props }, ref) => {
        const Comp = asChild ? Slot : "button"
        return (
            <Comp
                className={cn(buttonVariants({ variant, size, className }))}
                ref={ref}
                {...props}
            />
        )
    }
)
Button.displayName = "Button"

export { Button, buttonVariants }
