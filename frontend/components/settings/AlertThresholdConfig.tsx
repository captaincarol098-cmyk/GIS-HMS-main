"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { AlertCircle, Save, RotateCcw } from "lucide-react";

interface ThresholdConfig {
  warning_any_prevalence: number;
  critical_wasting: number;
  critical_any_prevalence: number;
  critical_percent_increase: number;
  emergency_wasting: number;
  emergency_sam: number;
  emergency_any_prevalence: number;
}

interface ThresholdDisplay {
  thresholds: {
    warning: { any_prevalence: number };
    critical: { wasting: number; any_prevalence: number; percent_increase: number };
    emergency: { wasting: number; sam: number; any_prevalence: number };
  };
  target_age_range: { min_months: number; max_months: number; description: string };
  configurable: boolean;
}

/**
 * Alert Threshold Configuration Component
 * Allows both admin and superadmin to configure 3-tier alert thresholds
 */
export function AlertThresholdConfig() {
  const [config, setConfig] = useState<ThresholdConfig>({
    warning_any_prevalence: 10.0,
    critical_wasting: 5.0,
    critical_any_prevalence: 15.0,
    critical_percent_increase: 25.0,
    emergency_wasting: 10.0,
    emergency_sam: 2.0,
    emergency_any_prevalence: 20.0,
  });

  const [hasChanges, setHasChanges] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  // Fetch current configuration
  const configQuery = useQuery({
    queryKey: ["alert-thresholds"],
    queryFn: async () => {
      const response = await api.get<ThresholdDisplay>("/api/settings/alert-thresholds");
      return response.data;
    },
  });

  // Load thresholds when query succeeds
  useEffect(() => {
    if (configQuery.data?.thresholds) {
      const t = configQuery.data.thresholds;
      setConfig({
        warning_any_prevalence: t.warning.any_prevalence,
        critical_wasting: t.critical.wasting,
        critical_any_prevalence: t.critical.any_prevalence,
        critical_percent_increase: t.critical.percent_increase,
        emergency_wasting: t.emergency.wasting,
        emergency_sam: t.emergency.sam,
        emergency_any_prevalence: t.emergency.any_prevalence,
      });
      setHasChanges(false);
    }
  }, [configQuery.data]);

  // Update thresholds mutation
  const updateMutation = useMutation({
    mutationFn: async (newConfig: ThresholdConfig) => {
      const response = await api.put("/api/settings/alert-thresholds", newConfig);
      return response.data;
    },
    onSuccess: () => {
      setHasChanges(false);
      setSuccessMessage("Alert thresholds updated successfully!");
      configQuery.refetch();
      setTimeout(() => setSuccessMessage(""), 3000);
    },
    onError: (error: any) => {
      console.error("Failed to update thresholds:", error);
    },
  });

  const handleChange = (key: keyof ThresholdConfig, value: number) => {
    setConfig((prev) => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const handleSave = () => {
    updateMutation.mutate(config);
  };

  const handleReset = () => {
    if (configQuery.data?.thresholds) {
      const t = configQuery.data.thresholds;
      setConfig({
        warning_any_prevalence: t.warning.any_prevalence,
        critical_wasting: t.critical.wasting,
        critical_any_prevalence: t.critical.any_prevalence,
        critical_percent_increase: t.critical.percent_increase,
        emergency_wasting: t.emergency.wasting,
        emergency_sam: t.emergency.sam,
        emergency_any_prevalence: t.emergency.any_prevalence,
      });
      setHasChanges(false);
    }
  };

  if (configQuery.isLoading) {
    return (
      <div className="bg-white rounded-lg border border-slate-200 p-6 flex items-center justify-center">
        <div className="text-slate-500">Loading alert configuration...</div>
      </div>
    );
  }

  const targetAge = configQuery.data?.target_age_range;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-slate-900">Alert Threshold Configuration</h2>
        <p className="text-sm text-slate-600 mt-1">
          Configure 3-tier alert thresholds for malnutrition detection (NNC OPT Plus Guidelines)
        </p>
      </div>

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex gap-3">
        <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-blue-800">
          <p className="font-semibold">Target Age Group:</p>
          <p>
            {targetAge?.min_months}-{targetAge?.max_months} months ({targetAge?.description})
          </p>
        </div>
      </div>

      {/* Success Message */}
      {successMessage && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-sm text-green-800">
          ✅ {successMessage}
        </div>
      )}

      {/* Thresholds Grid */}
      <div className="grid gap-6">
        {/* Warning Level */}
        <div className="bg-white rounded-lg border border-slate-200 p-5">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-2xl">🟡</span>
            <h3 className="font-bold text-slate-900">Warning (Yellow) Level</h3>
          </div>
          <p className="text-sm text-slate-600 mb-4">Triggers when any indicator meets threshold</p>

          <div className="space-y-3">
            <div className="flex items-end gap-4">
              <div className="flex-1">
                <label className="text-sm font-medium text-slate-700">
                  Any Prevalence Indicator ≥ (%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={config.warning_any_prevalence}
                  onChange={(e) =>
                    handleChange("warning_any_prevalence", parseFloat(e.target.value))
                  }
                  className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                />
              </div>
              <div className="text-sm text-slate-500">%</div>
            </div>
          </div>
        </div>

        {/* Critical Level */}
        <div className="bg-white rounded-lg border border-slate-200 p-5">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-2xl">🟠</span>
            <h3 className="font-bold text-slate-900">Critical (Orange) Level</h3>
          </div>
          <p className="text-sm text-slate-600 mb-4">Triggers when ANY of these conditions met</p>

          <div className="space-y-3">
            <div className="flex items-end gap-4">
              <div className="flex-1">
                <label className="text-sm font-medium text-slate-700">Wasting Rate ≥ (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={config.critical_wasting}
                  onChange={(e) => handleChange("critical_wasting", parseFloat(e.target.value))}
                  className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>
              <div className="text-sm text-slate-500">%</div>
            </div>

            <div className="flex items-end gap-4">
              <div className="flex-1">
                <label className="text-sm font-medium text-slate-700">
                  Any Indicator ≥ (%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={config.critical_any_prevalence}
                  onChange={(e) =>
                    handleChange("critical_any_prevalence", parseFloat(e.target.value))
                  }
                  className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>
              <div className="text-sm text-slate-500">%</div>
            </div>

            <div className="flex items-end gap-4">
              <div className="flex-1">
                <label className="text-sm font-medium text-slate-700">
                  Percent Increase from Baseline (%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={config.critical_percent_increase}
                  onChange={(e) =>
                    handleChange("critical_percent_increase", parseFloat(e.target.value))
                  }
                  className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>
              <div className="text-sm text-slate-500">%</div>
            </div>
          </div>
        </div>

        {/* Emergency Level */}
        <div className="bg-white rounded-lg border border-slate-200 p-5">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-2xl">🔴</span>
            <h3 className="font-bold text-slate-900">Emergency (Red) Level</h3>
          </div>
          <p className="text-sm text-slate-600 mb-4">Triggers when ANY of these conditions met</p>

          <div className="space-y-3">
            <div className="flex items-end gap-4">
              <div className="flex-1">
                <label className="text-sm font-medium text-slate-700">Wasting Rate ≥ (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={config.emergency_wasting}
                  onChange={(e) => handleChange("emergency_wasting", parseFloat(e.target.value))}
                  className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                />
              </div>
              <div className="text-sm text-slate-500">%</div>
            </div>

            <div className="flex items-end gap-4">
              <div className="flex-1">
                <label className="text-sm font-medium text-slate-700">SAM (Severe Acute) ≥ (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={config.emergency_sam}
                  onChange={(e) => handleChange("emergency_sam", parseFloat(e.target.value))}
                  className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                />
              </div>
              <div className="text-sm text-slate-500">%</div>
            </div>

            <div className="flex items-end gap-4">
              <div className="flex-1">
                <label className="text-sm font-medium text-slate-700">
                  Any Indicator ≥ (%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={config.emergency_any_prevalence}
                  onChange={(e) =>
                    handleChange("emergency_any_prevalence", parseFloat(e.target.value))
                  }
                  className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                />
              </div>
              <div className="text-sm text-slate-500">%</div>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 justify-end">
        <button
          onClick={handleReset}
          disabled={!hasChanges}
          className="px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          <RotateCcw className="h-4 w-4" />
          Reset
        </button>
        <button
          onClick={handleSave}
          disabled={!hasChanges || updateMutation.isPending}
          className="px-4 py-2 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          <Save className="h-4 w-4" />
          {updateMutation.isPending ? "Saving..." : "Save Changes"}
        </button>
      </div>

      {/* Current Values Reference */}
      <div className="bg-slate-50 rounded-lg p-4">
        <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-3">
          Current Configuration
        </p>
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="bg-yellow-50 p-2 rounded border border-yellow-200">
            <span className="font-semibold text-yellow-900">Warning:</span>
            <span className="text-yellow-800"> Any ≥ {config.warning_any_prevalence}%</span>
          </div>
          <div className="bg-orange-50 p-2 rounded border border-orange-200">
            <span className="font-semibold text-orange-900">Critical:</span>
            <span className="text-orange-800"> Wasting ≥ {config.critical_wasting}%, Any ≥ {config.critical_any_prevalence}%</span>
          </div>
          <div className="bg-red-50 p-2 rounded border border-red-200 col-span-2">
            <span className="font-semibold text-red-900">Emergency:</span>
            <span className="text-red-800"> Wasting ≥ {config.emergency_wasting}%, SAM ≥ {config.emergency_sam}%, Any ≥ {config.emergency_any_prevalence}%</span>
          </div>
        </div>
      </div>
    </div>
  );
}
