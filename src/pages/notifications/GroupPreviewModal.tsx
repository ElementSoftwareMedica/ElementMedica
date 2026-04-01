/**
 * GroupPreviewModal - Preview Membri Gruppo
 * 
 * Modale per visualizzare l'anteprima dei membri di un gruppo
 * e le statistiche di copertura canali.
 * 
 * PROGETTO 47 - Advanced Notification System - Fase 6
 */

import { useQuery } from '@tanstack/react-query';
import { Users, Mail, Phone, RefreshCw, Database, UserCheck, Tags } from 'lucide-react';
import { apiGet } from '@/services/api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

const API_BASE = '/api/v1/notifications/advanced';

// Types
interface NotificationGroup {
  id: string;
  name: string;
  description: string | null;
  type: 'STATIC' | 'DYNAMIC' | 'ROLE_BASED' | 'SEGMENT';
  isActive: boolean;
  memberCount: number;
}

interface PreviewMember {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
}

interface PreviewResponse {
  success: boolean;
  data: {
    total: number;
    preview: PreviewMember[];
    hasMore: boolean;
  };
}

interface StatsResponse {
  success: boolean;
  data: {
    groupId: string;
    groupName: string;
    type: string;
    totalMembers: number;
    withEmail: number;
    withPhone: number;
    emailCoverage: number;
    phoneCoverage: number;
  };
}

interface GroupPreviewModalProps {
  open: boolean;
  group: NotificationGroup;
  onClose: () => void;
}

// Group type labels
const GROUP_TYPE_LABELS: Record<string, string> = {
  STATIC: 'Statico',
  DYNAMIC: 'Dinamico',
  ROLE_BASED: 'Per Ruolo',
  SEGMENT: 'Segmento'
};

// Group type icons
const GROUP_TYPE_ICONS: Record<string, React.ReactNode> = {
  STATIC: <Users className="w-4 h-4" />,
  DYNAMIC: <Database className="w-4 h-4" />,
  ROLE_BASED: <UserCheck className="w-4 h-4" />,
  SEGMENT: <Tags className="w-4 h-4" />
};

// Group type colors
const GROUP_TYPE_COLORS: Record<string, string> = {
  STATIC: 'bg-blue-100 text-blue-800',
  DYNAMIC: 'bg-purple-100 text-purple-800',
  ROLE_BASED: 'bg-green-100 text-green-800',
  SEGMENT: 'bg-orange-100 text-orange-800'
};

export default function GroupPreviewModal({ open, group, onClose }: GroupPreviewModalProps) {
  // Fetch preview
  const { data: previewData, isLoading: previewLoading, refetch: refetchPreview } = useQuery<PreviewResponse>({
    queryKey: ['group-preview', group.id],
    queryFn: async () => apiGet(`${API_BASE}/groups/${group.id}/preview?limit=20`),
    enabled: open
  });

  // Fetch stats
  const { data: statsData, isLoading: statsLoading } = useQuery<StatsResponse>({
    queryKey: ['group-stats', group.id],
    queryFn: async () => apiGet(`${API_BASE}/groups/${group.id}/stats`),
    enabled: open
  });

  const preview = previewData?.data;
  const stats = statsData?.data;
  const isLoading = previewLoading || statsLoading;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <span>Anteprima Gruppo</span>
            <Badge className={GROUP_TYPE_COLORS[group.type]}>
              {GROUP_TYPE_ICONS[group.type]}
              <span className="ml-1">{GROUP_TYPE_LABELS[group.type]}</span>
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-6 py-4">
          {/* Group Info */}
          <div className="space-y-2">
            <h3 className="text-lg font-semibold">{group.name}</h3>
            {group.description && (
              <p className="text-muted-foreground">{group.description}</p>
            )}
            <Badge variant={group.isActive ? 'success' : 'secondary'}>
              {group.isActive ? 'Attivo' : 'Disattivo'}
            </Badge>
          </div>

          {/* Stats Cards */}
          {stats && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-blue-100">
                    <Users className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold">{stats.totalMembers}</div>
                    <div className="text-sm text-muted-foreground">Membri Totali</div>
                  </div>
                </div>
              </Card>

              <Card className="p-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-green-600" />
                    <span className="text-sm">Copertura Email</span>
                  </div>
                  <Progress value={stats.emailCoverage} className="h-2" />
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{stats.withEmail} membri</span>
                    <span className="font-medium">{stats.emailCoverage}%</span>
                  </div>
                </div>
              </Card>

              <Card className="p-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-purple-600" />
                    <span className="text-sm">Copertura SMS/WhatsApp</span>
                  </div>
                  <Progress value={stats.phoneCoverage} className="h-2" />
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{stats.withPhone} membri</span>
                    <span className="font-medium">{stats.phoneCoverage}%</span>
                  </div>
                </div>
              </Card>
            </div>
          )}

          {/* Members Preview */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">
                Anteprima Membri {preview && `(${preview.preview.length} di ${preview.total})`}
              </h4>
              <Button variant="ghost" size="sm" onClick={() => refetchPreview()}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Aggiorna
              </Button>
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : preview?.preview.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>Nessun membro nel gruppo</p>
                {group.type !== 'STATIC' && (
                  <p className="text-sm mt-1">
                    Prova a sincronizzare il gruppo per aggiornare i membri.
                  </p>
                )}
              </div>
            ) : (
              <div className="border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Telefono</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {preview?.preview.map((member) => (
                      <TableRow key={member.id}>
                        <TableCell className="font-medium">
                          {member.name || '-'}
                        </TableCell>
                        <TableCell>
                          {member.email ? (
                            <span className="flex items-center gap-1">
                              <Mail className="w-3 h-3 text-muted-foreground" />
                              {member.email}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {member.phone ? (
                            <span className="flex items-center gap-1">
                              <Phone className="w-3 h-3 text-muted-foreground" />
                              {member.phone}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {preview?.hasMore && (
                  <div className="px-4 py-3 border-t bg-muted/50 text-center text-sm text-muted-foreground">
                    E altri {preview.total - preview.preview.length} membri...
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Channel Coverage Summary */}
          {stats && stats.totalMembers > 0 && (
            <Card className="p-4 bg-muted/30">
              <h4 className="font-medium mb-3">Riepilogo Raggiungibilità</h4>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span>Raggiungibili via Email:</span>
                  <span className="font-medium text-green-600">{stats.withEmail} ({stats.emailCoverage}%)</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Raggiungibili via SMS/WhatsApp:</span>
                  <span className="font-medium text-purple-600">{stats.withPhone} ({stats.phoneCoverage}%)</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Non raggiungibili:</span>
                  <span className="font-medium text-red-600">
                    {stats.totalMembers - Math.max(stats.withEmail, stats.withPhone)}
                    ({Math.round(((stats.totalMembers - Math.max(stats.withEmail, stats.withPhone)) / stats.totalMembers) * 100)}%)
                  </span>
                </div>
              </div>
            </Card>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end pt-4 border-t">
          <Button onClick={onClose}>Chiudi</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
