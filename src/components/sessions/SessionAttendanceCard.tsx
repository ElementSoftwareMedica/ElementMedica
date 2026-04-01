/**
 * Session Attendance Card Component
 * 
 * Card per visualizzare e gestire i registri presenze
 * di una sessione di corso
 */

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, Download, Trash2, RefreshCw, Plus, Users, Clock } from 'lucide-react';
import registriPresenzeService, { type RegistroPresenze } from '@/services/registriPresenzeService';
import { useConfirmDialog } from '../../contexts/ConfirmDialogContext';
import { useToast } from '../../hooks/useToast';
import GenerateAttendanceDialog from './GenerateAttendanceDialog';

interface Participant {
  id: string;
  firstName: string;
  lastName: string;
  cf?: string;
}

interface CourseSession {
  id: string;
  date: string;
  start: string;
  end: string;
  trainerId?: string;
}

interface SessionAttendanceCardProps {
  session: CourseSession;
  participants: Participant[];
}

export default function SessionAttendanceCard({
  session,
  participants
}: SessionAttendanceCardProps) {
  const [registri, setRegistri] = useState<RegistroPresenze[]>([]);
  const [loading, setLoading] = useState(true);
  const [generateDialogOpen, setGenerateDialogOpen] = useState(false);
  const { confirmDelete } = useConfirmDialog();
  const { showToast } = useToast();

  useEffect(() => {
    loadRegistri();
  }, [session.id]);

  const loadRegistri = async () => {
    try {
      setLoading(true);
      const result = await registriPresenzeService.list({ sessionId: session.id });
      setRegistri(result);
    } catch (error) {
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    const confirmed = await confirmDelete('Sei sicuro di voler eliminare questo registro?');
    if (!confirmed) return;

    try {
      await registriPresenzeService.delete(id);
      await loadRegistri();
    } catch (error) {
      showToast({ message: 'Errore durante l\'eliminazione del registro', type: 'error' });
    }
  };

  const handleDownload = async (id: string) => {
    try {
      await registriPresenzeService.download(id);
    } catch (error) {
      showToast({ message: 'Errore durante il download del registro', type: 'error' });
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const formatDateTime = (date: string) => {
    return new Date(date).toLocaleString('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getPresentCount = (registro: RegistroPresenze) => {
    if (!registro.presenti) return 0;
    return registro.presenti.filter(p => p.presente).length;
  };

  const getTotalHours = (registro: RegistroPresenze) => {
    if (!registro.presenti) return 0;
    return registro.presenti.reduce((sum, p) => sum + (p.ore || 0), 0);
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="flex items-center gap-2 text-base">
            <FileText className="w-5 h-5" />
            Registri Presenze
            <span className="text-sm text-muted-foreground font-normal">
              {formatDate(session.date)} | {session.start} - {session.end}
            </span>
          </CardTitle>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={loadRegistri}
              disabled={loading}
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
            <Button
              size="sm"
              onClick={() => setGenerateDialogOpen(true)}
              disabled={!session.trainerId}
            >
              <Plus className="w-4 h-4 mr-2" />
              Genera Registro
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">
              Caricamento...
            </div>
          ) : registri.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>Nessun registro generato</p>
              <p className="text-sm mt-1">
                Clicca su "Genera Registro" per creare il registro presenze
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {registri.map(registro => {
                const presentCount = getPresentCount(registro);
                const totalParticipants = registro.presenti?.length || 0;
                const totalHours = getTotalHours(registro);

                return (
                  <div
                    key={registro.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                        <span className="font-medium truncate">
                          Registro N° {registro.numeroProgressivo}/{registro.annoProgressivo}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          <span>{presentCount}/{totalParticipants} presenti</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span>{totalHours}h totali</span>
                        </div>
                        <span>•</span>
                        <span>{formatDateTime(registro.dataGenerazione)}</span>
                        {registro.template && (
                          <>
                            <span>•</span>
                            <span className="truncate">
                              {registro.template.name} v{registro.templateVersion}
                            </span>
                          </>
                        )}
                      </div>
                      {registro.formatore && (
                        <div className="text-xs text-muted-foreground mt-1">
                          Formatore: {registro.formatore.firstName} {registro.formatore.lastName}
                        </div>
                      )}
                    </div>
                    <div className="flex gap-1 ml-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDownload(registro.id)}
                        title="Scarica PDF"
                      >
                        <Download className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(registro.id)}
                        title="Elimina"
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {session.trainerId && (
        <GenerateAttendanceDialog
          open={generateDialogOpen}
          onOpenChange={setGenerateDialogOpen}
          sessionId={session.id}
          formatoreId={session.trainerId}
          participants={participants}
          onSuccess={loadRegistri}
        />
      )}
    </>
  );
}
