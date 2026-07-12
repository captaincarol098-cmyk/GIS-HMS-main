"use client";

import { LucideIcon } from "lucide-react";
import { UI_CLASSES } from "@/lib/theme";

interface StatValueProps {
  label: string;
  value: number | string;
  icon?: LucideIcon;
  trend?: {
    value: number;
    direction: "up" | "down";
    label?: string;
  };
  onClick?: () => void;
  href?: string;
  className?: string;
}

/**
 * Reusable Stat Value Card Component
 * Used in dashboard cards to display key metrics
 */
export function StatValue({
  label,
  value,
  icon: Icon,
  trend,
  onClick,
  href,
  className = "",
}: StatValueProps) {
  const content = (
    <div className={`${UI_CLASSES.card} ${className}`}>
      {Icon && <Icon className="mb-3 h-5 w-5 text-brand" />}
      <p className="text-sm text-muted">{label}</p>
      <div className="flex items-baseline justify-between gap-2 mt-2">
        <p className="text-2xl font-semibold">{value}</p>
        {trend && (
          <div
            className={`text-xs font-semibold px-2 py-1 rounded ${
              trend.direction === "up"
                ? "bg-green-100 text-green-700"
                : "bg-red-100 text-red-700"
            }`}
          >
            {trend.direction === "up" ? "↑" : "↓"} {trend.value}
            {trend.label && <span className="ml-1">{trend.label}</span>}
          </div>
        )}
      </div>
    </div>
  );

  if (href) {
    return (
      <a href={href} className="block">
        {content}
      </a>
    );
  }

  if (onClick) {
    return (
      <button onClick={onClick} className="block cursor-pointer hover:opacity-80 transition-opacity">
        {content}
      </button>
    );
  }

  return content;
}

interface StatGridProps {
  stats: StatValueProps[];
  columns?: number;
  className?: string;
}

/**
 * Grid Layout for Multiple Stat Values
 */
export function StatGrid({ stats, columns = 5, className = "" }: StatGridProps) {
  const gridClass = {
    2: "grid-cols-1 md:grid-cols-2",
    3: "grid-cols-1 md:grid-cols-2 lg:grid-cols-3",
    4: "grid-cols-2 md:grid-cols-4",
    5: "grid-cols-2 md:grid-cols-3 lg:grid-cols-5",
  }[columns] || `grid-cols-${columns}`;

  return (
    <div className={`grid gap-4 ${gridClass} ${className}`}>
      {stats.map((stat, index) => (
        <StatValue key={index} {...stat} />
      ))}
    </div>
  );
}
