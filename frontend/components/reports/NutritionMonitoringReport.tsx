'use client';

import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import {
  ExecutiveSummary,
  CityNutritionOverview,
  ChildNutritionalSummary,
  BarangayComparativeAnalysis,
  GISHotspotAnalysis,
  ProgramAccomplishmentAnalysis,
  InterventionEffectivenessAnalysis,
  AlertIncidentAnalysis,
  ForecastingAnalysis,
  DecisionSupport,
  BarangayComplianceEvaluation,
  OverallConclusion,
  Appendices,
} from './chapters';

interface NutritionReportData {
  executiveSummary?: any;
  cityOverview?: any;
  childNutritional?: any;
  barangayComparative?: any;
  gisHotspot?: any;
  programAccomplishment?: any;
  interventionEffectiveness?: any;
  alertIncident?: any;
  forecasting?: any;
  decisionSupport?: any;
  barangayCompliance?: any;
  conclusion?: any;
  appendices?: any;
}

interface NutritionMonitoringReportProps {
  data: NutritionReportData;
  title?: string;
  generatedDate?: string;
}

const CHAPTERS = [
  { id: 1, title: 'Executive Summary', key: 'executiveSummary' },
  { id: 2, title: 'City Nutrition Overview', key: 'cityOverview' },
  { id: 3, title: 'Child Nutritional Summary', key: 'childNutritional' },
  { id: 4, title: 'Barangay Comparative Analysis', key: 'barangayComparative' },
  { id: 5, title: 'GIS Hotspot Analysis', key: 'gisHotspot' },
  { id: 6, title: 'Program Accomplishment Analysis', key: 'programAccomplishment' },
  { id: 7, title: 'Intervention Effectiveness Analysis', key: 'interventionEffectiveness' },
  { id: 8, title: 'Alert & Incident Analysis', key: 'alertIncident' },
  { id: 9, title: 'Forecasting Analysis', key: 'forecasting' },
  { id: 10, title: 'Decision Support', key: 'decisionSupport' },
  { id: 11, title: 'Barangay Compliance Evaluation', key: 'barangayCompliance' },
  { id: 12, title: 'Overall Conclusion', key: 'conclusion' },
  { id: 13, title: 'Appendices', key: 'appendices' },
];

const chapterComponentMap: Record<string, React.ComponentType<any>> = {
  executiveSummary: ExecutiveSummary,
  cityOverview: CityNutritionOverview,
  childNutritional: ChildNutritionalSummary,
  barangayComparative: BarangayComparativeAnalysis,
  gisHotspot: GISHotspotAnalysis,
  programAccomplishment: ProgramAccomplishmentAnalysis,
  interventionEffectiveness: InterventionEffectivenessAnalysis,
  alertIncident: AlertIncidentAnalysis,
  forecasting: ForecastingAnalysis,
  decisionSupport: DecisionSupport,
  barangayCompliance: BarangayComplianceEvaluation,
  conclusion: OverallConclusion,
  appendices: Appendices,
};

export function NutritionMonitoringReport({
  data,
  title = 'Nutrition Monitoring Report',
  generatedDate = new Date().toLocaleDateString(),
}: NutritionMonitoringReportProps) {
  const [expandedChapter, setExpandedChapter] = useState<number | null>(null);

  const toggleChapter = (id: number) => {
    setExpandedChapter(expandedChapter === id ? null : id);
  };

  return (
    <div className="w-full bg-white">
      {/* Report Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 px-8 py-12 text-white">
        <h1 className="text-4xl font-bold mb-2">{title}</h1>
        <p className="text-blue-100">Generated on {generatedDate}</p>
      </div>

      {/* Table of Contents */}
      <div className="bg-slate-50 border-b border-slate-200 px-8 py-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Table of Contents</h2>
        <div className="grid grid-cols-2 gap-2 text-sm">
          {CHAPTERS.map((chapter) => (
            <div key={chapter.id} className="flex items-center text-slate-700">
              <span className="font-semibold text-blue-600 mr-2">{chapter.id}.</span>
              <span>{chapter.title}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Chapters */}
      <div className="px-8 py-8 space-y-4">
        {CHAPTERS.map((chapter) => {
          const Component = chapterComponentMap[chapter.key];
          const chapterData = (data as any)[chapter.key];
          const isExpanded = expandedChapter === chapter.id;

          return (
            <div
              key={chapter.id}
              className="border border-slate-200 rounded-lg overflow-hidden bg-white hover:shadow-md transition-shadow"
            >
              <button
                onClick={() => toggleChapter(chapter.id)}
                className="w-full px-6 py-4 bg-slate-50 hover:bg-slate-100 flex items-center justify-between transition-colors"
              >
                <div className="flex items-center gap-4">
                  <span className="flex items-center justify-center w-8 h-8 bg-blue-600 text-white rounded font-bold text-sm">
                    {chapter.id}
                  </span>
                  <h2 className="text-lg font-semibold text-slate-900">
                    {chapter.title}
                  </h2>
                </div>
                {isExpanded ? (
                  <ChevronUp className="w-5 h-5 text-slate-600" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-slate-600" />
                )}
              </button>

              {isExpanded && (
                <div className="px-6 py-6 border-t border-slate-200 bg-white">
                  {Component ? (
                    <Component data={chapterData} />
                  ) : (
                    <div className="text-slate-500 italic">
                      No data available for this chapter
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="bg-slate-100 border-t border-slate-200 px-8 py-6 text-center text-sm text-slate-600">
        <p>© 2024 Nutrition Monitoring System. All rights reserved.</p>
      </div>
    </div>
  );
}
