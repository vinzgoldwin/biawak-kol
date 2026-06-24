"use client"

import { NumberField as NumberFieldPrimitive } from "@base-ui/react/number-field"
import { MinusIcon, PlusIcon } from "lucide-react"

import { cn } from "@/lib/utils"

const NumberField = NumberFieldPrimitive.Root

function NumberFieldGroup({ className, ...props }: NumberFieldPrimitive.Group.Props) {
  return (
    <NumberFieldPrimitive.Group
      data-slot="number-field-group"
      className={cn("flex h-12 w-full items-center rounded-3xl border bg-input/50 px-2 transition focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/30", className)}
      {...props}
    />
  )
}

function NumberFieldInput({ className, ...props }: NumberFieldPrimitive.Input.Props) {
  return (
    <NumberFieldPrimitive.Input
      data-slot="number-field-input"
      className={cn("h-full min-w-0 flex-1 bg-transparent px-3 text-center text-lg font-black outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50", className)}
      {...props}
    />
  )
}

function NumberFieldDecrement({ className, ...props }: NumberFieldPrimitive.Decrement.Props) {
  return (
    <NumberFieldPrimitive.Decrement
      data-slot="number-field-decrement"
      className={cn("grid size-8 place-items-center rounded-full text-muted-foreground transition hover:bg-background hover:text-foreground disabled:pointer-events-none disabled:opacity-40", className)}
      {...props}
    >
      <MinusIcon className="size-4" />
    </NumberFieldPrimitive.Decrement>
  )
}

function NumberFieldIncrement({ className, ...props }: NumberFieldPrimitive.Increment.Props) {
  return (
    <NumberFieldPrimitive.Increment
      data-slot="number-field-increment"
      className={cn("grid size-8 place-items-center rounded-full text-muted-foreground transition hover:bg-background hover:text-foreground disabled:pointer-events-none disabled:opacity-40", className)}
      {...props}
    >
      <PlusIcon className="size-4" />
    </NumberFieldPrimitive.Increment>
  )
}

export {
  NumberField,
  NumberFieldDecrement,
  NumberFieldGroup,
  NumberFieldIncrement,
  NumberFieldInput,
}
