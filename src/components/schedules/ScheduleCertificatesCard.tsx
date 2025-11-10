/**
 * ScheduleCertificatesCard Component
 * 
 * Card per visualizzare e gestire gli attestati di un corso programmato.
 * Include lista attestati, statistiche, azioni singole e bulk.
 */

import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Archive,
  Download,
  FileText,
  Loader2,
  Mail,
  Plus,
  RefreshCw,
  Trash2,
} from 'lucide-react';
import attestatiService, { type Attestato } from '@/services/attestatiService';
import { GenerateCertificatesDialog } from './GenerateCertificatesDialog';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';

interface Person {
  id: string;
  firstName: string;
  lastName: string;
  cf: string;
}

interface ScheduleCertificatesCardProps {
  schedule: {
    id: string;
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
}

export function ScheduleCertificatesCard({ schedule }: ScheduleCertificatesCardProps) {
  const [attestati, setAttestati] = useState<Attestato[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [generateDialogOpen, setGenerateDialogOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [attestatoToDelete, setAttestatoToDelete] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadAttestati();
  }, [schedule.id]);

  const loadAttestati = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await attestatiService.list({ scheduleId: schedule.id });
      setAttestati(data);
    } catch (err: any) {
      console.error('Error loading attestati:', err);
      setError('Errore nel caricamento degli attestati');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    loadAttestati();
  };

  const handleSelectAll = () => {
    setSelectedIds(new Set(attestati.map((a) => a.id)));
  };

  const handleDeselectAll = () => {
    setSelectedIds(new Set());
  };

  const handleToggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const handleDelete = async (id: string) => {
    try {
      await attestatiService.delete(id);
      await loadAttestati();
      setSelectedIds(new Set());
    } catch (err: any) {
      console.error('Error deleting attestato:', err);
      setError('Errore durante l\'eliminazione dell\'attestato');
    }
  };

  const handleBulkDelete = async () => {
    try {
      const ids = Array.from(selectedIds);
      await attestatiService.deleteMultipleAttestati(ids);
      await loadAttestati();
      setSelectedIds(new Set());
      setDeleteConfirmOpen(false);
    } catch (err: any) {
      console.error('Error deleting multiple attestati:', err);
      setError('Errore durante l\'eliminazione degli attestati');
    }
  };

  const handleDownloadZip = async () => {
    try {
      const ids = Array.from(selectedIds);
      await attestatiService.downloadZipBatch(ids);
    } catch (err: any) {
      console.error('Error downloading ZIP:', err);
      setError('Errore durante il download dello ZIP');
    }
  };

  const handleGenerateSuccess = () => {
    loadAttestati();
    setGenerateDialogOpen(false);
  };

  const formatProgressiveNumber = (attestato: Attestato): string => {
    return `N° ${attestato.numeroProgressivo}/${attestato.annoProgressivo}`;
  };

  const getYearStats = (attestati: Attestato[]): Record<number, number> => {
    return attestati.reduce((acc, a) => {
      const year = a.annoProgressivo;
      acc[year] = (acc[year] || 0) + 1;
      return acc;
    }, {} as Record<number, number>);
  };

  const yearStats = getYearStats(attestati);
  const statsText = Object.entries(yearStats)
    .map(([year, count]) => `${count} nel ${year}`)
    .join(', ');

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Attestati
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Attestati
              </CardTitle>
              {attestati.length > 0 && (
                <CardDescription className="mt-1">
                  {attestati.length} attestati generati
                  {statsText && ` (${statsText})`}
                </CardDescription>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={loading}
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
              <Button
                size="sm"
                onClick={() => setGenerateDialogOpen(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Genera Attestati
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {selectedIds.size > 0 && (
            <div className="flex items-center justify-between bg-muted p-3 rounded-lg mb-4">
              <span className="text-sm font-medium">
                {selectedIds.size} attestati selezionati
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDownloadZip}
                >
                  <Archive className="h-4 w-4 mr-2" />
                  Scarica ZIP
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setDeleteConfirmOpen(true)}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Elimina
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDeselectAll}
                >
                  Deseleziona
                </Button>
              </div>
            </div>
          )}

          {attestati.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <FileText className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">
                Nessun attestato generato
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                Clicca su "Genera Attestati" per iniziare
              </p>
              <Button onClick={() => setGenerateDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Genera Attestati
              </Button>
            </div>
          ) : (
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox
                        checked={
                          attestati.length > 0 &&
                          selectedIds.size === attestati.length
                        }
                        onCheckedChange={(checked) => {
                          if (checked) {
                            handleSelectAll();
                          } else {
                            handleDeselectAll();
                          }
                        }}
                      />
                    </TableHead>
                    <TableHead>Partecipante</TableHead>
                    <TableHead>Numero</TableHead>
                    <TableHead>Data Generazione</TableHead>
                    <TableHead>Template</TableHead>
                    <TableHead className="text-right">Azioni</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {attestati.map((attestato) => (
                    <TableRow key={attestato.id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedIds.has(attestato.id)}
                          onCheckedChange={() => handleToggleSelect(attestato.id)}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">
                            {attestato.person?.firstName}{' '}
                            {attestato.person?.lastName}
                          </span>
                          {attestato.person?.cf && (
                            <span className="text-xs text-muted-foreground">
                              CF: {attestato.person.cf}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {formatProgressiveNumber(attestato)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {attestato.generatedAt
                          ? format(new Date(attestato.generatedAt), 'dd/MM/yyyy HH:mm', {
                              locale: it,
                            })
                          : '-'}
                      </TableCell>
                      <TableCell>
                        {attestato.template ? (
                          <span className="text-sm">
                            {attestato.template.name}{' '}
                            <span className="text-muted-foreground">
                              v{attestato.template.version}
                            </span>
                          </span>
                        ) : (
                          <span className="text-sm text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => attestatiService.download(attestato.id)}
                            title="Scarica PDF"
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setAttestatoToDelete(attestato.id);
                              setDeleteConfirmOpen(true);
                            }}
                            title="Elimina"
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog per generazione attestati */}
      <GenerateCertificatesDialog
        open={generateDialogOpen}
        onOpenChange={setGenerateDialogOpen}
        schedule={schedule}
        onSuccess={handleGenerateSuccess}
      />

      {/* Conferma eliminazione */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Conferma eliminazione</AlertDialogTitle>
            <AlertDialogDescription>
              {attestatoToDelete
                ? 'Sei sicuro di voler eliminare questo attestato? Questa azione non può essere annullata.'
                : `Sei sicuro di voler eliminare ${selectedIds.size} attestati? Questa azione non può essere annullata.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                setAttestatoToDelete(null);
              }}
            >
              Annulla
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (attestatoToDelete) {
                  handleDelete(attestatoToDelete);
                  setAttestatoToDelete(null);
                } else {
                  handleBulkDelete();
                }
                setDeleteConfirmOpen(false);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Elimina
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
