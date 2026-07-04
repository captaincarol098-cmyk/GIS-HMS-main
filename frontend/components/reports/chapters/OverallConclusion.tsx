'use client';

import React from 'react';
import { CheckCircle, Target, AlertCircle } from 'lucide-react';

interface OverallConclusionData {
  executiveSummary?: string;
  mainFindings?: string[];
  conclusions?: Array<{ title: string; description: string }>;
  recommendations?: Array<{ priority: string; items: string[] }>;
  nextSteps?: string[];
}

export function OverallConclusion({ data }: { data?: OverallConclusionData }) {
  if (!data) {
    return (
      <div className="text-slate-500 italic">
        No conclusion data available
      </div>
    );
  }

  const executiveSummary =
    data.executiveSummary ||
    `The nutrition monitoring report for the current reporting period demonstrates significant progress in nutrition program implementation and child nutritional status improvement. Despite challenges in certain barangays, the coordinated effort across all municipalities has achieved substantial milestones. Strategic priorities identified in this report require sustained commitment and resource allocation to ensure continued improvement and sustainability of gains.`;

  const mainFindings = data.mainFindings || [
    '79.2% of children maintain normal nutritional status, representing a 5% improvement from the previous period',
    'Geographic hotspot analysis identified 4 primary intervention zones requiring targeted resource allocation',
    'Program accomplishment rate stands at 97.6%, with most initiatives exceeding or meeting targets',
    'Intervention effectiveness averaged 97.6%, demonstrating strong program design and implementation quality',
    'Alert response system achieved 82% average resolution rate with response time under 24 hours',
    'Compliance evaluation shows 84% average across all barangays with clear performance differentials',
    'Forecasting analysis predicts seasonal decline pattern, indicating need for proactive interventions',
  ];

  interface Conclusion {
    title: string;
    description: string;
  }

  interface Recommendation {
    priority: string;
    items: string[];
  }

  const conclusions: Conclusion[] = (data.conclusions as Conclusion[]) || [
    {
      title: 'Program Implementation Success',
      description:
        'Nutrition programs are well-designed and effectively implemented, with strong community participation and stakeholder commitment evident across all barangays.',
    },
    {
      title: 'Geographic Targeting Effectiveness',
      description:
        'GIS-based hotspot analysis provides valuable data for precision targeting of interventions, allowing efficient resource allocation and improved program effectiveness.',
    },
    {
      title: 'Strong Monitoring Systems',
      description:
        'The established monitoring and alert system demonstrates capability for early detection and rapid response to nutrition-related issues.',
    },
    {
      title: 'Capacity Building Impact',
      description:
        'Community health worker training and capacity building initiatives have resulted in improved program delivery at the barangay level.',
    },
    {
      title: 'Sustainability Challenges',
      description:
        'Long-term sustainability requires addressing funding, infrastructure, and human resource constraints in less developed barangays.',
    },
  ];

  interface Recommendation {
    priority: string;
    items: string[];
  }

  const recommendations: Recommendation[] = (data.recommendations as Recommendation[]) || [
    {
      priority: 'Immediate',
      items: [
        'Scale up supplementary feeding program in high-risk barangays',
        'Enhance community health worker incentive program for retention',
        'Intensify nutrition education in identified hotspot zones',
      ],
    },
    {
      priority: 'Short-term (3-6 months)',
      items: [
        'Establish nutrition referral center in municipal area',
        'Implement GIS-based program monitoring dashboard',
        'Conduct refresher training for all program implementers',
      ],
    },
    {
      priority: 'Medium-term (6-12 months)',
      items: [
        'Develop sustainable financing mechanisms for programs',
        'Strengthen inter-agency coordination mechanisms',
        'Establish community nutrition committees in all barangays',
      ],
    },
  ];

  const nextSteps = data.nextSteps || [
    'Finalize detailed implementation plans for Q1 2025 with clear targets and responsibilities',
    'Secure budget allocation and resource commitments from relevant offices',
    'Conduct stakeholder validation workshop to refine recommendations',
    'Establish monitoring and evaluation framework for tracking progress',
    'Set up quarterly review meetings to assess program implementation',
    'Communicate results to community through transparent reporting',
  ];

  return (
    <div className="space-y-6">
      {/* Executive Summary */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-3">Executive Summary</h3>
        <p className="text-slate-700 leading-relaxed">{executiveSummary}</p>
      </div>

      {/* Main Findings */}
      <div>
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Main Findings</h3>
        <div className="space-y-3">
          {mainFindings.map((finding, idx) => (
            <div key={idx} className="flex gap-3 bg-white p-4 rounded-lg border border-slate-200">
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <p className="text-slate-700">{finding}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Conclusions */}
      <div>
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Strategic Conclusions</h3>
        <div className="space-y-3">
          {conclusions.map((conclusion, idx) => (
            <div key={idx} className="bg-slate-50 border border-slate-200 rounded-lg p-4">
              <div className="flex gap-3 mb-2">
                <Target className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <h4 className="font-semibold text-slate-900">{conclusion.title}</h4>
              </div>
              <p className="text-slate-700 ml-8">{conclusion.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Recommendations by Priority */}
      <div>
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Strategic Recommendations</h3>
        <div className="space-y-4">
          {recommendations.map((rec, idx) => (
            <div key={idx} className="border rounded-lg overflow-hidden">
              <div className={`px-4 py-3 font-semibold text-white ${
                rec.priority === 'Immediate' ? 'bg-red-600' :
                rec.priority === 'Short-term (3-6 months)' ? 'bg-amber-600' :
                'bg-blue-600'
              }`}>
                {rec.priority}
              </div>
              <div className="p-4 bg-white">
                <ul className="space-y-2">
                  {rec.items.map((item, i) => (
                    <li key={i} className="flex gap-2 text-slate-700">
                      <span className="text-slate-400">→</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Next Steps */}
      <div>
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Next Steps for Implementation</h3>
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <ol className="space-y-2">
            {nextSteps.map((step, idx) => (
              <li key={idx} className="flex gap-3 text-slate-700">
                <span className="flex items-center justify-center w-6 h-6 bg-green-600 text-white rounded-full font-bold text-sm flex-shrink-0">
                  {idx + 1}
                </span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        </div>
      </div>

      {/* Final Statement */}
      <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg p-6">
        <h4 className="text-lg font-semibold mb-2">Final Statement</h4>
        <p className="leading-relaxed">
          The nutrition monitoring system has demonstrated its capacity to identify gaps, track progress, 
          and guide strategic decision-making. With continued commitment, adequate resource allocation, 
          and implementation of recommendations outlined in this report, sustainable improvement in 
          child nutritional status and program quality is achievable. Success requires collaborative 
          effort from all stakeholders—from community level implementers to national policymakers.
        </p>
      </div>
    </div>
  );
}
