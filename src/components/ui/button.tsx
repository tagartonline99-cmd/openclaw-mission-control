import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "../../utils/cn";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "outline";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: "sm" | "md" | "lg" | "icon";
  children: ReactNode;
}

const variants: Record<ButtonVariant, string> = {
  primary:
    "border-amber-300/50 bg-amber-400/15 text-amber-100 shadow-glow hover:bg-amber-300/25 hover:text-white",
  secondary:
    "border-teal-300/35 bg-teal-400/10 text-teal-100 shadow-rune-sm hover:bg-teal-300/20 hover:text-white",
  ghost: "border-transparent bg-transparent text-slate-300 hover:bg-white/8 hover:text-white",
  danger: "border-red-300/45 bg-red-500/12 text-red-100 shadow-ember-sm hover:bg-red-500/22",
  outline: "border-white/12 bg-black/20 text-slate-200 hover:border-amber-200/40 hover:bg-white/8",
};

const sizes = {
  sm: "h-8 px-3 text-xs",
  md: "h-10 px-4 text-sm",
  lg: "h-12 px-5 text-base",
  icon: "h-10 w-10 p-0",
};

export function Button({ className, variant = "primary", size = "md", children, ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-md border font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 disabled:cursor-not-allowed disabled:opacity-50",
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
