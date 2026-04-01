/**
 * GenerateCertificatesDialog Component
 * 
 * Dialog per la generazione batch di attestati per i partecipanti di un corso.
 * Permette di selezionare il template, i partecipanti, e configurare opzioni
 * come invio email e anni di validità.
 */

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle2, Download, FileText, Loader2, XCircle, X, Award } from 'lucide-react';
import attestatiService, {
  type Attestato,
  type BatchGenerateResponse
} from '@/services/attestatiService';
import templateService from '@/services/templateService';
import type { Template } from '@/types/templates';

interface Person {
  id: string;
  firstName: string;
  lastName: string;
  cf: string;
}

interface GenerateCertificatesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  schedule: {
    id: string;
    tenantId?: string;  // P48: For cross-tenant template loading
    course: {
      title: string;
      validityYears?: number;
    };
    companies: Array<{
      company: {
        persons: Person[];
      };
    }>;
  };
  onSuccess?: () => void;
}

export function GenerateCertificatesDialog({
  open,
  onOpenChange,
  schedule,
  onSuccess,
}: GenerateCertificatesDialogProps) {
  // State per template e partecipanti
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [selectedPersonIds, setSelectedPersonIds] = useState<Set<string>>(new Set());
  const [existingCertificates, setExistingCertificates] = useState<Map<string, Attestato>>(new Map());

  // State per opzioni
  const [sendEmail, setSendEmail] = useState(false);
  const [validityYears, setValidityYears] = useState<string>('');

  // State per loading e risultati
  const [loadingTemplates, setLoadingTemplates] = useState(true);
  const [loadingExisting, setLoadingExisting] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [batchResults, setBatchResults] = useState<BatchGenerateResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Ottieni tutti i partecipanti dal corso
  const allParticipants = schedule.companies.flatMap(
    (sc) => sc.company.persons
  );

  // Carica templates all'apertura
  useEffect(() => {
    if (open) {
      loadTemplates();
      loadExistingCertificates();
      // Reset state quando si apre la dialog
      setBatchResults(null);
      setError(null);
      setProgress(0);
    }
  }, [open, schedule.id]);

  // Auto-select template when templates load - immediately set during load
  const loadTemplates = async () => {
    try {
      setLoadingTemplates(true);

      // P48 FIX: Use schedule's tenantId for cross-tenant template loading
      // This allows admin users to load templates from the schedule's tenant
      const headers: Record<string, string> = {};
      if (schedule.tenantId) {
        headers['X-Operate-Tenant-Id'] = schedule.tenantId;
      }

      const response = await templateService.list({}, { headers });
      const allTemplates = response.data || [];
      const certificateTemplates = allTemplates.filter(
        (t: Template) => t.type === 'CERTIFICATE' && t.isActive
      );
      setTemplates(certificateTemplates);

      // Auto-select template IMMEDIATELY during load (no useEffect race condition)
      // Priority: isDefault template > first available template
      const defaultTemplate = certificateTemplates.find((t: Template) => t.isDefault === true);
      if (defaultTemplate) {
        setSelectedTemplateId(defaultTemplate.id);
      } else if (certificateTemplates.length > 0) {
        setSelectedTemplateId(certificateTemplates[0].id);
      } else {
        setSelectedTemplateId('');
      }
    } catch (err) {
      setError('Errore nel caricamento dei template');
    } finally {
      setLoadingTemplates(false);
    }
  };

  const loadExistingCertificates = async () => {
    try {
      setLoadingExisting(true);
      const existing = await attestatiService.list({
        scheduleId: schedule.id,
      });
      const existingMap = new Map<string, Attestato>();
      existing.forEach((attestato) => {
        if (attestato.person?.id) {
          existingMap.set(attestato.person.id, attestato);
        }
      });
      setExistingCertificates(existingMap);
    } catch (err) {
    } finally {
      setLoadingExisting(false);
    }
  };

  const handleSelectAll = () => {
    // Seleziona solo i partecipanti che non hanno già un attestato
    const availablePersonIds = allParticipants
      .filter((p) => !existingCertificates.has(p.id))
      .map((p) => p.id);
    setSelectedPersonIds(new Set(availablePersonIds));
  };

  const handleDeselectAll = () => {
    setSelectedPersonIds(new Set());
  };

  const handleToggleSelect = (personId: string) => {
    const newSelected = new Set(selectedPersonIds);
    if (newSelected.has(personId)) {
      newSelected.delete(personId);
    } else {
      newSelected.add(personId);
    }
    setSelectedPersonIds(newSelected);
  };

  const handleGenerate = async () => {
    if (!selectedTemplateId || selectedPersonIds.size === 0) {
      setError('Seleziona un template e almeno un partecipante');
      return;
    }

    try {
      setGenerating(true);
      setError(null);
      setProgress(0);

      const personIds = Array.from(selectedPersonIds);

      const params = {
        scheduleId: schedule.id,
        personIds,
        templateId: selectedTemplateId,
        sendEmail,
        validityYears: validityYears ? parseInt(validityYears, 10) : undefined,
      };

      // Simula progresso (la generazione batch è sequenziale nel backend)
      const progressInterval = setInterval(() => {
        setProgress((prev) => Math.min(prev + 10, 90));
      }, 500);

      // P48: Pass X-Operate-Tenant-Id so backend validates template against the correct tenant
      const generateHeaders: Record<string, string> = {};
      if (schedule.tenantId) {
        generateHeaders['X-Operate-Tenant-Id'] = schedule.tenantId;
      }
      const results = await attestatiService.generateBatch(params, { headers: generateHeaders });

      clearInterval(progressInterval);
      setProgress(100);

      setBatchResults(results);

      if (results.success > 0) {
        // Ricarica certificati esistenti
        await loadExistingCertificates();
        // Reset selezione
        setSelectedPersonIds(new Set());
      }

      if (results.success === results.total) {
        // Tutti generati con successo
        setTimeout(() => {
          onSuccess?.();
          onOpenChange(false);
        }, 2000);
      }
    } catch (err: unknown) {
      setError('Errore durante la generazione degli attestati');
    } finally {
      setGenerating(false);
    }
  };

  const handleClose = () => {
    if (!generating) {
      onOpenChange(false);
      // Reset dopo chiusura
      setTimeout(() => {
        setBatchResults(null);
        setError(null);
        setSelectedPersonIds(new Set());
        setProgress(0);
      }, 200);
    }
  };

  const isLoading = loadingTemplates || loadingExisting;
  const availableParticipants = allParticipants.filter(
    (p) => !existingCertificates.has(p.id)
  );
  const canGenerate =
    !generating &&
    !isLoading &&
    selectedTemplateId &&
    selectedPersonIds.size > 0;

  // Non renderizzare se non è aperto
  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[1100] flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header - Green theme to match Attestati section colors */}
        <div className="flex items-center justify-between px-6 py-4 border-b dark:border-gray-700 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/30 dark:to-emerald-900/30">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 dark:bg-green-900/50 rounded-lg">
              <Award className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Genera Attestati</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">{schedule.course.title}</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            disabled={generating}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-green-600" />
            </div>
          ) : batchResults ? (
            // Mostra risultati della generazione batch
            <div className="space-y-4">
              {batchResults.success > 0 && (
                <Alert className="border-green-200 bg-green-50">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-800">
                    {batchResults.success === batchResults.total
                      ? `Tutti i ${batchResults.total} attestati sono stati generati con successo!`
                      : `${batchResults.success} attestati generati su ${batchResults.total}`}
                  </AlertDescription>
                </Alert>
              )}

              {batchResults.failed > 0 && (
                <Alert variant="destructive">
                  <XCircle className="h-4 w-4" />
                  <AlertDescription>
                    {batchResults.failed} attestati non sono stati generati
                  </AlertDescription>
                </Alert>
              )}

              <div className="rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Partecipante</TableHead>
                      <TableHead>Stato</TableHead>
                      <TableHead className="text-right">Azioni</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {batchResults.results.map((result, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          {result.personName || 'Sconosciuto'}
                        </TableCell>
                        <TableCell>
                          {result.success ? (
                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              Generato
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                              <XCircle className="h-3 w-3 mr-1" />
                              Errore
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {result.success && result.downloadUrl && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => attestatiService.download(result.attestatoId!)}
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                          )}
                          {!result.success && result.error && (
                            <span className="text-xs text-red-600">{result.error}</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          ) : (
            // Form di generazione
            <div className="space-y-6">
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {/* Selezione template - Native select for reliable auto-selection */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                  Template
                </label>
                <select
                  id="template"
                  value={selectedTemplateId}
                  onChange={(e) => setSelectedTemplateId(e.target.value)}
                  disabled={generating || loadingTemplates}
                  className="w-full px-3 py-2 border dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 dark:bg-gray-800 dark:text-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loadingTemplates ? (
                    <option value="">Caricamento template...</option>
                  ) : templates.length === 0 ? (
                    <option value="">Nessun template disponibile</option>
                  ) : (
                    <>
                      {!selectedTemplateId && (
                        <option value="" disabled>Seleziona un template</option>
                      )}
                      {templates.map((template) => (
                        <option key={template.id} value={template.id}>
                          {template.name} {template.isDefault && '(Default)'} - v{template.version}
                        </option>
                      ))}
                    </>
                  )}
                </select>
                {templates.length === 0 && !loadingTemplates && (
                  <p className="text-sm text-amber-600 dark:text-amber-400">
                    ⚠️ Nessun template di tipo CERTIFICATE disponibile.
                  </p>
                )}
              </div>

              {/* Opzioni */}
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="sendEmail"
                    checked={sendEmail}
                    onCheckedChange={(checked) => setSendEmail(checked as boolean)}
                    disabled={generating}
                  />
                  <Label htmlFor="sendEmail" className="cursor-pointer">
                    Invia via email automaticamente
                  </Label>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="validityYears">
                    Anni di validità
                    {schedule.course.validityYears && (
                      <span className="text-sm text-muted-foreground ml-2">
                        (default: {schedule.course.validityYears} anni)
                      </span>
                    )}
                  </Label>
                  <Input
                    id="validityYears"
                    type="number"
                    min="1"
                    max="99"
                    value={validityYears}
                    onChange={(e) => setValidityYears(e.target.value)}
                    placeholder={
                      schedule.course.validityYears
                        ? `${schedule.course.validityYears}`
                        : 'Opzionale'
                    }
                    disabled={generating}
                  />
                </div>
              </div>

              {/* Lista partecipanti */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>
                    Partecipanti
                    <span className="text-sm text-muted-foreground ml-2">
                      ({selectedPersonIds.size}/{availableParticipants.length} selezionati)
                    </span>
                  </Label>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleSelectAll}
                      disabled={generating || availableParticipants.length === 0}
                    >
                      Seleziona tutti
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleDeselectAll}
                      disabled={generating || selectedPersonIds.size === 0}
                    >
                      Deseleziona tutti
                    </Button>
                  </div>
                </div>

                <div className="rounded-lg border max-h-64 overflow-y-auto">
                  <div className="divide-y">
                    {allParticipants.length === 0 ? (
                      <div className="p-4 text-center text-sm text-muted-foreground">
                        Nessun partecipante iscritto al corso
                      </div>
                    ) : availableParticipants.length === 0 ? (
                      <div className="p-4 text-center text-sm text-muted-foreground">
                        Tutti i partecipanti hanno già ricevuto un attestato
                      </div>
                    ) : (
                      allParticipants.map((person) => {
                        const hasExisting = existingCertificates.has(person.id);
                        const isSelected = selectedPersonIds.has(person.id);

                        return (
                          <div
                            key={person.id}
                            className={`flex items-center space-x-3 p-3 ${hasExisting ? 'bg-muted/50' : ''
                              }`}
                          >
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={() => handleToggleSelect(person.id)}
                              disabled={generating || hasExisting}
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium truncate">
                                  {person.firstName} {person.lastName}
                                </span>
                                {hasExisting && (
                                  <Badge variant="secondary" className="text-xs">
                                    Già generato
                                  </Badge>
                                )}
                              </div>
                              <span className="text-xs text-muted-foreground">
                                CF: {person.cf}
                              </span>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>

              {/* Progress bar durante generazione */}
              {generating && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">
                      Generazione in corso...
                    </span>
                    <span className="font-medium">{progress}%</span>
                  </div>
                  <Progress value={progress} />
                </div>
              )}
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
          {batchResults ? (
            <button
              onClick={handleClose}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
            >
              Chiudi
            </button>
          ) : (
            <>
              <button
                onClick={handleClose}
                disabled={generating}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50"
              >
                Annulla
              </button>
              <button
                onClick={handleGenerate}
                disabled={!canGenerate}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {generating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Generazione...
                  </>
                ) : (
                  <>
                    <Award className="h-4 w-4" />
                    Genera {selectedPersonIds.size} attestati
                  </>
                )}
              </button>
            </>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
