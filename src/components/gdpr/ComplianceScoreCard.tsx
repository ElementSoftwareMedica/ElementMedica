/**
 * Compliance Score Card Component
 * Displays GDPR compliance score with recommendations
 * 
 * Redesigned with Tailwind CSS for consistency
 */

import React from 'react';
import { Shield, CheckCircle, AlertTriangle, XCircle, TrendingUp, Loader2 } from 'lucide-react';

interface ComplianceRecommendation {
  id: string;
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  category: string;
}

interface ComplianceScoreCardProps {
  score: number;
  recommendations?: ComplianceRecommendation[];
  loading?: boolean;
  error?: string | null;
}

export const ComplianceScoreCard: React.FC<ComplianceScoreCardProps> = ({
  score,
  recommendations = [],
  loading = false,
  error = null
}) => {
  const getScoreColor = (score: number) => {
    if (score >= 90) return { bg: 'bg-emerald-500', text: 'text-emerald-600', light: 'bg-emerald-100' };
    if (score >= 70) return { bg: 'bg-amber-500', text: 'text-amber-600', light: 'bg-amber-100' };
    return { bg: 'bg-red-500', text: 'text-red-600', light: 'bg-red-100' };
  };

  const getScoreIcon = (score: number) => {
    if (score >= 90) return <CheckCircle className="h-6 w-6 text-emerald-500" />;
    if (score >= 70) return <AlertTriangle className="h-6 w-6 text-amber-500" />;
    return <XCircle className="h-6 w-6 text-red-500" />;
  };

  const getScoreDescription = (score: number) => {
    if (score >= 90) return 'Compliance eccellente';
    if (score >= 70) return 'Buona compliance';
    if (score >= 50) return 'Da migliorare';
    return 'Problemi critici';
  };

  const getPriorityStyles = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-700 border-red-200';
      case 'medium': return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'low': return 'bg-blue-100 text-blue-700 border-blue-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const colors = getScoreColor(score);

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 h-full">
        <div className="flex flex-col items-center justify-center min-h-[120px] gap-3">
          <Loader2 className="h-8 w-8 text-blue-500 animate-spin" />
          <p className="text-sm text-gray-500">Caricamento score...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-2xl border border-red-100 shadow-sm p-5 h-full">
        <div className="bg-red-50 text-red-700 rounded-xl p-4">
          <p className="text-sm font-medium">Errore</p>
          <p className="text-xs mt-1 opacity-80">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 h-full hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900 text-sm">Score Compliance</h3>
        <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
          <Shield className="h-5 w-5 text-blue-600" />
        </div>
      </div>

      {/* Score Display */}
      <div className="text-center mb-4">
        <div className="flex items-center justify-center gap-2 mb-1">
          {getScoreIcon(score)}
          <span className={`text-3xl font-bold ${colors.text}`}>
            {score}%
          </span>
        </div>
        <p className="text-sm text-gray-500">
          {getScoreDescription(score)}
        </p>
      </div>

      {/* Progress Bar */}
      <div className="mb-4">
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className={`h-full ${colors.bg} rounded-full transition-all duration-500`}
            style={{ width: `${score}%` }}
          />
        </div>
      </div>

      {/* Trend Indicator */}
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp className="h-4 w-4 text-emerald-500" />
        <span className="text-xs text-gray-500">Trend in crescita</span>
      </div>

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <div>
          <p className="text-xs font-medium text-gray-700 mb-2">
            Raccomandazioni ({recommendations.length})
          </p>
          <div className="space-y-2">
            {recommendations.slice(0, 2).map((rec) => (
              <div key={rec.id} className="flex items-start gap-2">
                <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase border ${getPriorityStyles(rec.priority)}`}>
                  {rec.priority === 'high' ? 'Alta' : rec.priority === 'medium' ? 'Media' : 'Bassa'}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-gray-800 truncate">{rec.title}</p>
                </div>
              </div>
            ))}
          </div>
          {recommendations.length > 2 && (
            <p className="text-[10px] text-gray-400 mt-2">
              +{recommendations.length - 2} altre raccomandazioni
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default ComplianceScoreCard;