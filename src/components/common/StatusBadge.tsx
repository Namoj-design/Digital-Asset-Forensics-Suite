import { cn } from "@/lib/utils";

type Status = "open" | "investigating" | "closed";
type Priority = "low" | "medium" | "high" | "critical";

const statusStyles: Record<Status, string> = {
  open: "bg-primary/10 text-primary border border-primary/20",
  investigating: "bg-hud-amber/10 text-hud-amber border border-hud-amber/20",
  closed: "bg-status-closed/10 text-status-closed border border-status-closed/20",
};

const priorityStyles: Record<Priority, string> = {
  low: "risk-none",
  medium: "risk-medium",
  high: "risk-high",
  critical: "risk-critical",
};

export const StatusBadge = ({ status }: { status: Status }) => (
  <span className={cn("risk-badge", statusStyles[status])}>{status === "investigating" ? "Active" : status}</span>
);

export const PriorityBadge = ({ priority }: { priority: Priority }) => (
  <span className={cn("risk-badge", priorityStyles[priority])}>{priority}</span>
);
