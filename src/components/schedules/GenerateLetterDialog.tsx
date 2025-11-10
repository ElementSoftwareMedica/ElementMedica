/**
 * Generate Letter Dialog Component
 * 
 * Dialog per generare lettere di incarico da template
 * Utilizzato nella gestione delle schedule
 */

import React, { useState, useEffect } from 'react';
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
}

interface GenerateLetterDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  scheduleId: string;
  trainers: Trainer[];
  onSuccess?: () => void;
}

export default function GenerateLetterDialog({
  open,
  onOpenChange,
  scheduleId,
  trainers,
  onSuccess
}: GenerateLetterDialogProps) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [selectedTrainers, setSelectedTrainers] = useState<Set<string>>(new Set());
  const [sendEmail, setSendEmail] = useState(false);
  const [customEmails, setCustomEmails] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [generatedLetters, setGeneratedLetters] = useState<Array<{ trainerId: string; downloadUrl: string }>>([]);

  // Carica i template disponibili
  useEffect(() => {
    if (open) {
      loadTemplates();
      // Reset state quando si apre il dialog
      setSelectedTrainers(new Set());
      setSendEmail(false);
      setCustomEmails({});
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
      console.error('Failed to load templates:', err);
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
        // Rimuovi anche l'email personalizzata
        setCustomEmails(emails => {
          const { [trainerId]: _, ...rest } = emails;
          return rest;
        });
      } else {
        newSet.add(trainerId);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    if (selectedTrainers.size === trainers.length) {
      setSelectedTrainers(new Set());
      setCustomEmails({});
    } else {
      setSelectedTrainers(new Set(trainers.map(t => t.id)));
    }
  };

  const handleEmailChange = (trainerId: string, email: string) => {
    setCustomEmails(prev => ({ ...prev, [trainerId]: email }));
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

        const params: GenerateLetteraParams = {
          scheduleId,
          trainerId,
          templateId: selectedTemplateId,
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
    } catch (err: any) {
      console.error('Failed to generate letters:', err);
      setError(err.response?.data?.message || 'Errore durante la generazione delle lettere');
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

          {/* Trainer Selection */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Formatori</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleSelectAll}
              >
                {selectedTrainers.size === trainers.length ? 'Deseleziona tutti' : 'Seleziona tutti'}
              </Button>
            </div>
            <div className="border rounded-lg p-4 space-y-3 max-h-64 overflow-y-auto">
              {trainers.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Nessun formatore associato a questa schedule
                </p>
              ) : (
                trainers.map(trainer => (
                  <div key={trainer.id} className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id={`trainer-${trainer.id}`}
                        checked={selectedTrainers.has(trainer.id)}
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
                    
                    {/* Email personalizzata se sendEmail è abilitato */}
                    {sendEmail && selectedTrainers.has(trainer.id) && (
                      <div className="ml-6">
                        <Input
                          type="email"
                          placeholder={trainer.email || 'Email personalizzata'}
                          value={customEmails[trainer.id] || trainer.email || ''}
                          onChange={(e) => handleEmailChange(trainer.id, e.target.value)}
                          className="text-sm"
                        />
                      </div>
                    )}
                  </div>
                ))
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
