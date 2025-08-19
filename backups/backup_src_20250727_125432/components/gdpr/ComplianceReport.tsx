/**
 * ComplianceReport Component
 * Displays GDPR compliance metrics and reports for administrators
 */

import React from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../ui/card';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import { Alert, AlertDescription } from '../ui/alert';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line
} from 'recharts';
import {
  Shield,
  Users,
  FileText,
  AlertTriangle,
  CheckCircle,
  Clock,
  TrendingUp,
  Download
} from 'lucide-react';
import { ComplianceReport as ComplianceReportType } from '../../types/gdpr';

interface ComplianceReportProps {
  report: ComplianceReportType | null;
  loading?: boolean;
  onRefresh?: () => void;
}

const COLORS = ['#10b981', '#f59e0b', '#ef4444', '#6366f1'];

const getComplianceColor = (score: number): string => {
  if (score >= 90) return 'text-green-600';
  if (score >= 70) return 'text-yellow-600';
  return 'text-red-600';
};

const getComplianceStatus = (score: number): { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' } => {
  if (score >= 90) return { label: 'Excellent', variant: 'default' };
  if (score >= 70) return { label: 'Good', variant: 'secondary' };
  if (score >= 50) return { label: 'Needs Improvement', variant: 'outline' };
  return { label: 'Critical', variant: 'destructive' };
};

export const ComplianceReport: React.FC<ComplianceReportProps> = ({
  report,
  loading = false,
  onRefresh
}) => {
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="pb-2">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-gray-200 rounded w-1/2"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!report) {
    return (
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          No compliance report available. Click refresh to generate a new report.
        </AlertDescription>
      </Alert>
    );
  }

  const complianceStatus = getComplianceStatus(report.overallScore);
  
  // Prepare chart data
  const consentData = Object.entries(report.consentStats).map(([type, stats]) => ({
    name: type.replace('_', ' ').toUpperCase(),
    active: stats.active,
    withdrawn: stats.withdrawn,
    total: stats.total
  }));

  const trendsData = report.trends?.map(trend => ({
    date: new Date(trend.date).toLocaleDateString(),
    score: trend.complianceScore,
    consents: trend.totalConsents
  })) || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Compliance Report</h2>
          <p className="text-muted-foreground">
            Generated on {new Date(report.generatedAt).toLocaleString()}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={complianceStatus.variant} className="text-sm">
            {complianceStatus.label}
          </Badge>
          {onRefresh && (
            <button
              onClick={onRefresh}
              className="p-2 hover:bg-gray-100 rounded-md transition-colors"
              title="Refresh Report"
            >
              <Download className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Overall Score */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Overall Compliance Score
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Compliance Level</span>
                <span className={`text-2xl font-bold ${getComplianceColor(report.overallScore)}`}>
                  {report.overallScore}%
                </span>
              </div>
              <Progress value={report.overallScore} className="h-3" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{report.totalUsers.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Active user accounts
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Consents</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{report.totalConsents.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Valid consent records
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Deletions</CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{report.pendingDeletions}</div>
            <p className="text-xs text-muted-foreground">
              Awaiting processing
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Data Exports</CardTitle>
            <FileText className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{report.dataExports}</div>
            <p className="text-xs text-muted-foreground">
              Completed this month
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Consent Statistics */}
        <Card>
          <CardHeader>
            <CardTitle>Consent Statistics by Type</CardTitle>
            <CardDescription>
              Active vs withdrawn consents across different categories
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={consentData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="name" 
                  tick={{ fontSize: 12 }}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis />
                <Tooltip />
                <Bar dataKey="active" fill="#10b981" name="Active" />
                <Bar dataKey="withdrawn" fill="#ef4444" name="Withdrawn" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Compliance Trends */}
        {trendsData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Compliance Trends
              </CardTitle>
              <CardDescription>
                Compliance score evolution over time
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={trendsData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                  <YAxis domain={[0, 100]} />
                  <Tooltip />
                  <Line 
                    type="monotone" 
                    dataKey="score" 
                    stroke="#6366f1" 
                    strokeWidth={2}
                    name="Compliance Score"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Issues and Recommendations */}
      {report.issues && report.issues.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
              Issues & Recommendations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {report.issues.map((issue, index) => (
                <Alert key={index}>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>{issue.type}:</strong> {issue.description}
                    {issue.recommendation && (
                      <div className="mt-1 text-sm text-muted-foreground">
                        <strong>Recommendation:</strong> {issue.recommendation}
                      </div>
                    )}
                  </AlertDescription>
                </Alert>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ComplianceReport;