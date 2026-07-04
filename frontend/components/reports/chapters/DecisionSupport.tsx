'use client';

import React from 'react';
import { Lightbulb, Target, AlertCircle } from 'lucide-react';

interface Recommendation {
  priority: 'High' | 'Medium' | 'Low';
  title: string;
  description: string;
  targetArea: string;
  expectedOutcome?: string;
}

interface DecisionSupportData {
  recommendations?: Recommendation[];
  strategicPriorities?: string[];
  resourceNeeds?: string[];
  implementationTimeline?: string;
}

const getPriorityColor = (priority: string) => {
  switch (priority) {
    case 'High':
      return 'bg-red-100 text-red-800 border-red-200';
    case 'Medium':
      return 'bg-amber-100 text-amber-800 border-amber-200';
    case 'Low':
      return 'bg-green-100 text-green-800 border-green-200';
    default:
      return 'bg-slate-100 text-slate-800 border-slate-200';
  }
};

export function DecisionSupport({ data }: { data?: DecisionSupportData }) {
  if (!data) {
    return (
      <div className="text-slate-500 italic">
        No decision support data available
      </div>
    );
  }

  const recommendations = data.recommendations || [
    {
      priority: 'High',
      title: 'Scale-up Supplementary Feeding Program',
      description:
        'Expand SFP to include an additional 150 malnourished children identified in high-risk barangays.',
      targetArea: 'Barangays A, C, D',
      expectedOutcome: '25% improvement in nutritional status within 6 months',
    },
    {
      priority: 'High',
      title: 'Strengthen Community Health Worker Network',
      description:
        'Provide advanced training and monthly incentives to 15 additional CHWs in remote areas.',
      targetArea: 'Remote barangays',
      expectedOutcome: 'Reduce response time to 12 hours for all cases',
    },
    {
      priority: 'Medium',
      title: 'Implement GIS-Based Intervention Planning',
      description:
        'Use hotspot data to design targeted intervention zones with concentrated resources.',
      targetArea: 'Zone A (Northern Cluster)',
      expectedOutcome: 'Optimize resource allocation and increase coverage by 20%',
    },
    {
      priority: 'Medium',
      title: 'Establish Nutrition Referral Center',
      description:
        'Create specialized nutrition assessment and treatment facility in the municipal center.',
      targetArea: 'Municipal center',
      expectedOutcome: 'Improve severe case management and reduce complication rate',
    },
    {
      priority: 'Medium',
      title: 'Enhance Maternal Nutrition Education',
      description:
        'Develop culturally-appropriate nutrition education materials and conduct weekly sessions.',
      targetArea: 'All barangays',
      expectedOutcome: 'Increase maternal knowledge and dietary diversity',
    },
    {
      priority: 'Low',
      title: 'Establish Nutrition Monitoring Dashboard',
      description:
        'Create real-time interactive dashboard for program monitoring and reporting.',
      targetArea: 'Municipal office',
      expectedOutcome: 'Improve data-driven decision making',
    },
  ];

  const strategicPriorities = data.strategicPriorities || [
    'Focus on the identified hotspot zones with limited health facility access',
    'Strengthen the capacity of community health workers through training and incentives',
    'Scale-up proven effective interventions (SFP, nutrition education)',
    'Leverage geographic information for precision targeting of resources',
    'Build sustainable funding mechanisms beyond government appropriations',
    'Establish inter-agency coordination for holistic nutrition approach',
  ];

  const resourceNeeds = data.resourceNeeds || [
    'Additional PHP 2.5M for SFP expansion (6-month period)',
    'Training budget for 15 new CHWs (PHP 150K)',
    'Nutrition supplements and fortified foods (PHP 1.8M)',
    'Establishment of nutrition referral center (PHP 5M infrastructure)',
    'Vehicle for mobile outreach services (PHP 800K)',
    'Data management system upgrade (PHP 400K)',
  ];

  const implementationTimeline = data.implementationTimeline ||
    `Phase 1 (Q1 2025): CHW recruitment and training, SFP expansion pilot in Zone A
Phase 2 (Q2-Q3 2025): Full-scale implementation, monitoring and evaluation
Phase 3 (Q4 2025): Sustainability assessment and program refinement`;

  return (
    <div className="space-y-6">
      {/* Strategic Recommendations */}
      <div>
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Strategic Recommendations</h3>
        <div className="space-y-3">
          {recommendations.map((rec, idx) => (
            <div
              key={idx}
              className={`border-2 rounded-lg p-4 hover:shadow-md transition-shadow ${getPriorityColor(
                rec.priority
              )}`}
            >
              <div className="flex items-start gap-3 mb-2">
                <Lightbulb className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <div className="flex-grow">
                  <div className="flex items-start justify-between mb-1">
                    <h4 className="font-semibold">{rec.title}</h4>
                    <span className="text-xs font-bold px-2 py-1 bg-white rounded">
                      {rec.priority}
                    </span>
                  </div>
                  <p className="text-sm mb-2">{rec.description}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <p className="font-semibold">Target Area:</p>
                  <p>{rec.targetArea}</p>
                </div>
                {rec.expectedOutcome && (
                  <div>
                    <p className="font-semibold">Expected Outcome:</p>
                    <p>{rec.expectedOutcome}</p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Strategic Priorities */}
      <div>
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Strategic Priorities</h3>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <ol className="space-y-2">
            {strategicPriorities.map((priority, idx) => (
              <li key={idx} className="flex gap-3 text-slate-700">
                <span className="flex items-center justify-center w-6 h-6 bg-blue-600 text-white rounded-full font-bold text-sm flex-shrink-0">
                  {idx + 1}
                </span>
                <span>{priority}</span>
              </li>
            ))}
          </ol>
        </div>
      </div>

      {/* Resource Needs */}
      <div>
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Estimated Resource Needs</h3>
        <div className="bg-white p-4 rounded-lg border border-slate-200">
          <div className="space-y-2">
            {resourceNeeds.map((need, idx) => (
              <div key={idx} className="flex gap-3 pb-2 border-b border-slate-200 last:border-b-0">
                <Target className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
                <span className="text-slate-700">{need}</span>
              </div>
            ))}
          </div>
          <p className="text-sm font-semibold text-slate-900 mt-4 pt-4 border-t border-slate-200">
            Total Estimated Budget: PHP 11.05M (6-month period)
          </p>
        </div>
      </div>

      {/* Implementation Timeline */}
      <div>
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Implementation Timeline</h3>
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 whitespace-pre-line text-sm text-slate-700">
          {implementationTimeline}
        </div>
      </div>

      {/* Critical Success Factors */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <div className="flex gap-3">
          <AlertCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-semibold text-green-900 mb-2">Critical Success Factors</h4>
            <ul className="space-y-1 text-green-800 text-sm">
              <li>✓ Sustained political and organizational commitment</li>
              <li>✓ Adequate and timely resource allocation</li>
              <li>✓ Strong community and stakeholder participation</li>
              <li>✓ Continuous monitoring and adaptive management</li>
              <li>✓ Inter-agency collaboration and coordination</li>
              <li>✓ Evidence-based approach to program implementation</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
