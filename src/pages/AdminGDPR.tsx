/**
 * AdminGDPR Page
 * Administrative dashboard for GDPR compliance management
 */

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../design-system/molecules/Card';
import { Button } from '../design-system/atoms/Button';
import { Badge } from '../design-system/atoms/Badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../design-system/molecules/Tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../design-system/molecules/Table';
import { Modal } from '../design-system/molecules/Modal';
import { Alert, AlertDescription } from '../components/ui/alert';
import { 
  AlertTriangle,
  CheckCircle,
  Clock,
  Eye,
  FileText,
  MessageSquare,
  RefreshCw,
  Shield,
  XCircle
} from 'lucide-react';
import { useGDPRAdmin } from '../hooks/useGDPRAdmin';
import { ComplianceReport } from '../components/gdpr/ComplianceReport';
import { DeletionRequest } from '../types/gdpr';

interface ProcessDialogState {
  open: boolean;
  request: DeletionRequest | null;
  action: 'approve' | 'reject' | null;
}

export const AdminGDPR: React.FC = () => {
  const {
    deletionRequests,
    complianceReport,
    loading,
    error,
    processDeletionRequest,
    generateComplianceReport,
    refreshData
  } = useGDPRAdmin();

  const [processDialog, setProcessDialog] = useState<ProcessDialogState>({
    open: false,
    request: null,
    action: null
  });
  const [processingNotes, setProcessingNotes] = useState('');
  const [processing, setProcessing] = useState(false);

  const handleProcessRequest = async () => {
    if (!processDialog.request || !processDialog.action) return;

    try {
      setProcessing(true);
      await processDeletionRequest(
        processDialog.request.id,
        processDialog.action === 'approve',
        processingNotes || undefined
      );
      
      setProcessDialog({ open: false, request: null, action: null });
      setProcessingNotes('');
    } catch (err) {
      console.error('Error processing request:', err);
    } finally {
      setProcessing(false);
    }
  };

  const openProcessDialog = (request: DeletionRequest, action: 'approve' | 'reject') => {
    setProcessDialog({ open: true, request, action });
    setProcessingNotes('');
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="text-yellow-600"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
      case 'approved':
        return <Badge variant="default" className="text-green-600"><CheckCircle className="w-3 h-3 mr-1" />Approved</Badge>;
      case 'rejected':
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Rejected</Badge>;
      case 'completed':
        return <Badge variant="secondary"><CheckCircle className="w-3 h-3 mr-1" />Completed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Shield className="h-8 w-8 text-blue-600" />
            GDPR Administration
          </h1>
          <p className="text-muted-foreground">
            Manage GDPR compliance, deletion requests, and generate compliance reports
          </p>
        </div>
        <Button
          onClick={refreshData}
          disabled={loading}
          variant="outline"
          className="flex items-center gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Main Content */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="deletions">Deletion Requests</TabsTrigger>
          <TabsTrigger value="compliance">Compliance Report</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pending Deletions</CardTitle>
                <Clock className="h-4 w-4 text-yellow-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {deletionRequests.filter(req => req.status === 'pending').length}
                </div>
                <p className="text-xs text-muted-foreground">
                  Require immediate attention
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Requests</CardTitle>
                <FileText className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{deletionRequests.length}</div>
                <p className="text-xs text-muted-foreground">
                  All deletion requests
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Compliance Score</CardTitle>
                <Shield className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {complianceReport?.overallScore || 0}%
                </div>
                <p className="text-xs text-muted-foreground">
                  Current compliance level
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Deletion Requests</CardTitle>
              <CardDescription>
                Latest requests requiring administrative action
              </CardDescription>
            </CardHeader>
            <CardContent>
              {deletionRequests.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No deletion requests found</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {deletionRequests.slice(0, 5).map((request) => (
                    <div key={request.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{request.userEmail}</span>
                          {getStatusBadge(request.status)}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Requested: {formatDate(request.requestDate)}
                        </p>
                        {request.reason && (
                          <p className="text-sm text-muted-foreground mt-1">
                            Reason: {request.reason}
                          </p>
                        )}
                      </div>
                      {request.status === 'pending' && (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openProcessDialog(request, 'approve')}
                            className="text-green-600 hover:text-green-700"
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openProcessDialog(request, 'reject')}
                            className="text-red-600 hover:text-red-700"
                          >
                            <XCircle className="h-4 w-4 mr-1" />
                            Reject
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Deletion Requests Tab */}
        <TabsContent value="deletions" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>All Deletion Requests</CardTitle>
              <CardDescription>
                Manage user data deletion requests under GDPR Article 17
              </CardDescription>
            </CardHeader>
            <CardContent>
              {deletionRequests.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No deletion requests found</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Request Date</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {deletionRequests.map((request) => (
                      <TableRow key={request.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{request.userEmail}</div>
                            <div className="text-sm text-muted-foreground">
                              ID: {request.userId}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{formatDate(request.requestDate)}</TableCell>
                        <TableCell>
                          <div className="max-w-xs truncate" title={request.reason}>
                            {request.reason || 'No reason provided'}
                          </div>
                        </TableCell>
                        <TableCell>{getStatusBadge(request.status)}</TableCell>
                        <TableCell>
                          {request.status === 'pending' ? (
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => openProcessDialog(request, 'approve')}
                                className="text-green-600 hover:text-green-700"
                              >
                                <CheckCircle className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => openProcessDialog(request, 'reject')}
                                className="text-red-600 hover:text-red-700"
                              >
                                <XCircle className="h-4 w-4" />
                              </Button>
                            </div>
                          ) : (
                            <Button size="sm" variant="ghost" disabled>
                              <Eye className="h-4 w-4" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Compliance Report Tab */}
        <TabsContent value="compliance" className="space-y-6">
          <ComplianceReport
            report={complianceReport}
            loading={loading}
            onRefresh={() => generateComplianceReport()}
          />
        </TabsContent>
      </Tabs>

      {/* Process Request Modal */}
      <Modal
        isOpen={processDialog.open}
        onClose={() => {
          setProcessDialog({ open: false, request: null, action: null });
          setProcessingNotes('');
        }}
        title={`${processDialog.action === 'approve' ? 'Approve' : 'Reject'} Deletion Request`}
        size="md"
      >
        <div className="space-y-4">
          <div className="text-sm text-gray-600">
            {processDialog.action === 'approve'
              ? 'This will permanently delete all user data. This action cannot be undone.'
              : 'Provide a reason for rejecting this deletion request.'}
          </div>
          
          {processDialog.request && (
            <>
              <div className="p-4 bg-gray-50 rounded-lg">
                <h4 className="font-medium mb-2">Request Details</h4>
                <div className="space-y-1 text-sm">
                  <p><strong>User:</strong> {processDialog.request.userEmail}</p>
                  <p><strong>Date:</strong> {formatDate(processDialog.request.requestDate)}</p>
                  <p><strong>Reason:</strong> {processDialog.request.reason || 'No reason provided'}</p>
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  {processDialog.action === 'approve' ? 'Processing Notes (Optional)' : 'Rejection Reason (Required)'}
                </label>
                <textarea
                  value={processingNotes}
                  onChange={(e) => setProcessingNotes(e.target.value)}
                  placeholder={processDialog.action === 'approve'
                    ? 'Add any notes about the processing...'
                    : 'Explain why this request is being rejected...'}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </>
          )}
        </div>
        
        <div className="flex justify-end gap-2 mt-6">
          <Button
            variant="outline"
            onClick={() => setProcessDialog({ open: false, request: null, action: null })}
            disabled={processing}
          >
            Cancel
          </Button>
          <Button
            onClick={handleProcessRequest}
            disabled={processing || (processDialog.action === 'reject' && !processingNotes.trim())}
            variant={processDialog.action === 'approve' ? 'default' : 'destructive'}
          >
            {processing ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : processDialog.action === 'approve' ? (
              <CheckCircle className="h-4 w-4 mr-2" />
            ) : (
              <XCircle className="h-4 w-4 mr-2" />
            )}
            {processDialog.action === 'approve' ? 'Approve & Delete' : 'Reject Request'}
          </Button>
        </div>
      </Modal>
    </div>
  );
};

export default AdminGDPR;