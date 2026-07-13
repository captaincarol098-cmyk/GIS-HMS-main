"use client";

import {
  FileText, Download, Printer, Share2, Calendar, MapPin, 
  Users, TrendingUp, AlertCircle, CheckCircle, Clock
} from "lucide-react";
import jsPDF from "jspdf";

interface FormalProgramActivityReportProps {
  report: any;
}

export function FormalProgramActivityReport({ report }: FormalProgramActivityReportProps) {
  const data = report.data || {};

  const handleDownloadPDF = async () => {
    try {
      const { jsPDF } = await import("jspdf");
      const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4"
      });

      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 20;
      const contentWidth = pageWidth - (margin * 2);
      let yPosition = margin;

      // Helper functions
      const addText = (text: string, fontSize: number = 12, bold: boolean = false, color = "black") => {
        doc.setFontSize(fontSize);
        doc.setTextColor(0, 0, 0);
        if (bold) doc.setFont("helvetica", "bold");
        else doc.setFont("helvetica", "normal");
        
        const lines = doc.splitTextToSize(text, contentWidth);
        lines.forEach((line: string) => {
          if (yPosition > pageHeight - margin) {
            doc.addPage();
            yPosition = margin;
          }
          doc.text(line, margin, yPosition);
          yPosition += fontSize * 0.6;
        });
      };

      // Header Section
      doc.setFontSize(20);
      doc.setFont("helvetica", "bold");
      doc.text("PROGRAM ACTIVITY REPORT", pageWidth / 2, yPosition, { align: "center" });
      yPosition += 10;

      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text(`Report Number: ${data.report_number || "PAR-2024-000000"}`, pageWidth / 2, yPosition, { align: "center" });
      yPosition += 5;
      doc.text(`Department: ${data.department || "City Health Office"}`, pageWidth / 2, yPosition, { align: "center" });
      yPosition += 8;

      // Report Information
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text("REPORT INFORMATION", margin, yPosition);
      yPosition += 6;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.text(`City: ${data.city || "Cabadbaran City"}`, margin + 5, yPosition);
      yPosition += 4;
      doc.text(`Province: ${data.province || "Agusan del Norte"}`, margin + 5, yPosition);
      yPosition += 4;
      doc.text(`Region: ${data.region || "CARAGA"}`, margin + 5, yPosition);
      yPosition += 4;
      doc.text(`Barangay: ${data.barangay || "N/A"}`, margin + 5, yPosition);
      yPosition += 4;
      doc.text(`Report Date: ${data.report_date || new Date().toISOString().split('T')[0]}`, margin + 5, yPosition);
      yPosition += 4;
      doc.text(`Prepared By: ${data.prepared_by || "N/A"}`, margin + 5, yPosition);
      yPosition += 10;

      // Program Details
      doc.setFont("helvetica", "bold");
      doc.text("PROGRAM DETAILS", margin, yPosition);
      yPosition += 6;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.text(`Program Name: ${data.program_name || "N/A"}`, margin + 5, yPosition);
      yPosition += 4;
      doc.text(`Program Type: ${data.program_type || "N/A"}`, margin + 5, yPosition);
      yPosition += 4;
      doc.text(`Funding Source: ${data.funding_source || "N/A"}`, margin + 5, yPosition);
      yPosition += 4;
      doc.text(`Budget Allocated: ₱${(data.budget_allocated || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`, margin + 5, yPosition);
      yPosition += 4;
      doc.text(`Location: ${data.location || "N/A"}`, margin + 5, yPosition);
      yPosition += 10;

      // Statistics Section
      doc.setFont("helvetica", "bold");
      doc.text("PROGRAM STATISTICS", margin, yPosition);
      yPosition += 6;

      doc.setFont("helvetica", "normal");
      const stats = data.statistics || {};
      doc.setFontSize(9);
      doc.text(`Total Sessions Conducted: ${stats.total_sessions_conducted || 0}`, margin + 5, yPosition);
      yPosition += 4;
      doc.text(`Total Participants: ${stats.total_participants || 0}`, margin + 5, yPosition);
      yPosition += 4;
      doc.text(`Total Attended: ${stats.total_attended || 0}`, margin + 5, yPosition);
      yPosition += 4;
      doc.text(`Attendance Rate: ${stats.attendance_rate || "0%"}`, margin + 5, yPosition);
      yPosition += 10;

      // Key Performance Indicators
      doc.setFont("helvetica", "bold");
      doc.text("KEY PERFORMANCE INDICATORS (KPIs)", margin, yPosition);
      yPosition += 6;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      const kpis = data.kpis || [];
      kpis.forEach((kpi: any) => {
        doc.text(`• ${kpi.indicator}: Target ${kpi.target} | Actual ${kpi.actual} | Status: ${kpi.status}`, margin + 5, yPosition);
        yPosition += 4;
      });
      yPosition += 6;

      // Accomplishments
      doc.setFont("helvetica", "bold");
      doc.text("ACCOMPLISHMENTS", margin, yPosition);
      yPosition += 6;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      const accomplishments = data.accomplishments || [];
      accomplishments.forEach((item: string) => {
        doc.text(`• ${item}`, margin + 5, yPosition);
        yPosition += 4;
      });
      yPosition += 6;

      // Challenges
      doc.setFont("helvetica", "bold");
      doc.text("CHALLENGES ENCOUNTERED", margin, yPosition);
      yPosition += 6;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      const challenges = data.challenges || [];
      challenges.forEach((item: string) => {
        doc.text(`• ${item}`, margin + 5, yPosition);
        yPosition += 4;
      });
      yPosition += 6;

      // Recommendations
      doc.setFont("helvetica", "bold");
      doc.text("RECOMMENDATIONS", margin, yPosition);
      yPosition += 6;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      const recommendations = data.recommendations || [];
      recommendations.forEach((item: string) => {
        doc.text(`• ${item}`, margin + 5, yPosition);
        yPosition += 4;
      });

      // Footer
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.text(
        "This is an officially generated report from the GIS-HMS (Geographic Information System - Health Monitoring System)",
        pageWidth / 2,
        pageHeight - 10,
        { align: "center" }
      );

      doc.save(`${data.program_name || "Program"}_Activity_Report.pdf`);
    } catch (error) {
      console.error("PDF generation error:", error);
      alert("Failed to generate PDF");
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Report Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl p-8 shadow-lg">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-black mb-2">PROGRAM ACTIVITY REPORT</h1>
            <p className="text-blue-100 font-semibold">Report Number: {data.report_number || "PAR-2024-000000"}</p>
            <div className="flex items-center gap-4 mt-4 text-sm">
              <span className="flex items-center gap-1.5 bg-white/20 px-3 py-1 rounded-full">
                <Calendar className="h-4 w-4" />
                {data.report_date || new Date().toLocaleDateString()}
              </span>
              <span className="flex items-center gap-1.5 bg-white/20 px-3 py-1 rounded-full">
                <MapPin className="h-4 w-4" />
                {data.city || "Cabadbaran City"}
              </span>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleDownloadPDF}
              className="flex items-center gap-2 bg-white text-blue-600 px-4 py-2 rounded-lg font-bold hover:bg-blue-50 transition-colors"
            >
              <Download className="h-4 w-4" />
              PDF
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 bg-white/20 text-white px-4 py-2 rounded-lg font-bold hover:bg-white/30 transition-colors"
            >
              <Printer className="h-4 w-4" />
              Print
            </button>
          </div>
        </div>
      </div>

      {/* Report Information Card */}
      <div className="bg-white rounded-2xl border-2 border-slate-200 p-8 space-y-6">
        {/* Government Header */}
        <div className="text-center border-b-2 border-slate-300 pb-4">
          <p className="text-sm font-bold text-slate-600 uppercase tracking-wider">Office of the City Health Officer</p>
          <p className="text-lg font-black text-slate-900 mt-1">{data.city || "CABADBARAN CITY"}</p>
          <p className="text-xs text-slate-500 mt-1">{data.province} • {data.region}</p>
        </div>

        {/* Report Metadata */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
            <p className="text-xs font-bold text-slate-600 uppercase mb-2">Department</p>
            <p className="text-sm font-semibold text-slate-900">{data.department || "City Health Office"}</p>
          </div>
          <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
            <p className="text-xs font-bold text-slate-600 uppercase mb-2">Barangay</p>
            <p className="text-sm font-semibold text-slate-900">{data.barangay || "N/A"}</p>
          </div>
          <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
            <p className="text-xs font-bold text-slate-600 uppercase mb-2">Report Date</p>
            <p className="text-sm font-semibold text-slate-900">{data.report_date || "N/A"}</p>
          </div>
          <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
            <p className="text-xs font-bold text-slate-600 uppercase mb-2">Prepared By</p>
            <p className="text-sm font-semibold text-slate-900">{data.prepared_by || "N/A"}</p>
          </div>
        </div>
      </div>

      {/* Program Information Section */}
      <div className="bg-white rounded-2xl border-2 border-blue-200 p-8 space-y-4">
        <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
          <FileText className="h-6 w-6 text-blue-600" />
          Program Information
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-t-2 border-slate-200 pt-4">
          <div>
            <p className="text-xs font-bold text-slate-600 uppercase mb-1">Program Name</p>
            <p className="text-lg font-bold text-slate-900">{data.program_name || "N/A"}</p>
          </div>
          <div>
            <p className="text-xs font-bold text-slate-600 uppercase mb-1">Program Type</p>
            <p className="text-lg font-bold text-slate-900">{data.program_type || "N/A"}</p>
          </div>
          <div>
            <p className="text-xs font-bold text-slate-600 uppercase mb-1">Funding Source</p>
            <p className="text-lg font-bold text-slate-900">{data.funding_source || "N/A"}</p>
          </div>
          <div>
            <p className="text-xs font-bold text-slate-600 uppercase mb-1">Budget Allocated</p>
            <p className="text-lg font-bold text-emerald-600">
              ₱{(data.budget_allocated || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
          <div className="md:col-span-2">
            <p className="text-xs font-bold text-slate-600 uppercase mb-1">Implementation Location</p>
            <p className="text-lg font-bold text-slate-900">{data.location || "N/A"}</p>
          </div>
        </div>
      </div>

      {/* Program Statistics Section */}
      <div className="bg-white rounded-2xl border-2 border-green-200 p-8 space-y-4">
        <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
          <TrendingUp className="h-6 w-6 text-green-600" />
          Program Statistics & Performance
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 border-t-2 border-slate-200 pt-4">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 border-2 border-blue-200">
            <p className="text-xs font-bold text-blue-600 uppercase mb-2">Total Sessions</p>
            <p className="text-3xl font-black text-blue-900">{data.statistics?.total_sessions_conducted || 0}</p>
            <p className="text-xs text-blue-600 mt-1">Conducted</p>
          </div>
          <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4 border-2 border-purple-200">
            <p className="text-xs font-bold text-purple-600 uppercase mb-2">Total Participants</p>
            <p className="text-3xl font-black text-purple-900">{data.statistics?.total_participants || 0}</p>
            <p className="text-xs text-purple-600 mt-1">Registered</p>
          </div>
          <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-lg p-4 border-2 border-emerald-200">
            <p className="text-xs font-bold text-emerald-600 uppercase mb-2">Total Attended</p>
            <p className="text-3xl font-black text-emerald-900">{data.statistics?.total_attended || 0}</p>
            <p className="text-xs text-emerald-600 mt-1">Present</p>
          </div>
          <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-4 border-2 border-orange-200">
            <p className="text-xs font-bold text-orange-600 uppercase mb-2">Attendance Rate</p>
            <p className="text-3xl font-black text-orange-900">{data.statistics?.attendance_rate || "0%"}</p>
            <p className="text-xs text-orange-600 mt-1">Average</p>
          </div>
        </div>
      </div>

      {/* KPIs Section */}
      {data.kpis && data.kpis.length > 0 && (
        <div className="bg-white rounded-2xl border-2 border-yellow-200 p-8 space-y-4">
          <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
            <TrendingUp className="h-6 w-6 text-yellow-600" />
            Key Performance Indicators (KPIs)
          </h2>
          <div className="space-y-3 border-t-2 border-slate-200 pt-4">
            {data.kpis.map((kpi: any, idx: number) => (
              <div key={idx} className="bg-slate-50 rounded-lg p-4 border-l-4 border-yellow-500">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="font-bold text-slate-900">{kpi.indicator}</p>
                    <p className="text-sm text-slate-600 mt-1">
                      Target: <span className="font-semibold">{kpi.target}</span> | Actual: <span className="font-semibold text-blue-600">{kpi.actual}</span>
                    </p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                    kpi.status === "On-Track" 
                      ? "bg-green-100 text-green-700" 
                      : kpi.status === "Achieved"
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-amber-100 text-amber-700"
                  }`}>
                    {kpi.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Accomplishments Section */}
      {data.accomplishments && data.accomplishments.length > 0 && (
        <div className="bg-white rounded-2xl border-2 border-emerald-200 p-8 space-y-4">
          <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
            <CheckCircle className="h-6 w-6 text-emerald-600" />
            Key Accomplishments
          </h2>
          <div className="space-y-2 border-t-2 border-slate-200 pt-4">
            {data.accomplishments.map((item: string, idx: number) => (
              <div key={idx} className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                <p className="text-slate-700 font-medium">{item}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Challenges Section */}
      {data.challenges && data.challenges.length > 0 && (
        <div className="bg-white rounded-2xl border-2 border-amber-200 p-8 space-y-4">
          <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
            <AlertCircle className="h-6 w-6 text-amber-600" />
            Challenges Encountered
          </h2>
          <div className="space-y-2 border-t-2 border-slate-200 pt-4">
            {data.challenges.map((item: string, idx: number) => (
              <div key={idx} className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                <p className="text-slate-700 font-medium">{item}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recommendations Section */}
      {data.recommendations && data.recommendations.length > 0 && (
        <div className="bg-white rounded-2xl border-2 border-blue-200 p-8 space-y-4">
          <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
            <Clock className="h-6 w-6 text-blue-600" />
            Recommendations for Future Implementation
          </h2>
          <div className="space-y-2 border-t-2 border-slate-200 pt-4">
            {data.recommendations.map((item: string, idx: number) => (
              <div key={idx} className="flex items-start gap-3">
                <div className="flex items-center justify-center w-5 h-5 rounded-full bg-blue-600 text-white text-xs font-bold shrink-0 mt-0.5">
                  {idx + 1}
                </div>
                <p className="text-slate-700 font-medium">{item}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Footer Section */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white rounded-2xl p-8 space-y-3">
        <p className="text-center text-sm font-semibold">
          Report Status: <span className="font-black text-emerald-400">{data.status || "DRAFT"}</span>
        </p>
        <p className="text-center text-xs text-slate-300">
          This is an officially generated report from the GIS-HMS (Geographic Information System - Health Monitoring System)
        </p>
        <p className="text-center text-xs text-slate-400">
          Generated on {data.generated_at ? new Date(data.generated_at).toLocaleString() : "N/A"}
        </p>
      </div>
    </div>
  );
}
