/**
 * Schedule Letters Card Component
 * 
 * Card per visualizzare e gestire le lettere di incarico
 * associate a una schedule
 */

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, Download, Trash2, RefreshCw, Plus } from 'lucide-react';
import lettereIncaricoService, { type LetteraIncarico } from '@/services/lettereIncaricoService';
import { useConfirmDialog } from '../../contexts/ConfirmDialogContext';
import { useToast } from '../../hooks/useToast';
import GenerateLetterDialog from './GenerateLetterDialog';

interface Trainer {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  hourlyRate?: number;
}

interface Session {
  id: string;
  trainerId: string;
  duration: number;
}

interface ScheduleLettersCardProps {
  scheduleId: string;
  trainers: Trainer[];
  sessions?: Session[];
}

export default function ScheduleLettersCard({
  scheduleId,
  trainers,
  sessions = []
}: ScheduleLettersCardProps) {
  const [letters, setLetters] = useState<LetteraIncarico[]>([]);
  const [loading, setLoading] = useState(true);
  const [generateDialogOpen, setGenerateDialogOpen] = useState(false);
  const { confirmDelete } = useConfirmDialog();
  const { showToast } = useToast();

  useEffect(() => {
    loadLetters();
  }, [scheduleId]);

  const loadLetters = async () => {
    try {
      setLoading(true);
      const result = await lettereIncaricoService.list({ scheduleId });
      setLetters(result);
    } catch (error) {
      console.error('Failed to load letters:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    const confirmed = await confirmDelete('Sei sicuro di voler eliminare questa lettera?');
    if (!confirmed) return;

    try {
      await lettereIncaricoService.delete(id);
      await loadLetters();
    } catch (error) {
      console.error('Failed to delete letter:', error);
      showToast({ message: 'Errore durante l\'eliminazione della lettera', type: 'error' });
    }
  };

  const handleDownload = async (id: string) => {
    try {
      await lettereIncaricoService.download(id);
    } catch (error) {
      console.error('Failed to download letter:', error);
      showToast({ message: 'Errore durante il download della lettera', type: 'error' });
    }
  };

  const getTrainerName = (trainerId: string) => {
    const trainer = trainers.find(t => t.id === trainerId);
    return trainer ? `${trainer.firstName} ${trainer.lastName}` : 'Sconosciuto';
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Lettere di Incarico
          </CardTitle>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={loadLetters}
              disabled={loading}
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
            <Button
              size="sm"
              onClick={() => setGenerateDialogOpen(true)}
            >
              <Plus className="w-4 h-4 mr-2" />
              Genera Lettere
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">
              Caricamento...
            </div>
          ) : letters.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>Nessuna lettera generata</p>
              <p className="text-sm mt-1">
                Clicca su "Genera Lettere" per creare le lettere di incarico
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {letters.map(letter => (
                <div
                  key={letter.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                      <span className="font-medium truncate">
                        {getTrainerName(letter.trainerId)}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                      <span>N° {letter.numeroProgressivo}/{letter.annoProgressivo}</span>
                      <span>•</span>
                      <span>{formatDate(letter.dataGenerazione)}</span>
                      {letter.template && (
                        <>
                          <span>•</span>
                          <span className="truncate">
                            {letter.template.name} v{letter.templateVersion}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1 ml-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDownload(letter.id)}
                      title="Scarica PDF"
                    >
                      <Download className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(letter.id)}
                      title="Elimina"
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <GenerateLetterDialog
        open={generateDialogOpen}
        onOpenChange={setGenerateDialogOpen}
        scheduleId={scheduleId}
        trainers={trainers}
        sessions={sessions}
        onSuccess={loadLetters}
      />
    </>
  );
}
