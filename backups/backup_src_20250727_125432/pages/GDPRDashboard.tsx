/**
 * GDPR Dashboard
 * Main dashboard for GDPR compliance management
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  Chip,
  LinearProgress,
  Alert,
  Tabs,
  Tab,
  IconButton,
  Tooltip,
  Divider,
  Stack
} from '@mui/material';
import {
  Security as SecurityIcon,
  Download as DownloadIcon,
  Delete as DeleteIcon,
  Settings as SettingsIcon,
  History as HistoryIcon,
  Assessment as AssessmentIcon,
  Refresh as RefreshIcon,
  Info as InfoIcon
} from '@mui/icons-material';
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

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`gdpr-tabpanel-${index}`}
      aria-labelledby={`gdpr-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ py: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

function a11yProps(index: number) {
  return {
    id: `gdpr-tab-${index}`,
    'aria-controls': `gdpr-tabpanel-${index}`,
  };
}

export const GDPRDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  // GDPR Hooks
  const consentHook = useGDPRConsent();
  const auditHook = useAuditTrail();
  const exportHook = useDataExport();
  const deletionHook = useDeletionRequest();
  const privacyHook = usePrivacySettings();

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

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
      console.error('Error refreshing GDPR data:', error);
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
  const getComplianceColor = (score: number) => {
    if (score >= 90) return 'success';
    if (score >= 70) return 'warning';
    return 'error';
  };

  const overallScore = getOverallComplianceScore();
  const complianceColor = getComplianceColor(overallScore);

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
          <Typography variant="h4" component="h1" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <SecurityIcon color="primary" />
            GDPR Dashboard
          </Typography>
          
          <Stack direction="row" spacing={1}>
            <Tooltip title="Refresh all data">
              <IconButton 
                onClick={handleRefreshAll} 
                disabled={refreshing}
                color="primary"
              >
                <RefreshIcon />
              </IconButton>
            </Tooltip>
            
            <Chip
              icon={<AssessmentIcon />}
              label={`Compliance Score: ${overallScore}%`}
              color={complianceColor}
              variant="outlined"
            />
          </Stack>
        </Stack>
        
        <Typography variant="body1" color="text.secondary">
          Manage your data privacy, consent preferences, and GDPR compliance settings.
        </Typography>
      </Box>

      {/* Loading indicator */}
      {refreshing && (
        <Box sx={{ mb: 2 }}>
          <LinearProgress />
        </Box>
      )}

      {/* Overview Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={6} lg={3}>
          <GDPROverviewCard
            title="Consent Status"
            icon={<SecurityIcon />}
            stats={consentHook.getConsentStats()}
            loading={consentHook.loading}
            error={consentHook.error}
          />
        </Grid>
        
        <Grid item xs={12} md={6} lg={3}>
          <GDPROverviewCard
            title="Data Exports"
            icon={<DownloadIcon />}
            stats={exportHook.getExportStats()}
            loading={exportHook.loading}
            error={exportHook.error}
          />
        </Grid>
        
        <Grid item xs={12} md={6} lg={3}>
          <GDPROverviewCard
            title="Deletion Requests"
            icon={<DeleteIcon />}
            stats={deletionHook.getDeletionStats()}
            loading={deletionHook.loading}
            error={deletionHook.error}
          />
        </Grid>
        
        <Grid item xs={12} md={6} lg={3}>
          <ComplianceScoreCard
            score={overallScore}
            recommendations={privacyHook.getComplianceRecommendations()}
            loading={privacyHook.loading}
          />
        </Grid>
      </Grid>

      {/* Error Alerts */}
      {(consentHook.error || auditHook.error || exportHook.error || deletionHook.error || privacyHook.error) && (
        <Alert severity="error" sx={{ mb: 3 }}>
          <Typography variant="subtitle2" gutterBottom>
            Some GDPR services are experiencing issues:
          </Typography>
          <ul style={{ margin: 0, paddingLeft: 20 }}>
            {consentHook.error && <li>Consent Management: {consentHook.error}</li>}
            {auditHook.error && <li>Audit Trail: {auditHook.error}</li>}
            {exportHook.error && <li>Data Export: {exportHook.error}</li>}
            {deletionHook.error && <li>Deletion Requests: {deletionHook.error}</li>}
            {privacyHook.error && <li>Privacy Settings: {privacyHook.error}</li>}
          </ul>
        </Alert>
      )}

      {/* Main Content Tabs */}
      <Card>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs 
            value={activeTab} 
            onChange={handleTabChange} 
            aria-label="GDPR dashboard tabs"
            variant="scrollable"
            scrollButtons="auto"
          >
            <Tab 
              label="Consent Management" 
              icon={<SecurityIcon />} 
              iconPosition="start"
              {...a11yProps(0)} 
            />
            <Tab 
              label="Privacy Settings" 
              icon={<SettingsIcon />} 
              iconPosition="start"
              {...a11yProps(1)} 
            />
            <Tab 
              label="Data Export" 
              icon={<DownloadIcon />} 
              iconPosition="start"
              {...a11yProps(2)} 
            />
            <Tab 
              label="Deletion Requests" 
              icon={<DeleteIcon />} 
              iconPosition="start"
              {...a11yProps(3)} 
            />
            <Tab 
              label="Audit Trail" 
              icon={<HistoryIcon />} 
              iconPosition="start"
              {...a11yProps(4)} 
            />
          </Tabs>
        </Box>

        <TabPanel value={activeTab} index={0}>
          <ConsentManagementTab hook={consentHook} />
        </TabPanel>

        <TabPanel value={activeTab} index={1}>
          <PrivacySettingsTab hook={privacyHook} />
        </TabPanel>

        <TabPanel value={activeTab} index={2}>
          <DataExportTab hook={exportHook} />
        </TabPanel>

        <TabPanel value={activeTab} index={3}>
          <DeletionRequestTab hook={deletionHook} />
        </TabPanel>

        <TabPanel value={activeTab} index={4}>
          <AuditTrailTab hook={auditHook} />
        </TabPanel>
      </Card>

      {/* Footer Info */}
      <Box sx={{ mt: 4, p: 2, bgcolor: 'background.paper', borderRadius: 1 }}>
        <Stack direction="row" spacing={1} alignItems="center">
          <InfoIcon color="info" fontSize="small" />
          <Typography variant="body2" color="text.secondary">
            This dashboard helps you manage your data privacy rights under GDPR. 
            For questions about data processing, contact our Data Protection Officer.
          </Typography>
        </Stack>
      </Box>
    </Container>
  );
};

export default GDPRDashboard;