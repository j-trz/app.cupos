import * as React from "react";
import { cva } from "class-variance-authority";
import { cn } from "../../lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-md border px-2.5 py-1 text-xs font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-zinc-900 text-zinc-50 hover:bg-zinc-900/80 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-50/80",
        secondary:
          "border-transparent bg-zinc-100 text-zinc-900 hover:bg-zinc-100/80 dark:bg-zinc-800 dark:text-zinc-50 dark:hover:bg-zinc-800/80",
        destructive:
          "border-transparent bg-red-500 text-zinc-50 hover:bg-red-500/80 dark:bg-red-900 dark:text-zinc-50 dark:hover:bg-red-900/80",
        outline:
          "text-zinc-950 dark:text-zinc-50",
        success:
          "border-transparent bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
        warning:
          "border-transparent bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
        error:
          "border-transparent bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400",
        info:
          "border-transparent bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
        // Variantes pastel para filtros
        product:
          "border-transparent bg-sky-50 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400",
        request:
          "border-transparent bg-violet-50 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400",
        confirmation:
          "border-transparent bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
        availability:
          "border-transparent bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
        reservation:
          "border-transparent bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400",
        agency:
          "border-transparent bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400",
        user:
          "border-transparent bg-cyan-50 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400",
        setting:
          "border-transparent bg-orange-50 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
        report:
          "border-transparent bg-teal-50 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400",
        pending:
          "border-transparent bg-yellow-50 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
        active:
          "border-transparent bg-lime-50 text-lime-700 dark:bg-lime-900/30 dark:text-lime-400",
        inactive:
          "border-transparent bg-gray-50 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400",
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