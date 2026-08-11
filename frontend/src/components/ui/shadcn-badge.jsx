import * as React from "react";
import { cva } from "class-variance-authority";
import { cn } from "../../lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-md border px-2.5 py-1 text-xs font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-zinc-900 text-zinc-50 hover:bg-zinc-900/80",
        secondary:
          "border-transparent bg-zinc-100 text-zinc-900 hover:bg-zinc-100/80",
        destructive:
          "border-transparent bg-red-500 text-zinc-50 hover:bg-red-500/80",
        outline:
          "text-zinc-950",
        success:
          "border-transparent bg-emerald-50 text-emerald-700",
        warning:
          "border-transparent bg-amber-50 text-amber-700",
        error:
          "border-transparent bg-red-50 text-red-700",
        info:
          "border-transparent bg-blue-50 text-blue-700",
        // Variantes pastel para filtros
        product:
          "border-transparent bg-sky-50 text-sky-700",
        request:
          "border-transparent bg-violet-50 text-violet-700",
        confirmation:
          "border-transparent bg-emerald-50 text-emerald-700",
        availability:
          "border-transparent bg-amber-50 text-amber-700",
        reservation:
          "border-transparent bg-rose-50 text-rose-700",
        agency:
          "border-transparent bg-indigo-50 text-indigo-700",
        user:
          "border-transparent bg-cyan-50 text-cyan-700",
        setting:
          "border-transparent bg-orange-50 text-orange-700",
        report:
          "border-transparent bg-teal-50 text-teal-700",
        pending:
          "border-transparent bg-yellow-50 text-yellow-700",
        active:
          "border-transparent bg-lime-50 text-lime-700",
        inactive:
          "border-transparent bg-gray-50 text-gray-700",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

function Badge({ className, variant, ...props }) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };