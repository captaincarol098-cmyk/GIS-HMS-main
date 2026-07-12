"use client";

import { RISK_COLORS, UI_CLASSES, type RiskLevel } from "@/lib/theme";

interface RiskBadgeProps {
  level: RiskLevel;
  showIcon?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}

/**
 * Reusable Risk Level Badge Component
 * Displays consistent risk indicators across the app
 */
export function RiskBadge({
  level,
  showIcon = true,
  size = "md",
  className = "",
}: RiskBadgeProps) {
  const colors = RISK_COLORS[level];
  
  const sizeClasses = {
    sm: "px-2 py-1 text-xs",
    md: "px-3 py-1.5 text-sm",
    lg: "px-4 py-2 text-base",
  };

  const labelMap: Record<RiskLevel, string> = {
    critical: "Critical",
    high: "High",
    medium: "Medium",
    low: "Low",
    normal: "Normal",
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-medium transition-colors ${sizeClasses[size]} ${className}`}
      style={{
        backgroundColor: colors.bg,
        color: colors.text,
        border: `1px solid ${colors.border}`,
      }}
    >
      {showIcon && <span>{colors.icon}</span>}
      <span>{labelMap[level]}</span>
    </span>
  );
}

interface RiskLevelProps {
  value: number;
  isPercentage?: boolean;
  label?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

/**
 * Risk Level Display from Numeric Value
 * Automatically determines risk level from prevalence rate
 */
export function RiskLevelDisplay({
  value,
  isPercentage = true,
  label,
  size = "md",
  className = "",
}: RiskLevelProps) {
  const riskLevel: RiskLevel =
    value >= 30 ? "critical" :
    value >= 15 ? "high" :
    value >= 5 ? "medium" :
    "low";

  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      {label && <span className="text-xs text-slate-600">{label}</span>}
      <div className="flex items-center gap-2">
        <RiskBadge level={riskLevel} size={size} />
        <span className="text-sm font-semibold text-slate-700">
          {value.toFixed(1)}{isPercentage ? "%" : ""}
        </span>
      </div>
    </div>
  );
}
