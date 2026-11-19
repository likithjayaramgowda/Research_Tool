import * as React from "react";
import { Input as InputPrimitive } from "@base-ui/react/input";
import { cn } from "cn";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      className={cn(
        "border-input bg-sheet file:bg-sheet file:text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring focus-visible:ring-offset-background disabled:bg-input/50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 h-10 w-full min-w-0 rounded-md border px-2.5 py-1 text-base transition-colors outline-none file:inline-flex file:h-6 file:border-0 file:text-sm file:font-semibold focus-visible:ring-2 focus-visible:ring-offset-1 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:ring-3 md:text-sm",
        className,
      )}
      {...props}
    />
  );
}

export { Input };
