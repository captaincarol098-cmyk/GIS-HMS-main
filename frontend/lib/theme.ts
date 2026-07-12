/**
 * Centralized Theme Configuration
 * 
 * Single source of truth for colors, risk levels, and UI styling.
 * Used across dashboards, maps, reports, and components.
 */

export type RiskLevel = "critical" | "high" | "medium" | "low" | "normal";
export type MalnutritionStatus = 
  | "severe_acute_malnutrition" 
  | "moderate_acute_malnutrition" 
  | "underweight" 
  | "stunted" 
  | "normal";

/**
 * Risk Level Color Palette
 * Consistent across maps, dashboards, badges, and indicators
 */
export const RISK_COLORS: Record<RiskLevel, {
  bg: string;
  text: string;
  border: string;
  icon: string;
  hex: string;
}> = {
  critical: {
    bg: "#fee2e2",      // Light red
    text: "#991b1b",    // Dark red
    border: "#dc2626",  // Red
    icon: "🔴",
    hex: "#dc2626",
  },
  high: {
    bg: "#ffedd5",      // Light orange
    text: "#9a3412",    // Dark orange
    border: "#f97316",  // Orange
    icon: "🟠",
    hex: "#f97316",
  },
  medium: {
    bg: "#fef3c7",      // Light yellow
    text: "#92400e",    // Dark yellow
    border: "#eab308",  // Yellow
    icon: "🟡",
    hex: "#eab308",
  },
  low: {
    bg: "#dcfce7",      // Light green
    text: "#166534",    // Dark green
    border: "#22c55e",  // Green
    icon: "🟢",
    hex: "#22c55e",
  },
  normal: {
    bg: "#f0fdf4",      // Very light green
    text: "#15803d",    // Green
    border: "#22c55e",  // Green
    icon: "✅",
    hex: "#22c55e",
  },
};

/**
 * Malnutrition Status Colors
 * Used in child markers, status indicators, and reports
 */
export const STATUS_COLORS: Record<MalnutritionStatus, {
  bg: string;
  text: string;
  hex: string;
  icon: string;
}> = {
  severe_acute_malnutrition: {
    bg: "#fee2e2",
    text: "#991b1b",
    hex: "#dc2626",
    icon: "🔴",
  },
  moderate_acute_malnutrition: {
    bg: "#ffedd5",
    text: "#9a3412",
    hex: "#f97316",
    icon: "🟠",
  },
  underweight: {
    bg: "#fef3c7",
    text: "#92400e",
    hex: "#eab308",
    icon: "⚠️",
  },
  stunted: {
    bg: "#fef3c7",
    text: "#92400e",
    hex: "#eab308",
    icon: "⚠️",
  },
  normal: {
    bg: "#dcfce7",
    text: "#166534",
    hex: "#22c55e",
    icon: "✅",
  },
};

/**
 * Child Z-Score Based Classification Colors
 * Used on heatmap and dashboard for individual child nutritional status
 * Based on WHO Growth Standards (0-71 months target age)
 */
export const Z_SCORE_COLORS = {
  // WAZ (Weight-for-Age)
  waz: {
    severely_underweight: {
      label: "Severely Underweight",
      hex: "#8B0000",  // Crimson Red
      bg: "#ffe5e5",
      text: "#8B0000",
      icon: "🔴",
      zscore: "Z < -3.00"
    },
    underweight: {
      label: "Underweight",
      hex: "#FF8C00",  // Deep Orange
      bg: "#ffe5cc",
      text: "#FF8C00",
      icon: "🟠",
      zscore: "-3.00 ≤ Z < -2.00"
    },
    normal: {
      label: "Normal Weight",
      hex: "#22c55e",  // Solid Green
      bg: "#dcfce7",
      text: "#166534",
      icon: "✅",
      zscore: "-2.00 ≤ Z ≤ +2.00"
    },
    overweight: {
      label: "Overweight",
      hex: "#7B68EE",  // Purple/Blue
      bg: "#ede9fe",
      text: "#5b21b6",
      icon: "📈",
      zscore: "Z > +2.00"
    }
  },
  
  // HAZ (Height-for-Age)
  haz: {
    severely_stunted: {
      label: "Severely Stunted",
      hex: "#8B0000",  // Crimson Red
      bg: "#ffe5e5",
      text: "#8B0000",
      icon: "🔴",
      zscore: "Z < -3.00"
    },
    stunted: {
      label: "Stunted",
      hex: "#FF8C00",  // Deep Orange
      bg: "#ffe5cc",
      text: "#FF8C00",
      icon: "🟠",
      zscore: "-3.00 ≤ Z < -2.00"
    },
    normal: {
      label: "Normal Height",
      hex: "#22c55e",  // Solid Green
      bg: "#dcfce7",
      text: "#166534",
      icon: "✅",
      zscore: "-2.00 ≤ Z ≤ +2.00"
    },
    tall: {
      label: "Tall",
      hex: "#7B68EE",  // Purple/Blue
      bg: "#ede9fe",
      text: "#5b21b6",
      icon: "📈",
      zscore: "Z > +2.00"
    }
  },
  
  // WHZ (Weight-for-Height)
  whz: {
    severely_wasted: {
      label: "Severely Wasted",
      hex: "#8B0000",  // Crimson Red
      bg: "#ffe5e5",
      text: "#8B0000",
      icon: "🔴",
      zscore: "Z < -3.00"
    },
    wasted: {
      label: "Wasted",
      hex: "#FF8C00",  // Deep Orange
      bg: "#ffe5cc",
      text: "#FF8C00",
      icon: "🟠",
      zscore: "-3.00 ≤ Z < -2.00"
    },
    normal: {
      label: "Normal Weight-Height",
      hex: "#22c55e",  // Solid Green
      bg: "#dcfce7",
      text: "#166534",
      icon: "✅",
      zscore: "-2.00 ≤ Z ≤ +2.00"
    },
    overweight: {
      label: "Overweight",
      hex: "#87CEEB",  // Sky Blue
      bg: "#e0f2fe",
      text: "#0369a1",
      icon: "📊",
      zscore: "+2.00 < Z ≤ +3.00"
    },
    obese: {
      label: "Obese",
      hex: "#2F4F4F",  // Dark Purple
      bg: "#f3e8ff",
      text: "#6b21b6",
      icon: "⚠️",
      zscore: "Z > +3.00"
    }
  }
};

/**
 * Alert Level Thresholds (3-Tier System)
 * Aligned with NNC OPT Plus guidelines
 */
export const ALERT_THRESHOLDS = {
  warning: {
    name: "Warning",
    icon: "🟡",
    level: 1,
    color: RISK_COLORS.medium,
    description: "Monitor closely, any indicator ≥ 10%",
  },
  critical: {
    name: "Critical",
    icon: "🟠",
    level: 2,
    color: RISK_COLORS.high,
    description: "Wasting ≥ 5% OR any indicator ≥ 15%",
  },
  emergency: {
    name: "Emergency",
    icon: "🔴",
    level: 3,
    color: RISK_COLORS.critical,
    description: "Wasting ≥ 10% OR SAM ≥ 2% OR any indicator ≥ 20%",
  },
};

/**
 * Get Risk Level from Prevalence Rate
 * @param prevalenceRate Malnutrition prevalence percentage
 * @returns Risk level classification
 */
export function getRiskLevel(prevalenceRate: number): RiskLevel {
  if (prevalenceRate >= 30) return "critical";
  if (prevalenceRate >= 15) return "high";
  if (prevalenceRate >= 5) return "medium";
  return "low";
}

/**
 * Get Z-Score Color by Indicator Type and Status
 * @param indicator 'waz' | 'haz' | 'whz'
 * @param status The child's status in that indicator
 * @returns Color configuration object
 */
export function getZScoreColor(indicator: "waz" | "haz" | "whz", status: string | undefined) {
  if (!status) {
    return indicator === "waz" ? Z_SCORE_COLORS.waz.normal
         : indicator === "haz" ? Z_SCORE_COLORS.haz.normal
         : Z_SCORE_COLORS.whz.normal;
  }
  
  const colors = indicator === "waz" ? Z_SCORE_COLORS.waz
               : indicator === "haz" ? Z_SCORE_COLORS.haz
               : Z_SCORE_COLORS.whz;
  
  return colors[status as keyof typeof colors] || colors.normal;
}

/**
 * Get Status Color by Malnutrition Status
 * Used for map markers and status indicators
 * @param status The malnutrition status (e.g., 'severe_acute_malnutrition', 'normal')
 * @returns Color configuration object with bg, text, hex, icon
 */
export function getStatusColor(status: string | undefined) {
  if (!status) {
    return STATUS_COLORS.normal;
  }
  
  return STATUS_COLORS[status as MalnutritionStatus] || STATUS_COLORS.normal;
}

/**
 * Map Marker SVG Pin Generator
 * Used in GIS map for child location markers
 */
export function generateMarkerSVG(
  status: string | undefined,
  size: "small" | "medium" | "large" = "medium"
): string {
  const colorObj = STATUS_COLORS[status as MalnutritionStatus] || STATUS_COLORS.normal;
  const colour = colorObj.hex;
  const sizeMap = {
    small: { width: 24, height: 36 },
    medium: { width: 28, height: 42 },
    large: { width: 32, height: 48 },
  };
  const s = sizeMap[size];

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 36">
      <path d="M12 0C5.4 0 0 5.4 0 12c0 9 12 24 12 24S24 21 24 12C24 5.4 18.6 0 12 0z"
        fill="${colour}" stroke="#fff" stroke-width="1.5"/>
      <circle cx="12" cy="12" r="5" fill="#fff" opacity="0.85"/>
    </svg>
  `;
  
  return encodeURIComponent(svg.replace(/\n/g, "").replace(/\s+/g, " "));
}

/**
 * Tailwind Class Utilities
 * Consistent styling for components
 */
export const UI_CLASSES = {
  card: "rounded-lg border border-slate-200 bg-white p-4 shadow-sm hover:shadow-md transition-shadow",
  badge: {
    critical: "inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-900",
    high: "inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-orange-100 text-orange-900",
    medium: "inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-900",
    low: "inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-900",
    normal: "inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700",
  },
  button: {
    primary: "px-4 py-2 rounded-lg bg-teal-600 text-white font-medium hover:bg-teal-700 transition-colors",
    secondary: "px-4 py-2 rounded-lg bg-slate-100 text-slate-900 font-medium hover:bg-slate-200 transition-colors",
    danger: "px-4 py-2 rounded-lg bg-red-600 text-white font-medium hover:bg-red-700 transition-colors",
  },
};

/**
 * Prevalence Rate Classifications
 * For context in dashboards and reports
 */
export const PREVALENCE_CLASSIFICATIONS = {
  low: { min: 0, max: 5, label: "Low", description: "Acceptable level" },
  moderate: { min: 5, max: 10, label: "Moderate", description: "Action needed" },
  high: { min: 10, max: 20, label: "High", description: "Urgent intervention" },
  critical: { min: 20, max: 100, label: "Critical", description: "Emergency response" },
};

/**
 * Get Classification from Prevalence Rate
 */
export function getPrevalenceClassification(rate: number): (typeof PREVALENCE_CLASSIFICATIONS)[keyof typeof PREVALENCE_CLASSIFICATIONS] {
  if (rate < PREVALENCE_CLASSIFICATIONS.low.max) return PREVALENCE_CLASSIFICATIONS.low;
  if (rate < PREVALENCE_CLASSIFICATIONS.moderate.max) return PREVALENCE_CLASSIFICATIONS.moderate;
  if (rate < PREVALENCE_CLASSIFICATIONS.high.max) return PREVALENCE_CLASSIFICATIONS.high;
  return PREVALENCE_CLASSIFICATIONS.critical;
}
