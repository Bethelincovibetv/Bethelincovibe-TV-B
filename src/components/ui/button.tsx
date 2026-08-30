import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 cursor-pointer active:scale-[0.98] [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90 shadow-xs hover:shadow-sm",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-xs",
        outline: "border border-input/90 bg-background/80 text-foreground hover:bg-accent hover:text-accent-foreground shadow-2xs font-semibold backdrop-blur-xs",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80 font-semibold shadow-2xs",
        ghost: "text-foreground hover:bg-accent hover:text-accent-foreground font-medium",
        link: "text-primary underline-offset-4 hover:underline",
        white: "bg-white text-slate-950 hover:bg-slate-100 border border-slate-200/80 shadow-xs font-bold",
        context: "bg-white text-slate-950 hover:bg-slate-50 border border-slate-300 shadow-2xs font-bold dark:bg-slate-900 dark:text-slate-50 dark:border-slate-700",
        glass: "bg-card/75 text-foreground hover:bg-card/95 border border-border/80 shadow-xs backdrop-blur-md font-semibold",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-lg px-3 text-xs",
        lg: "h-11 rounded-xl px-8 text-base",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
