import type { SelectHTMLAttributes } from "react";
import { cn } from "../../utils/cn";

export function Select({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        "h-10 w-full rounded-md border border-white/10 bg-black/30 px-3 text-sm text-stone-100 outline-none transition focus:border-amber-300/50 focus:ring-2 focus:ring-amber-300/20",
        className,
      )}
      {...props}
    >
      {children}
    </select>
  );
}
