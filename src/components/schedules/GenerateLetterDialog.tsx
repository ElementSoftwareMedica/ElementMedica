/**
 * Generate Letter Dialog Component
 * 
 * Dialog per generare lettere di incarico da template
 * Utilizzato nella gestione delle schedule
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { FileText, AlertCircle, CheckCircle, Download, Mail } from 'lucide-react';
import lettereIncaricoService, { type GenerateLetteraParams } from '@/services/lettereIncaricoService';
import templateService from '@/services/templateService';
import type { Template } from '@/types/templates';

interface Trainer {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  hourlyRate?: number; // Tariffa oraria dal database
}

interface TrainerSession {
  trainerId: string;
  duration: number; // Ore
}

interface TrainerCompensation {
  hourlyRate: number;
  expenses: number;
  totalHours: number;
}

interface GenerateLetterDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  scheduleId: string;
  trainers: Trainer[];
  /** Sessioni con durata e formatore per calcolare le ore */
  sessions?: TrainerSession[];
  onSuccess?: () => void;
}

export default function GenerateLetterDialog({
  open,
  onOpenChange,
  scheduleId,
  trainers,
  sessions = [],
  onSuccess
}: GenerateLetterDialogProps) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [selectedTrainers, setSelectedTrainers] = useState<Set<string>>(new Set());
  const [sendEmail, setSendEmail] = useState(false);
  const [customEmails, setCustomEmails] = useState<Record<string, string>>({});
  /** Compensi per ogni formatore: { trainerId: { hourlyRate, expenses, totalHours } } */
  const [trainerCompensations, setTrainerCompensations] = useState<Record<string, TrainerCompensation>>({});
  const [loading, setLoading] = useState(false);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [generatedLetters, setGeneratedLetters] = useState<Array<{ trainerId: string; downloadUrl: string }>>([]);

  // Calcola le ore per ogni formatore dalle sessioni
  const calculateTrainerHours = useCallback((trainerId: string): number => {
    return sessions
      .filter(s => s.trainerId === trainerId)
      .reduce((sum, s) => sum + (s.duration || 0), 0);
  }, [sessions]);

  // Inizializza i compensi quando si seleziona un formatore
  const initializeCompensation = useCallback((trainerId: string) => {
    const trainer = trainers.find(t => t.id === trainerId);
    const totalHours = calculateTrainerHours(trainerId);

    setTrainerCompensations(prev => ({
      ...prev,
      [trainerId]: {
        hourlyRate: trainer?.hourlyRate || 0,
        expenses: 0,
        totalHours
      }
    }));
  }, [trainers, calculateTrainerHours]);

  // Carica i template disponibili
  useEffect(() => {
    if (open) {
      loadTemplates();
      // Reset state quando si apre il dialog
      setSelectedTrainers(new Set());
      setSendEmail(false);
      setCustomEmails({});
      setTrainerCompensations({});
      setError(null);
      setSuccess(false);
      setGeneratedLetters([]);
    }
  }, [open]);

  const loadTemplates = async () => {
    try {
      setLoadingTemplates(true);
      const result = await templateService.list({
        type: 'LETTER_OF_ENGAGEMENT',
        isActive: true
      });
      setTemplates(result.data);

      // Seleziona automaticamente il template di default
      const defaultTemplate = result.data.find((t: Template) => t.isDefault);
      if (defaultTemplate) {
        setSelectedTemplateId(defaultTemplate.id);
      }
    } catch (err) {
      setError('Impossibile caricare i template disponibili');
    } finally {
      setLoadingTemplates(false);
    }
  };

  const handleTrainerToggle = (trainerId: string) => {
    setSelectedTrainers(prev => {
      const newSet = new Set(prev);
      if (newSet.has(trainerId)) {
        newSet.delete(trainerId);
        // Rimuovi anche l'email personalizzata e i compensi
        setCustomEmails(emails => {
          const { [trainerId]: _, ...rest } = emails;
          return rest;
        });
        setTrainerCompensations(comp => {
          const { [trainerId]: _, ...rest } = comp;
          return rest;
        });
      } else {
        newSet.add(trainerId);
        // Inizializza i compensi per questo formatore
        initializeCompensation(trainerId);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    if (selectedTrainers.size === trainers.length) {
      setSelectedTrainers(new Set());
      setCustomEmails({});
      setTrainerCompensations({});
    } else {
      const allTrainerIds = trainers.map(t => t.id);
      setSelectedTrainers(new Set(allTrainerIds));
      // Inizializza i compensi per tutti
      allTrainerIds.forEach(id => initializeCompensation(id));
    }
  };

  const handleEmailChange = (trainerId: string, email: string) => {
    setCustomEmails(prev => ({ ...prev, [trainerId]: email }));
  };

  const handleCompensationChange = (trainerId: string, field: 'hourlyRate' | 'expenses', value: number) => {
    setTrainerCompensations(prev => ({
      ...prev,
      [trainerId]: {
        ...prev[trainerId],
        [field]: value
      }
    }));
  };

  // Calcola il compenso totale per un formatore
  const calculateTotalCompensation = (trainerId: string): number => {
    const comp = trainerCompensations[trainerId];
    if (!comp) return 0;
    return (comp.hourlyRate * comp.totalHours) + comp.expenses;
  };

  const handleGenerate = async () => {
    if (selectedTrainers.size === 0) {
      setError('Seleziona almeno un formatore');
      return;
    }

    if (!selectedTemplateId) {
      setError('Seleziona un template');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const letters: Array<{ trainerId: string; downloadUrl: string }> = [];

      // Genera le lettere una per volta
      for (const trainerId of Array.from(selectedTrainers)) {
        const trainer = trainers.find(t => t.id === trainerId);
        if (!trainer) continue;

        const compensation = trainerCompensations[trainerId];

        const params: GenerateLetteraParams = {
          scheduleId,
          trainerId,
          templateId: selectedTemplateId,
          hourlyRate: compensation?.hourlyRate,
          expenses: compensation?.expenses,
          sendEmail,
          email: sendEmail ? (customEmails[trainerId] || trainer.email) : undefined
        };

        const result = await lettereIncaricoService.generate(params);
        letters.push({
          trainerId,
          downloadUrl: result.downloadUrl
        });
      }

      setGeneratedLetters(letters);
      setSuccess(true);

      // Chiama callback di successo dopo un breve delay
      setTimeout(() => {
        onSuccess?.();
        onOpenChange(false);
      }, 2000);
    } catch {
      setError('Errore durante la generazione delle lettere. Verifica template e dati dei formatori, poi riprova.');
    } finally {
      setLoading(false);
    }
  };

  const getTrainerName = (trainerId: string) => {
    const trainer = trainers.find(t => t.id === trainerId);
    return trainer ? `${trainer.firstName} ${trainer.lastName}` : 'Sconosciuto';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Genera Lettere di Incarico
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Template Selection */}
          <div className="space-y-2">
            <Label htmlFor="template">Template</Label>
            <Select
              value={selectedTemplateId}
              onValueChange={setSelectedTemplateId}
            >
              <SelectTrigger id="template">
                <SelectValue placeholder={loadingTemplates ? 'Caricamento...' : 'Seleziona template'} />
              </SelectTrigger>
              <SelectContent>
                {templates.map(template => (
                  <SelectItem key={template.id} value={template.id}>
                    {template.name} {template.isDefault && '(Default)'} - v{template.version}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Trainer Selection with Compensation */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Formatori e Compensi</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleSelectAll}
              >
                {selectedTrainers.size === trainers.length ? 'Deseleziona tutti' : 'Seleziona tutti'}
              </Button>
            </div>
            <div className="border rounded-lg p-4 space-y-4 max-h-[400px] overflow-y-auto">
              {trainers.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Nessun formatore associato a questa schedule
                </p>
              ) : (
                trainers.map(trainer => {
                  const isSelected = selectedTrainers.has(trainer.id);
                  const compensation = trainerCompensations[trainer.id];
                  const totalComp = calculateTotalCompensation(trainer.id);

                  return (
                    <div
                      key={trainer.id}
                      className={`rounded-lg border p-3 transition-colors ${isSelected ? 'border-blue-300 dark:border-blue-600 bg-blue-50/50 dark:bg-blue-900/30' : 'border-gray-200 dark:border-gray-700'}`}
                    >
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id={`trainer-${trainer.id}`}
                          checked={isSelected}
                          onCheckedChange={() => handleTrainerToggle(trainer.id)}
                        />
                        <label
                          htmlFor={`trainer-${trainer.id}`}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex-1 cursor-pointer"
                        >
                          {trainer.firstName} {trainer.lastName}
                          {trainer.email && (
                            <span className="text-muted-foreground ml-2">({trainer.email})</span>
                          )}
                        </label>
                      </div>

                      {/* Compensation fields when selected */}
                      {isSelected && compensation && (
                        <div className="mt-3 ml-6 space-y-3 pt-3 border-t border-gray-100 dark:border-gray-700">
                          {/* Ore totali (read-only) */}
                          <div className="flex items-center gap-4">
                            <div className="flex-1">
                              <Label className="text-xs text-gray-500 dark:text-gray-400">Ore totali</Label>
                              <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mt-1">
                                {compensation.totalHours} h
                              </div>
                            </div>
                          </div>

                          {/* Tariffa oraria e Spese */}
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <Label className="text-xs text-gray-500 dark:text-gray-400">Tariffa oraria (€/h)</Label>
                              <Input
                                type="number"
                                step="0.01"
                                min="0"
                                value={compensation.hourlyRate || ''}
                                onChange={(e) => handleCompensationChange(trainer.id, 'hourlyRate', parseFloat(e.target.value) || 0)}
                                className="text-sm mt-1"
                                placeholder="0.00"
                              />
                            </div>
                            <div>
                              <Label className="text-xs text-gray-500 dark:text-gray-400">Rimborso spese (€)</Label>
                              <Input
                                type="number"
                                step="0.01"
                                min="0"
                                value={compensation.expenses || ''}
                                onChange={(e) => handleCompensationChange(trainer.id, 'expenses', parseFloat(e.target.value) || 0)}
                                className="text-sm mt-1"
                                placeholder="0.00"
                              />
                            </div>
                          </div>

                          {/* Totale calcolato */}
                          <div className="flex items-center justify-between bg-gray-50 dark:bg-gray-800 rounded p-2">
                            <span className="text-xs text-gray-500 dark:text-gray-400">Compenso totale:</span>
                            <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">
                              € {totalComp.toFixed(2).replace('.', ',')}
                            </span>
                          </div>

                          {/* Email personalizzata se sendEmail è abilitato */}
                          {sendEmail && (
                            <div>
                              <Label className="text-xs text-gray-500 dark:text-gray-400">Email</Label>
                              <Input
                                type="email"
                                placeholder={trainer.email || 'Email personalizzata'}
                                value={customEmails[trainer.id] || trainer.email || ''}
                                onChange={(e) => handleEmailChange(trainer.id, e.target.value)}
                                className="text-sm mt-1"
                              />
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Email Option */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="send-email"
              checked={sendEmail}
              onCheckedChange={(checked: boolean) => setSendEmail(checked)}
            />
            <label
              htmlFor="send-email"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer flex items-center gap-2"
            >
              <Mail className="w-4 h-4" />
              Invia via email ai formatori
            </label>
          </div>

          {/* Error Message */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Success Message */}
          {success && (
            <Alert className="border-green-500 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                <div className="space-y-2">
                  <p className="font-medium">Lettere generate con successo!</p>
                  {generatedLetters.length > 0 && (
                    <div className="space-y-1 mt-2">
                      {generatedLetters.map(({ trainerId, downloadUrl }) => (
                        <div key={trainerId} className="flex items-center gap-2 text-sm">
                          <CheckCircle className="w-3 h-3" />
                          <span>{getTrainerName(trainerId)}</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => window.open(downloadUrl, '_blank')}
                            className="h-6 px-2"
                          >
                            <Download className="w-3 h-3 mr-1" />
                            Scarica
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Annulla
          </Button>
          <Button
            onClick={handleGenerate}
            disabled={loading || selectedTrainers.size === 0 || !selectedTemplateId || success}
          >
            {loading ? 'Generazione in corso...' : 'Genera Lettere'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
