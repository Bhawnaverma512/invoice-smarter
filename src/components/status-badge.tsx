import { cn } from "@/lib/utils";
import { STATUS_BADGE_CLASS, STATUS_LABELS, effectiveStatus, type EffectiveStatus } from "@/lib/format";
import { Badge } from "@/components/ui/badge";

export function StatusBadge({
  invoice,
  status,
  className,
}: {
  invoice?: { status: string; due_date: string };
  status?: EffectiveStatus;
  className?: string;
}) {
  const s = status ?? (invoice ? effectiveStatus(invoice) : "draft");
  return (
    <Badge variant="outline" className={cn(STATUS_BADGE_CLASS[s], className)}>
      {STATUS_LABELS[s]}
    </Badge>
  );
}
