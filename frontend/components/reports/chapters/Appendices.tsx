'use client';

import React, { useState } from 'react';
import { FileText, Download, ChevronDown, ChevronUp } from 'lucide-react';

interface AppendixSection {
  title: string;
  content: string | string[];
}

interface AppendicesData {
  appendices?: AppendixSection[];
  glossary?: Record<string, string>;
  references?: string[];
}

export function Appendices({ data }: { data?: AppendicesData }) {
  const [expandedSection, setExpandedSection] = useState<number | null>(null);

  if (!data) {
    return (
      <div className="text-slate-500 italic">
        No appendices data available
      </div>
    );
  }

  const appendices = data.appendices || [
    {
      title: 'Appendix A: Data Collection Methodology',
      content: `This section describes the methodology used for data collection across all barangays.

Survey Design:
- Cross-sectional survey of all children aged 0-5 years
- Random sampling where census not feasible
- Stratified by age groups for analysis

Measurement Tools:
- SECA electronic scales for weight measurement (±50g accuracy)
- Stadiometers for height measurement (±1mm accuracy)
- Mid-upper arm circumference measurement using MUAC tape
- Standardized data collection forms in both English and local language

Data Entry and Validation:
- Double entry validation for 10% of data
- Range checks and logic validation
- Missing data assessment and management procedures`,
    },
    {
      title: 'Appendix B: WHO Z-Score Reference Standards',
      content: `The report uses WHO 2006 Child Growth Standards for assessment of nutritional status.

Z-Score Classifications:
- Normal: -1 to +1 SD
- Mildly wasted: -1 to -2 SD (weight-for-height)
- Moderately wasted: -2 to -3 SD
- Severely wasted: < -3 SD

Stunting Categories:
- Normal: -1 to +1 SD (height-for-age)
- Mild stunting: -1 to -2 SD
- Moderate stunting: -2 to -3 SD
- Severe stunting: < -3 SD`,
    },
    {
      title: 'Appendix C: Program Implementation Details',
      content: [
        'Supplementary Feeding Program: 6 months duration, 5x weekly provision',
        'Nutrition Education: Monthly sessions with 85-90% attendance rate',
        'Micronutrient Supplementation: Monthly distribution to all at-risk children',
        'Growth Monitoring: Bi-monthly weighing and height measurement',
        'Referral Services: Direct linkage to health facilities for severe cases',
      ],
    },
    {
      title: 'Appendix D: Barangay Profiles Summary',
      content: `Summary statistics for each barangay including population, number of health workers, program coverage, and key challenges.`,
    },
    {
      title: 'Appendix E: GIS Mapping Details',
      content: `Technical specifications for GIS analysis including software used (QGIS 3.28), spatial data sources, hotspot calculation methodology, and visualization parameters.`,
    },
  ];

  const glossary = data.glossary || {
    'BMI': 'Body Mass Index - measure of body weight relative to height',
    'CHW': 'Community Health Worker - frontline health service provider',
    'GIS': 'Geographic Information System - tool for geographic data analysis',
    'IYCF': 'Infant and Young Child Feeding - feeding practices for children 0-24 months',
    'Malnutrition': 'State of inadequate nutrition due to insufficient food intake',
    'MUAC': 'Mid-Upper Arm Circumference - indicator of acute malnutrition',
    'SFP': 'Supplementary Feeding Program - program providing additional nutrition',
    'Stunting': 'Chronic malnutrition resulting in short stature for age',
    'Underweight': 'Low weight relative to age',
    'Wasting': 'Acute malnutrition resulting in low weight relative to height',
    'Z-Score': 'Standard deviation from the mean used in growth assessment',
  };

  const references = data.references || [
    'WHO (2006). WHO Child Growth Standards: Length/height-for-age, weight-for-age, weight-for-length, weight-for-height and body mass index-for-age.',
    'UNICEF (2021). Malnutrition in Children: Progress towards Millennium Development Goal 1.',
    'Department of Health Philippines (2022). National Nutrition Survey Report.',
    'World Health Organization (2021). Nutrition: Key Facts and Figures.',
    'UNICEF, WHO, World Bank (2021). Levels and Trends in Child Malnutrition.',
  ];

  return (
    <div className="space-y-6">
      {/* Appendices Sections */}
      <div>
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Appendices</h3>
        <div className="space-y-3">
          {appendices.map((appendix, idx) => (
            <div
              key={idx}
              className="border border-slate-200 rounded-lg overflow-hidden bg-white hover:shadow-md transition-shadow"
            >
              <button
                onClick={() =>
                  setExpandedSection(expandedSection === idx ? null : idx)
                }
                className="w-full px-6 py-4 bg-slate-50 hover:bg-slate-100 flex items-center justify-between transition-colors"
              >
                <div className="flex items-center gap-3">
                  <FileText className="w-5 h-5 text-blue-600" />
                  <h4 className="font-semibold text-slate-900">{appendix.title}</h4>
                </div>
                {expandedSection === idx ? (
                  <ChevronUp className="w-5 h-5 text-slate-600" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-slate-600" />
                )}
              </button>

              {expandedSection === idx && (
                <div className="px-6 py-4 bg-white border-t border-slate-200">
                  {typeof appendix.content === 'string' ? (
                    <p className="text-slate-700 whitespace-pre-line leading-relaxed">
                      {appendix.content}
                    </p>
                  ) : (
                    <ul className="space-y-2">
                      {appendix.content.map((item, i) => (
                        <li key={i} className="flex gap-2 text-slate-700">
                          <span className="text-slate-400">•</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Glossary of Terms */}
      <div>
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Glossary of Terms</h3>
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
          <div className="divide-y divide-slate-200">
            {Object.entries(glossary).map(([term, definition], idx) => (
              <div key={idx} className="px-6 py-3 hover:bg-slate-50 transition-colors">
                <p className="font-semibold text-slate-900">{term}</p>
                <p className="text-sm text-slate-600 mt-1">{definition}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* References */}
      <div>
        <h3 className="text-lg font-semibold text-slate-900 mb-4">References</h3>
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-6">
          <ol className="space-y-3">
            {references.map((reference, idx) => (
              <li key={idx} className="text-sm text-slate-700">
                <span className="font-semibold text-slate-900">[{idx + 1}]</span> {reference}
              </li>
            ))}
          </ol>
        </div>
      </div>

      {/* Document Information */}
      <div>
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Document Information</h3>
        <div className="bg-white border border-slate-200 rounded-lg p-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-slate-600">Report Title</p>
              <p className="font-semibold text-slate-900">Nutrition Monitoring Report</p>
            </div>
            <div>
              <p className="text-sm text-slate-600">Reporting Period</p>
              <p className="font-semibold text-slate-900">January - December 2024</p>
            </div>
            <div>
              <p className="text-sm text-slate-600">Prepared By</p>
              <p className="font-semibold text-slate-900">Nutrition Program Coordinator</p>
            </div>
            <div>
              <p className="text-sm text-slate-600">Date Generated</p>
              <p className="font-semibold text-slate-900">{new Date().toLocaleDateString()}</p>
            </div>
            <div>
              <p className="text-sm text-slate-600">Approved By</p>
              <p className="font-semibold text-slate-900">Municipal Health Officer</p>
            </div>
            <div>
              <p className="text-sm text-slate-600">Classification</p>
              <p className="font-semibold text-slate-900">Internal Document</p>
            </div>
          </div>
        </div>
      </div>

      {/* Download Options */}
      <div>
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Export Options</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <button className="flex items-center justify-center gap-2 px-4 py-3 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors">
            <Download className="w-4 h-4 text-blue-600" />
            <span className="text-sm font-semibold text-blue-600">PDF</span>
          </button>
          <button className="flex items-center justify-center gap-2 px-4 py-3 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 transition-colors">
            <Download className="w-4 h-4 text-green-600" />
            <span className="text-sm font-semibold text-green-600">Excel</span>
          </button>
          <button className="flex items-center justify-center gap-2 px-4 py-3 bg-purple-50 border border-purple-200 rounded-lg hover:bg-purple-100 transition-colors">
            <Download className="w-4 h-4 text-purple-600" />
            <span className="text-sm font-semibold text-purple-600">Word</span>
          </button>
          <button className="flex items-center justify-center gap-2 px-4 py-3 bg-orange-50 border border-orange-200 rounded-lg hover:bg-orange-100 transition-colors">
            <Download className="w-4 h-4 text-orange-600" />
            <span className="text-sm font-semibold text-orange-600">Print</span>
          </button>
        </div>
      </div>

      {/* Footer Note */}
      <div className="bg-slate-100 border border-slate-300 rounded-lg p-4 text-center text-sm text-slate-600">
        <p>For questions or clarifications regarding this report, please contact the Municipal Health Office.</p>
      </div>
    </div>
  );
}
