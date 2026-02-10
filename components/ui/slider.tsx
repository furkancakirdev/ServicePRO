"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

interface SliderProps extends React.HTMLAttributes<HTMLDivElement> {
    value?: number[]
    onValueChange?: (value: number[]) => void
    min?: number
    max?: number
    step?: number
    disabled?: boolean
}

const Slider = React.forwardRef<HTMLDivElement, SliderProps>(
    ({ className, value = [0], onValueChange, min = 0, max = 100, step = 1, disabled, ...props }, ref) => {
        const [internalValue, setInternalValue] = React.useState(value)
        const currentValue = value ?? internalValue
        const percentage = ((currentValue[0] - min) / (max - min)) * 100

        const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
            const newValue = [parseFloat(e.target.value)]
            setInternalValue(newValue)
            onValueChange?.(newValue)
        }

        return (
            <div
                ref={ref}
                className={cn("relative flex w-full touch-none select-none items-center", className)}
                {...props}
            >
                <input
                    type="range"
                    min={min}
                    max={max}
                    step={step}
                    value={currentValue[0]}
                    onChange={handleSliderChange}
                    disabled={disabled}
                    className={cn(
                        "w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer",
                        "accent-blue-600",
                        disabled && "opacity-50 cursor-not-allowed"
                    )}
                />
                <span className="absolute -top-6 text-xs text-gray-600" style={{ left: `calc(${percentage}% - 10px)` }}>
                    {currentValue[0]}
                </span>
            </div>
        )
    }
)
Slider.displayName = "Slider"

export { Slider }
