'use client';

import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useToast } from '@/lib/toast-context';
import { AlertCircle, Lock, Shield, CheckCircle, Clock, X } from 'lucide-react';

interface SecurityAlert {
  id: string;
  type: string;
  severity: string;
  username: string;
  ip_address: string;
  failed_attempts: number;
  description: string;
  created_at: string;
  is_resolved: boolean;
  details?: any;
}

export function SecurityAlertsDashboard() {
  const [selectedAlert, setSelectedAlert] = useState<SecurityAlert | null>(null);
  const [isResolving, setIsResolving] = useState(false);
  const { addToast } = useToast();

  // Fetch security alerts
  const alertsQuery = useQuery({
    queryKey: ['security-alerts'],
    queryFn: () => api.get('/api/security/alerts?limit=100&unresolved_only=false').then(r => r.data),
    refetchInterval: 30_000, // Refresh every 30 seconds
  });

  const alerts = alertsQuery.data?.alerts || [];
  const unresolvedCount = alerts.filter((a: SecurityAlert) => !a.is_resolved).length;
  const criticalCount = alerts.filter((a: SecurityAlert) => a.severity === 'critical' && !a.is_resolved).length;

  const resolveAlert = async (alertId: string, notes?: string) => {
    try {
      setIsResolving(true);
      await api.post(`/api/security/alerts/${alertId}/resolve`, { notes });
      addToast('Alert marked as resolved', 'success');
      await alertsQuery.refetch();
      setSelectedAlert(null);
    } catch (error) {
      addToast('Failed to resolve alert', 'error');
    } finally {
      setIsResolving(false);
    }
  };

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'failed_login':
        return <AlertCircle className="w-4 h-4 text-orange-500" />;
      case 'account_locked':
        return <Lock className="w-4 h-4 text-red-600" />;
      case 'suspicious_activity':
        return <Shield className="w-4 h-4 text-yellow-500" />;
      default:
        return <AlertCircle className="w-4 h-4 text-gray-500" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-50 border-red-200';
      case 'high':
        return 'bg-orange-50 border-orange-200';
      case 'medium':
        return 'bg-yellow-50 border-yellow-200';
      case 'low':
        return 'bg-blue-50 border-blue-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-red-700 font-medium">Critical Alerts</p>
              <p className="text-2xl font-bold text-red-600 mt-1">{criticalCount}</p>
            </div>
            <Lock className="w-8 h-8 text-red-500 opacity-20" />
          </div>
        </div>

        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-orange-700 font-medium">Unresolved Alerts</p>
              <p className="text-2xl font-bold text-orange-600 mt-1">{unresolvedCount}</p>
            </div>
            <AlertCircle className="w-8 h-8 text-orange-500 opacity-20" />
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-blue-700 font-medium">Total Alerts</p>
              <p className="text-2xl font-bold text-blue-600 mt-1">{alerts.length}</p>
            </div>
            <Shield className="w-8 h-8 text-blue-500 opacity-20" />
          </div>
        </div>

        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-green-700 font-medium">Resolved</p>
              <p className="text-2xl font-bold text-green-600 mt-1">{alerts.filter((a: SecurityAlert) => a.is_resolved).length}</p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-500 opacity-20" />
          </div>
        </div>
      </div>

      {/* Alerts List */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Security Alerts</h3>
        </div>

        {alerts.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4 opacity-50" />
            <p className="text-gray-500 font-medium">No security alerts</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200 max-h-96 overflow-y-auto">
            {alerts.map((alert: SecurityAlert) => (
              <div
                key={alert.id}
                className={`px-6 py-4 cursor-pointer hover:bg-gray-50 transition-colors border-l-4 ${
                  alert.severity === 'critical'
                    ? 'border-l-red-600'
                    : alert.severity === 'high'
                    ? 'border-l-orange-500'
                    : 'border-l-yellow-500'
                }`}
                onClick={() => setSelectedAlert(alert)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1">
                    {getAlertIcon(alert.type)}
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-gray-900">{alert.username}</p>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          alert.severity === 'critical'
                            ? 'bg-red-100 text-red-800'
                            : alert.severity === 'high'
                            ? 'bg-orange-100 text-orange-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {alert.severity.toUpperCase()}
                        </span>
                        {alert.is_resolved && (
                          <span className="px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-800">
                            RESOLVED
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mt-1">{alert.description}</p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                        <span>IP: {alert.ip_address}</span>
                        <span>Attempts: {alert.failed_attempts}</span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatTime(alert.created_at)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Alert Details Modal */}
      {selectedAlert && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Alert Details</h3>
              <button onClick={() => setSelectedAlert(null)} className="text-gray-500 hover:text-gray-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="px-6 py-4 space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700">Username</label>
                <p className="text-gray-900">{selectedAlert.username}</p>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700">Description</label>
                <p className="text-gray-900">{selectedAlert.description}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">IP Address</label>
                  <p className="text-gray-900 text-sm">{selectedAlert.ip_address}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Failed Attempts</label>
                  <p className="text-gray-900">{selectedAlert.failed_attempts}</p>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700">Alert Time</label>
                <p className="text-gray-900">{new Date(selectedAlert.created_at).toLocaleString()}</p>
              </div>

              {selectedAlert.details && (
                <div>
                  <label className="text-sm font-medium text-gray-700">Details</label>
                  <pre className="text-xs bg-gray-50 p-2 rounded overflow-auto">
                    {JSON.stringify(selectedAlert.details, null, 2)}
                  </pre>
                </div>
              )}

              {!selectedAlert.is_resolved && (
                <button
                  onClick={() => resolveAlert(selectedAlert.id)}
                  disabled={isResolving}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium py-2 px-4 rounded transition-colors"
                >
                  {isResolving ? 'Marking as Resolved...' : 'Mark as Resolved'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
