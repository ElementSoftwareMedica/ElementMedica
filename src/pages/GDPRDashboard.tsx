/**
 * GDPR Dashboard
 * Main dashboard for GDPR compliance management
 */

import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import {
  Shield,
  Download,
  Trash2,
  Settings,
  History,
  BarChart3,
  RefreshCw,
  Info
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Progress } from '../components/ui/progress';
import { Alert } from '../components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { useGDPRConsent } from '../hooks/useGDPRConsent';
import { useAuditTrail } from '../hooks/useAuditTrail';
import { useDataExport } from '../hooks/useDataExport';
import { useDeletionRequest } from '../hooks/useDeletionRequest';
import { usePrivacySettings } from '../hooks/usePrivacySettings';
import { ConsentManagementTab } from '../components/gdpr/ConsentManagementTab';
import { AuditTrailTab } from '../components/gdpr/AuditTrailTab';
import { DataExportTab } from '../components/gdpr/DataExportTab';
import { DeletionRequestTab } from '../components/gdpr/DeletionRequestTab';
import { PrivacySettingsTab } from '../components/gdpr/PrivacySettingsTab';
import { GDPROverviewCard } from '../components/gdpr/GDPROverviewCard';
import { ComplianceScoreCard } from '../components/gdpr/ComplianceScoreCard';

export const GDPRDashboard: React.FC = () => {
  const location = useLocation();
  const initialTab = location.pathname.includes('/audit') ? 'audit' :
    location.pathname.includes('/export') ? 'export' :
      location.pathname.includes('/consent') ? 'consent' : 'consent';
  const [activeTab, setActiveTab] = useState(initialTab);
  const [refreshing, setRefreshing] = useState(false);

  // GDPR Hooks
  const consentHook = useGDPRConsent();
  const auditHook = useAuditTrail();
  const exportHook = useDataExport();
  const deletionHook = useDeletionRequest();
  const privacyHook = usePrivacySettings();

  const handleRefreshAll = async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        consentHook.refreshConsents(),
        auditHook.refreshAuditTrail(),
        exportHook.refreshRequests(),
        deletionHook.refreshRequests(),
        privacyHook.refreshSettings()
      ]);
    } catch (error) {
    } finally {
      setRefreshing(false);
    }
  };

  // Calculate overall compliance score
  const getOverallComplianceScore = () => {
    const privacyScore = privacyHook.getComplianceScore();
    const consentStats = consentHook.getConsentStats();
    const consentScore = consentStats.total > 0
      ? (consentStats.granted / consentStats.total) * 100
      : 100;

    return Math.round((privacyScore + consentScore) / 2);
  };

  // Get compliance status color
  const getComplianceColor = (score: number): 'default' | 'success' | 'warning' | 'destructive' => {
    if (score >= 90) return 'success';
    if (score >= 70) return 'warning';
    return 'destructive';
  };

  const overallScore = getOverallComplianceScore();
  const complianceColor = getComplianceColor(overallScore);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50/30">
      <div className="container mx-auto py-8 px-4 sm:px-6 space-y-8 max-w-7xl">
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm dark:shadow-black/30 border border-gray-100 dark:border-gray-700 p-6">
          <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/25">
                <Shield className="h-7 w-7 text-white" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-50">GDPR Dashboard</h1>
                <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm sm:text-base">
                  Gestisci privacy, consensi e impostazioni GDPR
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Button
                onClick={handleRefreshAll}
                disabled={refreshing}
                variant="outline"
                size="sm"
                className="gap-2 rounded-xl"
              >
                <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                Aggiorna
              </Button>

              <div className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium text-sm ${overallScore >= 90 ? 'bg-emerald-100 text-emerald-700' :
                overallScore >= 70 ? 'bg-amber-100 text-amber-700' :
                  'bg-red-100 text-red-700'
                }`}>
                <BarChart3 className="h-4 w-4" />
                <span>Compliance: {overallScore}%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Loading indicator */}
        {refreshing && (
          <div className="mb-4">
            <Progress value={50} className="w-full h-1" />
          </div>
        )}

        {/* Overview Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          <GDPROverviewCard
            title="Stato Consensi"
            icon={<Shield className="h-5 w-5" />}
            stats={consentHook.getConsentStats()}
            loading={consentHook.loading}
            error={consentHook.error}
          />

          <GDPROverviewCard
            title="Export Dati"
            icon={<Download className="h-5 w-5" />}
            stats={exportHook.getExportStats()}
            loading={exportHook.loading}
            error={exportHook.error}
          />

          <GDPROverviewCard
            title="Richieste Cancellazione"
            icon={<Trash2 className="h-5 w-5" />}
            stats={deletionHook.getDeletionStats()}
            loading={deletionHook.loading}
            error={deletionHook.error}
          />

          <ComplianceScoreCard
            score={overallScore}
            recommendations={privacyHook.getComplianceRecommendations()}
            loading={privacyHook.loading}
          />
        </div>

        {/* Error Alerts */}
        {(consentHook.error || auditHook.error || exportHook.error || deletionHook.error || privacyHook.error) && (
          <Alert variant="destructive" className="rounded-xl">
            <div className="font-semibold mb-2">Alcuni servizi GDPR hanno problemi:</div>
            <ul className="list-disc pl-5 space-y-1 text-sm">
              {consentHook.error && <li>Gestione Consensi: {consentHook.error}</li>}
              {auditHook.error && <li>Audit Trail: {auditHook.error}</li>}
              {exportHook.error && <li>Export Dati: {exportHook.error}</li>}
              {deletionHook.error && <li>Richieste Cancellazione: {deletionHook.error}</li>}
              {privacyHook.error && <li>Impostazioni Privacy: {privacyHook.error}</li>}
            </ul>
          </Alert>
        )}

        {/* Main Content Tabs */}
        <Card className="rounded-2xl shadow-sm dark:shadow-black/30 border-gray-100 dark:border-gray-700 overflow-hidden">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50 p-2">
              <TabsList className="w-full grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-1 bg-transparent h-auto p-0">
                <TabsTrigger value="consent" className="gap-2 data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700 data-[state=active]:shadow-sm rounded-xl py-2.5 text-sm">
                  <Shield className="h-4 w-4" />
                  <span className="hidden sm:inline">Consensi</span>
                </TabsTrigger>
                <TabsTrigger value="settings" className="gap-2 data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700 data-[state=active]:shadow-sm rounded-xl py-2.5 text-sm">
                  <Settings className="h-4 w-4" />
                  <span className="hidden sm:inline">Privacy</span>
                </TabsTrigger>
                <TabsTrigger value="export" className="gap-2 data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700 data-[state=active]:shadow-sm rounded-xl py-2.5 text-sm">
                  <Download className="h-4 w-4" />
                  <span className="hidden sm:inline">Export</span>
                </TabsTrigger>
                <TabsTrigger value="deletion" className="gap-2 data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700 data-[state=active]:shadow-sm rounded-xl py-2.5 text-sm">
                  <Trash2 className="h-4 w-4" />
                  <span className="hidden sm:inline">Cancellazione</span>
                </TabsTrigger>
                <TabsTrigger value="audit" className="gap-2 data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700 data-[state=active]:shadow-sm rounded-xl py-2.5 text-sm">
                  <History className="h-4 w-4" />
                  <span className="hidden sm:inline">Audit</span>
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="consent" className="p-4 sm:p-6 m-0">
              <ConsentManagementTab hook={consentHook} />
            </TabsContent>

            <TabsContent value="settings" className="p-4 sm:p-6 m-0">
              <PrivacySettingsTab hook={privacyHook} />
            </TabsContent>

            <TabsContent value="export" className="p-4 sm:p-6 m-0">
              <DataExportTab hook={exportHook} />
            </TabsContent>

            <TabsContent value="deletion" className="p-4 sm:p-6 m-0">
              <DeletionRequestTab hook={deletionHook} />
            </TabsContent>

            <TabsContent value="audit" className="p-4 sm:p-6 m-0">
              <AuditTrailTab hook={auditHook} />
            </TabsContent>
          </Tabs>
        </Card>

        {/* Footer Info */}
        <Card className="p-5 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/30 border-blue-100 dark:border-blue-800 rounded-2xl">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/50 rounded-xl flex items-center justify-center flex-shrink-0">
              <Info className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 dark:text-gray-50 mb-1">I tuoi diritti GDPR</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Questa dashboard ti permette di gestire i tuoi diritti sulla privacy secondo il GDPR.
                Per domande sul trattamento dei dati, contatta il nostro Data Protection Officer.
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default GDPRDashboard;
