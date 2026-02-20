import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

/**
 * Grand Maritime Badge Component
 *
 * Badge variants for the ServicePro maritime theme:
 * - default: Navy blue background
 * - secondary: Cream background
 * - destructive: Coral/red background
 * - outline: Border only
 * - gold: Gold accent (for achievements)
 * - silver: Silver accent (for second place)
 * - bronze: Bronze/copper accent (for third place)
 * - seafoam: Success/completed state
 * - sunset: Warning/pending state
 */
const badgeVariants = cva(
    "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
    {
        variants: {
            variant: {
                default: "border-transparent bg-navy-700 text-white shadow hover:bg-navy-600",
                secondary: "border-transparent bg-cream-100 text-navy-900 hover:bg-cream-200",
                destructive: "border-transparent bg-coral-500 text-white shadow hover:bg-coral-600",
                outline: "text-foreground border-border",
                // Grand Maritime Achievement Badges
                gold: "border-transparent bg-gradient-to-r from-gold-400 to-gold-600 text-white shadow-md hover:from-gold-500 hover:to-gold-700",
                silver: "border-transparent bg-gradient-to-r from-gray-300 to-gray-400 text-white shadow-md hover:from-gray-400 hover:to-gray-500",
                bronze: "border-transparent bg-gradient-to-r from-copper-400 to-copper-600 text-white shadow-md hover:from-copper-500 hover:to-copper-700",
                // Maritime Status Colors
                seafoam: "border-transparent bg-seafoam-500 text-white shadow hover:bg-seafoam-600",
                sunset: "border-transparent bg-sunset-500 text-white shadow hover:bg-sunset-600",
                skyblue: "border-transparent bg-skyblue-500 text-white shadow hover:bg-skyblue-600",
            },
        },
        defaultVariants: {
            variant: "default",
        },
    }
)

export interface BadgeProps
    extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> { }

function Badge({ className, variant, ...props }: BadgeProps) {
    return (
        <div className={cn(badgeVariants({ variant }), className)} {...props} />
    )
}

export { Badge, badgeVariants }
