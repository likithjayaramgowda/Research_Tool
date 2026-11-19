import { cn } from "@/lib/utils";

interface EmptyStateProps {
  title: string;
  description?: string;
  /** An optional button or link. */
  action?: React.ReactNode;
  /** Errors use the alert colour; nothing else does. */
  tone?: "neutral" | "error";
  className?: string;
}

/**
 * For "nothing here yet" and "something went wrong". Left-aligned, no icon-in-a-circle.
 * All wording is a TODO(copy) placeholder for the owner to rewrite.
 */
export function EmptyState({
  title,
  description,
  action,
  tone = "neutral",
  className,
}: EmptyStateProps) {
  return (
    <div className={cn("flex max-w-prose flex-col items-start gap-2", className)}>
      <p className={cn("font-heading text-base font-semibold", tone === "error" && "text-alert")}>
        {title}
      </p>
      {description && <p className="text-graphite text-sm">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
