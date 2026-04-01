/**
 * Generate Attendance Register Dialog Component
 * 
 * Dialog per generare registri presenze da template
 * Utilizzato nella gestione delle sessioni di corso
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
import { FileText, AlertCircle, CheckCircle, Download, User } from 'lucide-react';
import registriPresenzeService, { type GenerateRegistroParams, type AttendanceData } from '@/services/registriPresenzeService';
import templateService from '@/services/templateService';
import type { Template } from '@/types/templates';

interface Participant {
  id: string;
  firstName: string;
  lastName: string;
  cf?: string;
}

interface GenerateAttendanceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sessionId: string;
  formatoreId: string;
  participants: Participant[];
  onSuccess?: () => void;
}

export default function GenerateAttendanceDialog({
  open,
  onOpenChange,
  sessionId,
  formatoreId,
  participants,
  onSuccess
}: GenerateAttendanceDialogProps) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [attendanceData, setAttendanceData] = useState<Map<string, AttendanceData>>(new Map());
  const [loading, setLoading] = useState(false);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);

  // Carica i template disponibili
  useEffect(() => {
    if (open) {
      loadTemplates();
      // Reset state quando si apre il dialog
      initializeAttendanceData();
      setError(null);
      setSuccess(false);
      setDownloadUrl(null);
    }
  }, [open, participants]);

  const loadTemplates = async () => {
    try {
      setLoadingTemplates(true);
      const result = await templateService.list({
        type: 'ATTENDANCE_REGISTER',
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

  const initializeAttendanceData = () => {
    const initialData = new Map<string, AttendanceData>();
    participants.forEach(p => {
      initialData.set(p.id, {
        personId: p.id,
        present: true, // Default tutti presenti
        hours: 0
      });
    });
    setAttendanceData(initialData);
  };

  const handlePresentToggle = (personId: string) => {
    setAttendanceData(prev => {
      const newData = new Map(prev);
      const current = newData.get(personId);
      if (current) {
        newData.set(personId, { ...current, present: !current.present });
      }
      return newData;
    });
  };

  const handleHoursChange = (personId: string, hours: string) => {
    const numHours = parseFloat(hours) || 0;
    setAttendanceData(prev => {
      const newData = new Map(prev);
      const current = newData.get(personId);
      if (current) {
        newData.set(personId, { ...current, hours: numHours });
      }
      return newData;
    });
  };

  const handleSelectAll = () => {
    const allPresent = Array.from(attendanceData.values()).every(d => d.present);
    setAttendanceData(prev => {
      const newData = new Map(prev);
      participants.forEach(p => {
        const current = newData.get(p.id);
        if (current) {
          newData.set(p.id, { ...current, present: !allPresent });
        }
      });
      return newData;
    });
  };

  const handleGenerate = async () => {
    if (!selectedTemplateId) {
      setError('Seleziona un template');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const params: GenerateRegistroParams = {
        sessionId,
        formatoreId,
        templateId: selectedTemplateId,
        attendanceData: Array.from(attendanceData.values())
      };

      const result = await registriPresenzeService.generate(params);

      setDownloadUrl(result.downloadUrl);
      setSuccess(true);

      // Chiama callback di successo dopo un breve delay
      setTimeout(() => {
        onSuccess?.();
        onOpenChange(false);
      }, 2000);
    } catch {
      setError('Errore durante la generazione del registro. Verifica template e presenze, poi riprova.');
    } finally {
      setLoading(false);
    }
  };

  const allPresent = Array.from(attendanceData.values()).every(d => d.present);
  const presentCount = Array.from(attendanceData.values()).filter(d => d.present).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Genera Registro Presenze
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

          {/* Participant Attendance */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Partecipanti ({presentCount}/{participants.length} presenti)</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleSelectAll}
              >
                {allPresent ? 'Deseleziona tutti' : 'Seleziona tutti'}
              </Button>
            </div>
            <div className="border rounded-lg max-h-96 overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted sticky top-0">
                  <tr>
                    <th className="p-2 text-left">Presente</th>
                    <th className="p-2 text-left">Partecipante</th>
                    <th className="p-2 text-left w-24">Ore</th>
                  </tr>
                </thead>
                <tbody>
                  {participants.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="p-4 text-center text-muted-foreground">
                        Nessun partecipante trovato
                      </td>
                    </tr>
                  ) : (
                    participants.map(participant => {
                      const data = attendanceData.get(participant.id);
                      return (
                        <tr key={participant.id} className="border-t hover:bg-muted/50">
                          <td className="p-2">
                            <Checkbox
                              checked={data?.present || false}
                              onCheckedChange={() => handlePresentToggle(participant.id)}
                            />
                          </td>
                          <td className="p-2">
                            <div className="flex items-center gap-2">
                              <User className="w-4 h-4 text-muted-foreground" />
                              <div>
                                <div className="font-medium">
                                  {participant.firstName} {participant.lastName}
                                </div>
                                {participant.cf && (
                                  <div className="text-xs text-muted-foreground font-mono">
                                    {participant.cf}
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="p-2">
                            <Input
                              type="number"
                              min="0"
                              max="24"
                              step="0.5"
                              value={data?.hours || 0}
                              onChange={(e) => handleHoursChange(participant.id, e.target.value)}
                              className="w-20"
                              disabled={!data?.present}
                            />
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Success Message */}
          {success && downloadUrl && (
            <Alert className="border-green-500 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                <div className="space-y-2">
                  <p className="font-medium">Registro generato con successo!</p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => window.open(downloadUrl, '_blank')}
                    className="h-8"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Scarica Registro
                  </Button>
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
            disabled={loading || !selectedTemplateId || participants.length === 0 || success}
          >
            {loading ? 'Generazione in corso...' : 'Genera Registro'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
