"use client";

import { useState } from "react";
import { api, API_URL } from "@/lib/api";
import { useAuthStore } from "@/store/auth";

export function EndpointTester() {
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const { user } = useAuthStore();

  const testEndpoint = async () => {
    setLoading(true);
    setResult(null);
    
    try {
      console.log("Testing endpoint: /api/dashboard/superadmin/ai-insights");
      console.log("User role:", user?.role);
      console.log("API Base URL:", API_URL);
      
      const response = await api.get("/api/dashboard/superadmin/ai-insights");
      
      setResult({
        success: true,
        status: response.status,
        data: response.data,
      });
    } catch (error: any) {
      console.error("Test failed:", error);
      setResult({
        success: false,
        status: error.response?.status,
        message: error.message,
        details: error.response?.data,
        code: error.code,
        url: error.config?.url,
        baseURL: error.config?.baseURL,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white border border-slate-300 rounded-lg p-4 shadow-sm">
      <h3 className="text-sm font-bold mb-3">🔍 Endpoint Debugger</h3>
      
      <div className="space-y-2 text-xs mb-3">
        <p><strong>User:</strong> {user?.username || "Not logged in"}</p>
        <p><strong>Role:</strong> {user?.role || "Unknown"}</p>
        <p><strong>API URL:</strong> {API_URL}</p>
        <p><strong>Endpoint:</strong> /api/dashboard/superadmin/ai-insights</p>
      </div>

      <button
        onClick={testEndpoint}
        disabled={loading}
        className="bg-blue-600 text-white px-4 py-2 rounded text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 mb-3"
      >
        {loading ? "Testing..." : "Test Endpoint"}
      </button>

      {result && (
        <div className={`p-3 rounded text-xs ${result.success ? "bg-green-50 border border-green-200" : "bg-red-50 border border-red-200"}`}>
          <p className="font-bold mb-2">{result.success ? "✅ Success" : "❌ Failed"}</p>
          <pre className="overflow-auto max-h-96 whitespace-pre-wrap">
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
