import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "../../utils/cn";

export function Card({ className, children, ...props }: HTMLAttributes<HTMLDivElement> & { children: ReactNode }) {
  return (
    <section
      className={cn(
        "rounded-lg border border-white/10 bg-zinc-950/72 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] backdrop-blur",
        className,
      )}
      {...props}
    >
      {children}
    </section>
  );
}

export function CardHeader({ className, children, ...props }: HTMLAttributes<HTMLDivElement> & { children: ReactNode }) {
  return (
    <div className={cn("border-b border-white/8 px-4 py-3", className)} {...props}>
      {children}
    </div>
  );
}

export function CardTitle({ className, children, ...props }: HTMLAttributes<HTMLHeadingElement> & { children: ReactNode }) {
  return (
    <h2 className={cn("font-display text-base font-semibold tracking-normal text-stone-100", className)} {...props}>
      {children}
    </h2>
  );
}

export function CardContent({ className, children, ...props }: HTMLAttributes<HTMLDivElement> & { children: ReactNode }) {
  return (
    <div className={cn("p-4", className)} {...props}>
      {children}
    </div>
  );
}
