import { cn } from "@/lib/utils";

type RiskLevel = "critical" | "high" | "medium" | "low" | "none";

const riskConfig: Record<RiskLevel, { label: string; className: string }> = {
  critical: { label: "Critical", className: "risk-critical" },
  high: { label: "High", className: "risk-high" },
  medium: { label: "Medium", className: "risk-medium" },
  low: { label: "Low", className: "risk-low" },
  none: { label: "None", className: "risk-none" },
};

export const getRiskLevel = (score: number): RiskLevel => {
  if (score >= 80) return "critical";
  if (score >= 60) return "high";
  if (score >= 40) return "medium";
  if (score >= 20) return "low";
  return "none";
};

export const RiskBadge = ({ score, showScore = true }: { score: number; showScore?: boolean }) => {
  const level = getRiskLevel(score);
  const config = riskConfig[level];

  return (
    <span className={cn("risk-badge", config.className)}>
      {showScore && <span className="mr-1 font-mono">{score}</span>}
      {config.label}
    </span>
  );
};

export const RiskFlagBadge = ({ flag }: { flag: string }) => {
  const config = riskConfig[flag as RiskLevel] || riskConfig.none;
  return (
    <span className={cn("risk-badge", config.className)}>
      {config.label}
    </span>
  );
};
