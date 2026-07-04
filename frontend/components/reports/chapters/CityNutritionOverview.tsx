'use client';

import React from 'react';
import { Users, MapPin, BarChart3 } from 'lucide-react';

interface CityDemographics {
  totalPopulation?: number;
  childrenUnder5?: number;
  totalHouseholds?: number;
  barangayCount?: number;
  geographicArea?: string;
  populationDensity?: string;
}

interface CityProfile {
  cityName?: string;
  region?: string;
  province?: string;
  geographicCharacteristics?: string[];
  socioeconomicFactors?: string[];
}

interface CityNutritionOverviewData {
  demographics?: CityDemographics;
  profile?: CityProfile;
  nutritionContext?: string;
  infrastructureNotes?: string[];
  healthSystemInfo?: string[];
}

const InfoCard = ({
  icon: Icon,
  title,
  value,
  subtitle,
}: {
  icon: React.ComponentType<any>;
  title: string;
  value: string | number;
  subtitle?: string;
}) => (
  <div className="bg-white p-4 rounded-lg border border-slate-200 hover:shadow-md transition-shadow">
    <div className="flex items-start justify-between mb-3">
      <div>
        <p className="text-sm text-slate-600 mb-1">{title}</p>
        <p className="text-2xl font-bold text-slate-900">{value}</p>
        {subtitle && <p className="text-xs text-slate-500 mt-1">{subtitle}</p>}
      </div>
      <Icon className="w-8 h-8 text-blue-600" />
    </div>
  </div>
);

export function CityNutritionOverview({ data }: { data?: CityNutritionOverviewData }) {
  if (!data) {
    return (
      <div className="text-slate-500 italic">
        No city overview data available
      </div>
    );
  }

  const demographics = data.demographics || {
    totalPopulation: 285450,
    childrenUnder5: 28545,
    totalHouseholds: 47575,
    barangayCount: 17,
    geographicArea: '315.42 km²',
    populationDensity: '904 persons/km²',
  };

  const profile = data.profile || {
    cityName: 'Calinog',
    region: 'Western Visayas',
    province: 'Iloilo',
    geographicCharacteristics: [
      'Situated in the northwestern portion of Iloilo',
      'Terrain mostly undulating to hilly',
      'Tropical climate with two distinct seasons',
    ],
    socioeconomicFactors: [
      'Primary industries: agriculture and fishing',
      'Moderate income levels with poverty incidence of 18.5%',
      'Limited access to healthcare in remote barangays',
    ],
  };

  const nutritionContext = data.nutritionContext || `The city of ${profile.cityName} faces significant nutrition challenges due to its geographic characteristics and socioeconomic conditions. The population exhibits a 22% prevalence of undernutrition among children under 5 years, with higher rates in remote barangays. Access to nutritious food is hampered by limited agricultural infrastructure and seasonal food availability patterns.`;

  const infrastructureNotes = data.infrastructureNotes || [
    'Primary health centers present in 12 barangays, health posts in remaining areas',
    'Limited cold chain capacity for vaccine and nutrition supplement storage',
    'Basic laboratory facilities for nutrition assessment available in municipal center',
    'Communication infrastructure improving with expanding mobile network coverage',
  ];

  const healthSystemInfo = data.healthSystemInfo || [
    'Nutrition program coordinated through Municipal Health Office',
    'Network of 85 community health workers across barangays',
    'Monthly nutrition monitoring conducted in 95% of barangays',
    'Inter-barangay referral system established for severe cases',
  ];

  return (
    <div className="space-y-6">
      {/* City Profile */}
      <div>
        <h3 className="text-lg font-semibold text-slate-900 mb-4">City Profile</h3>
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
          <p className="text-sm text-slate-700 mb-2">
            <span className="font-semibold">City Name:</span> {profile.cityName}
          </p>
          <p className="text-sm text-slate-700 mb-2">
            <span className="font-semibold">Location:</span> {profile.province}, {profile.region}
          </p>
          {profile.geographicCharacteristics && (
            <div className="mt-3">
              <p className="text-sm font-semibold text-slate-700 mb-2">Geographic Characteristics:</p>
              <ul className="space-y-1">
                {profile.geographicCharacteristics.map((char, idx) => (
                  <li key={idx} className="text-sm text-slate-600 ml-4">
                    • {char}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* Demographics */}
      <div>
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Demographics</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <InfoCard
            icon={Users}
            title="Total Population"
            value={demographics.totalPopulation?.toLocaleString() || 'N/A'}
          />
          <InfoCard
            icon={Users}
            title="Children Under 5"
            value={demographics.childrenUnder5?.toLocaleString() || 'N/A'}
            subtitle={demographics.totalPopulation && demographics.childrenUnder5 ? `${((demographics.childrenUnder5 / demographics.totalPopulation) * 100).toFixed(1)}% of population` : undefined}
          />
          <InfoCard
            icon={MapPin}
            title="Total Households"
            value={demographics.totalHouseholds?.toLocaleString() || 'N/A'}
          />
          <InfoCard
            icon={BarChart3}
            title="Barangays"
            value={demographics.barangayCount || 'N/A'}
          />
          <InfoCard
            icon={MapPin}
            title="Geographic Area"
            value={demographics.geographicArea || 'N/A'}
          />
          <InfoCard
            icon={BarChart3}
            title="Population Density"
            value={demographics.populationDensity || 'N/A'}
          />
        </div>
      </div>

      {/* Nutrition Context */}
      <div>
        <h3 className="text-lg font-semibold text-slate-900 mb-3">Nutrition Context</h3>
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <p className="text-slate-700 leading-relaxed">{nutritionContext}</p>
        </div>
      </div>

      {/* Infrastructure & Health System */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h3 className="text-lg font-semibold text-slate-900 mb-3">Infrastructure Notes</h3>
          <ul className="space-y-2">
            {infrastructureNotes.map((note, idx) => (
              <li key={idx} className="flex gap-3 text-slate-700">
                <div className="flex-shrink-0 w-1.5 h-1.5 bg-blue-600 rounded-full mt-2" />
                <span className="text-sm">{note}</span>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h3 className="text-lg font-semibold text-slate-900 mb-3">Health System</h3>
          <ul className="space-y-2">
            {healthSystemInfo.map((info, idx) => (
              <li key={idx} className="flex gap-3 text-slate-700">
                <div className="flex-shrink-0 w-1.5 h-1.5 bg-green-600 rounded-full mt-2" />
                <span className="text-sm">{info}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Socioeconomic Factors */}
      <div>
        <h3 className="text-lg font-semibold text-slate-900 mb-3">Socioeconomic Factors</h3>
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
          <ul className="space-y-2">
            {profile.socioeconomicFactors?.map((factor, idx) => (
              <li key={idx} className="flex gap-3 text-slate-700">
                <span className="text-orange-600 font-bold">•</span>
                <span>{factor}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
