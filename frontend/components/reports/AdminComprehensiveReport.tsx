'use client';

import React from 'react';
import {
  ExecutiveSummary,
  CityNutritionOverview,
  ChildNutritionalSummary,
  BarangayComparativeAnalysis,
  GISHotspotAnalysis,
  ProgramAccomplishmentAnalysis,
  InterventionEffectivenessAnalysis,
  AlertIncidentAnalysis,
  OptPlusDetailedAnalysis,
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
  optPlus?: any;
  forecasting?: any;
  decisionSupport?: any;
  barangayCompliance?: any;
  conclusion?: any;
  appendices?: any;
}

interface AdminComprehensiveReportProps {
  data: NutritionReportData;
  generatedDate?: string;
  userRole: 'admin' | 'super_admin';
}

const CHAPTERS_SUPERADMIN = [
  { id: 1, title: 'Executive Summary', key: 'executiveSummary' },
  { id: 2, title: 'City Nutrition Overview', key: 'cityOverview' },
  { id: 3, title: 'Child Nutritional Summary', key: 'childNutritional' },
  { id: 4, title: 'Barangay Comparative Analysis', key: 'barangayComparative' },
  { id: 5, title: 'GIS Hotspot Analysis', key: 'gisHotspot' },
  { id: 6, title: 'Program Accomplishment Analysis', key: 'programAccomplishment' },
  { id: 7, title: 'Intervention Effectiveness Analysis', key: 'interventionEffectiveness' },
  { id: 8, title: 'Alert & Incident Analysis', key: 'alertIncident' },
  { id: 9, title: 'Operation Timbang Plus Detailed Analysis', key: 'optPlus' },
  { id: 10, title: 'Forecasting Analysis', key: 'forecasting' },
  { id: 11, title: 'Decision Support', key: 'decisionSupport' },
  { id: 12, title: 'Barangay Compliance Evaluation', key: 'barangayCompliance' },
  { id: 13, title: 'Overall Conclusion', key: 'conclusion' },
  { id: 14, title: 'Appendices', key: 'appendices' },
];

const CHAPTERS_ADMIN = [
  { id: 1, title: 'Executive Summary', key: 'executiveSummary' },
  { id: 2, title: 'Child Nutritional Summary', key: 'childNutritional' },
  { id: 3, title: 'GIS Hotspot Analysis', key: 'gisHotspot' },
  { id: 4, title: 'Program Accomplishment Analysis', key: 'programAccomplishment' },
  { id: 5, title: 'Alert & Incident Analysis', key: 'alertIncident' },
  { id: 6, title: 'Decision Support', key: 'decisionSupport' },
  { id: 7, title: 'Overall Conclusion', key: 'conclusion' },
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
  optPlus: OptPlusDetailedAnalysis,
  forecasting: ForecastingAnalysis,
  decisionSupport: DecisionSupport,
  barangayCompliance: BarangayComplianceEvaluation,
  conclusion: OverallConclusion,
  appendices: Appendices,
};

export function AdminComprehensiveReport({
  data,
  generatedDate = new Date().toLocaleDateString(),
  userRole = 'admin',
}: AdminComprehensiveReportProps) {
  const chapters = userRole === 'super_admin' ? CHAPTERS_SUPERADMIN : CHAPTERS_ADMIN;

  return (
    <div 
      style={{
        width: '8.5in',
        margin: '0 auto',
        padding: '0',
        backgroundColor: '#ffffff',
        fontFamily: 'Arial, sans-serif',
        fontSize: '12px',
        lineHeight: '1.4',
      }}
      className="print:bg-white"
    >
      {/* PAGE 1: COVER PAGE */}
      <div
        style={{
          width: '8.5in',
          height: '11in',
          padding: '1in',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          pageBreakAfter: 'always',
          backgroundColor: '#ffffff',
        }}
        className="print:page-break-after"
      >
        {/* Seal Logo */}
        <img
          src="/cabadbaran-seal.png"
          alt="Cabadbaran City Seal"
          style={{
            width: '150px',
            height: '150px',
            marginBottom: '30px',
            objectFit: 'contain',
          }}
        />

        {/* Title */}
        <h1
          style={{
            fontSize: '24px',
            fontWeight: 'bold',
            marginBottom: '10px',
            color: '#1a1a1a',
            lineHeight: '1.3',
          }}
        >
          {userRole === 'super_admin'
            ? 'Comprehensive City Nutrition Monitoring, GIS Analysis, Forecasting, and Decision Support Report'
            : 'Barangay Nutrition Monitoring and Decision Support Report'}
        </h1>

        {/* Reporting Period */}
        <p style={{ fontSize: '12px', color: '#666', marginBottom: '20px', marginTop: '30px' }}>
          Reporting Period: Jan 1, 2025 - Jun 28, 2025
        </p>
        <p style={{ fontSize: '11px', color: '#666', marginBottom: '40px' }}>
          Generated: {generatedDate}
        </p>

        {/* Organization Info */}
        <p style={{ fontSize: '11px', color: '#666', marginBottom: '50px' }}>
          {userRole === 'super_admin'
            ? 'Prepared by: City Health Officer — Cabadbaran City'
            : 'Prepared by: Barangay Health Worker / Administrator'}
        </p>

        {/* Report ID */}
        <p style={{ fontSize: '10px', color: '#999', marginTop: 'auto' }}>
          Report ID: RPT-{userRole === 'super_admin' ? 'CMMS' : 'BNM'}-{new Date().toISOString().slice(0, 10).replace(/-/g, '')}
        </p>
      </div>

      {/* PAGE 2: TABLE OF CONTENTS */}
      <div
        style={{
          width: '8.5in',
          padding: '1in',
          pageBreakAfter: 'always',
        }}
        className="print:page-break-after"
      >
        <h2 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '20px', color: '#1a1a1a' }}>
          Table of Contents
        </h2>

        <div style={{ marginBottom: '15px' }}>
          {chapters.map((chapter) => (
            <div
              key={chapter.id}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginBottom: '8px',
                borderBottom: '1px dotted #ccc',
                paddingBottom: '4px',
              }}
            >
              <span style={{ fontWeight: '500' }}>
                {chapter.id}. {chapter.title}
              </span>
              <span style={{ color: '#666' }}>{chapter.id}</span>
            </div>
          ))}
        </div>
      </div>

      {/* CHAPTERS - EACH ON NEW PAGE */}
      {chapters.map((chapter) => {
        const Component = chapterComponentMap[chapter.key];
        const chapterData = (data as any)[chapter.key];

        return (
          <div
            key={chapter.id}
            style={{
              width: '8.5in',
              padding: '1in',
              pageBreakAfter: 'always',
              backgroundColor: '#ffffff',
            }}
            className="print:page-break-after"
          >
            {/* Chapter Header with Page Break */}
            <div
              style={{
                borderBottom: '2px solid #0066cc',
                paddingBottom: '10px',
                marginBottom: '20px',
              }}
            >
              <h2 style={{ fontSize: '14px', fontWeight: 'bold', color: '#0066cc', margin: '0' }}>
                Chapter {chapter.id}: {chapter.title}
              </h2>
            </div>

            {/* Chapter Content */}
            {Component ? (
              <div style={{ fontSize: '11px', lineHeight: '1.5', color: '#333' }}>
                <Component data={chapterData} />
              </div>
            ) : (
              <div style={{ fontSize: '11px', color: '#999', fontStyle: 'italic' }}>
                No data available for this chapter
              </div>
            )}

            {/* Page Footer */}
            <div
              style={{
                marginTop: '40px',
                paddingTop: '10px',
                borderTop: '1px solid #ccc',
                fontSize: '9px',
                color: '#999',
                textAlign: 'center',
              }}
            >
              <p style={{ margin: '0' }}>
                {userRole === 'super_admin'
                  ? 'Cabadbaran City Health Office - Child Malnutrition Monitoring System'
                  : 'Barangay Health Office - Nutrition Monitoring System'}
              </p>
              <p style={{ margin: '4px 0 0 0' }}>Page {chapter.id} | Generated: {generatedDate}</p>
            </div>
          </div>
        );
      })}

      {/* FINAL PAGE: BACK COVER */}
      <div
        style={{
          width: '8.5in',
          height: '11in',
          padding: '1in',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          backgroundColor: '#f8f9fa',
        }}
      >
        <div style={{ marginTop: 'auto', marginBottom: 'auto' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 'bold', color: '#1a1a1a', marginBottom: '20px' }}>
            End of Report
          </h3>
          <p style={{ fontSize: '11px', color: '#666', marginBottom: '30px', lineHeight: '1.6' }}>
            {userRole === 'super_admin'
              ? 'This comprehensive report provides real-time analysis of child nutrition monitoring, GIS-based hotspot identification, program effectiveness, and data-driven decision support for the Cabadbaran City Health System.'
              : 'This report provides nutrition monitoring data, program accomplishments, alerts, and recommendations for your barangay to improve child nutrition outcomes.'}
          </p>
          <p style={{ fontSize: '10px', color: '#999', marginBottom: '50px' }}>
            For questions or clarifications, please contact the {userRole === 'super_admin' ? 'City' : 'Barangay'} Health Office.
          </p>
        </div>

        <div style={{ marginTop: 'auto', fontSize: '9px', color: '#999', textAlign: 'center' }}>
          <p style={{ margin: '0' }}>© 2025 Cabadbaran City Health Office</p>
          <p style={{ margin: '4px 0 0 0' }}>Child Malnutrition Monitoring System (GIS-HMS)</p>
        </div>
      </div>
    </div>
  );
}
