/**
 * TemplateStatistics Component
 * 
 * Displays template system statistics in a dashboard card format.
 */

import React, { useState, useEffect } from 'react';
import { FileText, Files, TrendingUp, Clock, AlertCircle, RefreshCw } from 'lucide-react';
import { templateService } from '../../services/templateService';
import type { TemplateStatistics } from '../../types/templates';

const TemplateStatisticsCard: React.FC = () => {
  const [stats, setStats] = useState<TemplateStatistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadStatistics();
  }, []);

  const loadStatistics = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await templateService.getStatistics();
      setStats(data);
    } catch (err: any) {
      setError(err.message || 'Errore nel caricamento delle statistiche');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-center h-48">
          <div className="text-center">
            <RefreshCw className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-2" />
            <p className="text-gray-600">Caricamento statistiche...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-start gap-3 text-red-600">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-medium">Errore</p>
            <p className="text-sm text-red-500 mt-1">{error}</p>
            <button
              onClick={loadStatistics}
              className="mt-2 text-sm underline hover:no-underline"
            >
              Riprova
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!stats) {
    return null;
  }

  return (
    <div className="bg-white rounded-lg shadow">
      {/* Header */}
      <div className="px-6 py-4 border-b">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Statistiche Template</h3>
          <button
            onClick={loadStatistics}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            title="Aggiorna statistiche"
          >
            <RefreshCw className="w-4 h-4 text-gray-600" />
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 p-6">
        {/* Total Templates */}
        <div className="flex items-start gap-4">
          <div className="p-3 bg-blue-100 rounded-lg">
            <FileText className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <p className="text-sm text-gray-600">Template Totali</p>
            <p className="text-2xl font-bold text-gray-900">{stats.templates.total}</p>
            <p className="text-xs text-gray-500 mt-1">
              {stats.templates.active} attivi, {stats.templates.inactive} inattivi
            </p>
          </div>
        </div>

        {/* Total Documents */}
        <div className="flex items-start gap-4">
          <div className="p-3 bg-green-100 rounded-lg">
            <Files className="w-6 h-6 text-green-600" />
          </div>
          <div>
            <p className="text-sm text-gray-600">Documenti Generati</p>
            <p className="text-2xl font-bold text-gray-900">{stats.documents.total}</p>
          </div>
        </div>

        {/* Top Template */}
        {stats.topTemplates.length > 0 && (
          <div className="flex items-start gap-4 col-span-1 md:col-span-2">
            <div className="p-3 bg-purple-100 rounded-lg">
              <TrendingUp className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Template Più Usato</p>
              <p className="text-lg font-semibold text-gray-900 truncate">
                {stats.topTemplates[0].name}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {stats.topTemplates[0].documentsGenerated} documenti generati
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Top Templates Table */}
      {stats.topTemplates.length > 0 && (
        <div className="px-6 pb-6">
          <h4 className="text-sm font-medium text-gray-700 mb-3">Top 5 Template</h4>
          <div className="space-y-2">
            {stats.topTemplates.slice(0, 5).map((template, index) => (
              <div key={template.id} className="flex items-center justify-between bg-gray-50 rounded p-3">
                <div className="flex items-center gap-3">
                  <span className="text-lg font-bold text-gray-400">#{index + 1}</span>
                  <div>
                    <p className="font-medium text-gray-900">{template.name}</p>
                    <p className="text-xs text-gray-500">{template.type}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-gray-900">{template.documentsGenerated}</p>
                  <p className="text-xs text-gray-500">documenti</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default TemplateStatisticsCard;
