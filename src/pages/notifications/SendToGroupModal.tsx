/**
 * SendToGroupModal - Invio Notifica a Gruppo
 * 
 * Modale per comporre e inviare una notifica a tutti
 * i membri di un gruppo.
 * 
 * PROGETTO 47 - Advanced Notification System - Fase 6
 */

import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Send, Users, Mail, MessageSquare, Smartphone, Bell, AlertTriangle, Info, CheckCircle, AlertCircle } from 'lucide-react';
import { apiGet, apiPost } from '@/services/api';
import { useToast } from '@/hooks/useToast';
import { useTenantMode } from '@/contexts/TenantModeContext';
import { Button } from '@/components/ui/button';
import { CRUDPrimaryButton } from '@/components/shared/CRUDButton';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

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

interface StatsResponse {
  success: boolean;
  data: {
    totalMembers: number;
    withEmail: number;
    withPhone: number;
    emailCoverage: number;
    phoneCoverage: number;
  };
}

interface SendToGroupModalProps {
  open: boolean;
  group: NotificationGroup;
  onClose: () => void;
}

// Notification types
const NOTIFICATION_TYPES = [
  { value: 'INFO', label: 'Informazione', icon: Info, color: 'text-blue-600' },
  { value: 'SUCCESS', label: 'Successo', icon: CheckCircle, color: 'text-green-600' },
  { value: 'WARNING', label: 'Avviso', icon: AlertTriangle, color: 'text-yellow-600' },
  { value: 'ERROR', label: 'Errore', icon: AlertCircle, color: 'text-red-600' },
  { value: 'REMINDER', label: 'Promemoria', icon: Bell, color: 'text-purple-600' }
];

// Priority levels
const PRIORITY_LEVELS = [
  { value: 'LOW', label: 'Bassa' },
  { value: 'NORMAL', label: 'Normale' },
  { value: 'HIGH', label: 'Alta' },
  { value: 'URGENT', label: 'Urgente' }
];

// Delivery channels
const DELIVERY_CHANNELS = [
  { id: 'IN_APP', label: 'In-App', icon: Bell, description: 'Notifica interna all\'applicazione' },
  { id: 'EMAIL', label: 'Email', icon: Mail, description: 'Invia email ai destinatari' },
  { id: 'SMS', label: 'SMS', icon: MessageSquare, description: 'Invia SMS ai destinatari' },
  { id: 'PUSH', label: 'Push', icon: Smartphone, description: 'Notifica push browser/mobile' }
];

export default function SendToGroupModal({ open, group, onClose }: SendToGroupModalProps) {
  const { showToast } = useToast();
  const { canPerformCRUD } = useTenantMode();

  // Form state
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [type, setType] = useState('INFO');
  const [priority, setPriority] = useState('NORMAL');
  const [channels, setChannels] = useState<string[]>(['IN_APP']);
  const [actionUrl, setActionUrl] = useState('');

  // Fetch stats for coverage info
  const { data: statsData } = useQuery<StatsResponse>({
    queryKey: ['group-stats', group.id],
    queryFn: async () => apiGet(`${API_BASE}/groups/${group.id}/stats`),
    enabled: open
  });

  const stats = statsData?.data;

  // Send mutation
  const sendMutation = useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      return apiPost(`${API_BASE}/group/${group.id}`, data);
    },
    onSuccess: (response) => {
      const sentCount = (response as { data?: { sent?: number } }).data?.sent || stats?.totalMembers || 0;
      showToast({
        message: `Notifica inviata a ${sentCount} destinatari`,
        type: 'success'
      });
      onClose();
    },
    onError: (error: Error) => {
      showToast({
        message: 'Errore invio notifica',
        type: 'error'
      });
    }
  });

  // Toggle channel
  const handleChannelToggle = (channelId: string) => {
    if (channels.includes(channelId)) {
      // Almeno un canale deve essere selezionato
      if (channels.length > 1) {
        setChannels(channels.filter(c => c !== channelId));
      }
    } else {
      setChannels([...channels, channelId]);
    }
  };

  // Calculate estimated reach
  const calculateReach = () => {
    if (!stats) return { total: 0, breakdown: [] };

    const breakdown = [];
    let maxReach = 0;

    if (channels.includes('IN_APP')) {
      breakdown.push({ channel: 'In-App', count: stats.totalMembers });
      maxReach = Math.max(maxReach, stats.totalMembers);
    }

    if (channels.includes('EMAIL')) {
      breakdown.push({ channel: 'Email', count: stats.withEmail });
      maxReach = Math.max(maxReach, stats.withEmail);
    }

    if (channels.includes('SMS') || channels.includes('WHATSAPP')) {
      breakdown.push({ channel: 'SMS', count: stats.withPhone });
      maxReach = Math.max(maxReach, stats.withPhone);
    }

    if (channels.includes('PUSH')) {
      // Assume ~50% of users have push enabled
      const pushEstimate = Math.round(stats.totalMembers * 0.5);
      breakdown.push({ channel: 'Push', count: pushEstimate });
      maxReach = Math.max(maxReach, pushEstimate);
    }

    return { total: maxReach, breakdown };
  };

  const reach = calculateReach();

  // Handle send
  const handleSend = () => {
    if (!title.trim()) {
      showToast({ message: 'Il titolo è obbligatorio', type: 'warning' });
      return;
    }

    if (!body.trim()) {
      showToast({ message: 'Il contenuto è obbligatorio', type: 'warning' });
      return;
    }

    if (channels.length === 0) {
      showToast({ message: 'Seleziona almeno un canale', type: 'warning' });
      return;
    }

    const data: Record<string, unknown> = {
      title: title.trim(),
      body: body.trim(),
      type,
      priority,
      channels
    };

    if (actionUrl.trim()) {
      data.actionUrl = actionUrl.trim();
    }

    sendMutation.mutate(data);
  };

  // Get type icon
  const TypeIcon = NOTIFICATION_TYPES.find(t => t.value === type)?.icon || Info;
  const typeColor = NOTIFICATION_TYPES.find(t => t.value === type)?.color || 'text-blue-600';

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="w-5 h-5" />
            Invia Notifica al Gruppo
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Group Info */}
          <Card className="p-4 bg-muted/30">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-primary/10">
                <Users className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1">
                <div className="font-medium">{group.name}</div>
                <div className="text-sm text-muted-foreground">
                  {stats?.totalMembers || group.memberCount} membri
                </div>
              </div>
              {!group.isActive && (
                <Badge variant="secondary">Disattivo</Badge>
              )}
            </div>
          </Card>

          {/* Message Content */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="title">Titolo *</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Titolo della notifica..."
                maxLength={100}
              />
            </div>

            <div>
              <Label htmlFor="body">Messaggio *</Label>
              <Textarea
                id="body"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Contenuto della notifica..."
                rows={4}
                maxLength={1000}
              />
              <div className="text-xs text-muted-foreground text-right mt-1">
                {body.length}/1000
              </div>
            </div>

            <div>
              <Label htmlFor="actionUrl">URL Azione (opzionale)</Label>
              <Input
                id="actionUrl"
                value={actionUrl}
                onChange={(e) => setActionUrl(e.target.value)}
                placeholder="https://..."
                type="url"
              />
            </div>
          </div>

          {/* Type and Priority */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Tipo Notifica</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {NOTIFICATION_TYPES.map(t => (
                    <SelectItem key={t.value} value={t.value}>
                      <div className="flex items-center gap-2">
                        <t.icon className={`w-4 h-4 ${t.color}`} />
                        {t.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Priorità</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRIORITY_LEVELS.map(p => (
                    <SelectItem key={p.value} value={p.value}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Delivery Channels */}
          <div className="space-y-3">
            <Label>Canali di Invio</Label>
            <div className="grid grid-cols-2 gap-3">
              {DELIVERY_CHANNELS.map(channel => (
                <Card
                  key={channel.id}
                  onClick={() => handleChannelToggle(channel.id)}
                  className={`
                    p-3 cursor-pointer transition-colors
                    ${channels.includes(channel.id)
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50'
                    }
                  `}
                >
                  <div className="flex items-start gap-3">
                    <Checkbox
                      checked={channels.includes(channel.id)}
                      onCheckedChange={() => handleChannelToggle(channel.id)}
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <channel.icon className="w-4 h-4" />
                        <span className="font-medium">{channel.label}</span>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {channel.description}
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>

          {/* Reach Estimate */}
          {stats && (
            <Card className="p-4">
              <h4 className="font-medium mb-3">Stima Raggiungibilità</h4>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span>Destinatari stimati:</span>
                  <span className="text-xl font-bold text-primary">{reach.total}</span>
                </div>

                <Progress
                  value={(reach.total / stats.totalMembers) * 100}
                  className="h-2"
                />

                <div className="grid grid-cols-2 gap-2 text-sm">
                  {reach.breakdown.map(item => (
                    <div key={item.channel} className="flex items-center justify-between text-muted-foreground">
                      <span>{item.channel}:</span>
                      <span>{item.count}</span>
                    </div>
                  ))}
                </div>

                {reach.total < stats.totalMembers && (
                  <div className="text-xs text-yellow-600 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    {stats.totalMembers - reach.total} membri potrebbero non ricevere la notifica
                  </div>
                )}
              </div>
            </Card>
          )}

          {/* Preview */}
          <Card className="p-4 bg-muted/30">
            <h4 className="text-sm font-medium mb-2">Anteprima</h4>
            <div className="border rounded-md p-3 bg-background">
              <div className="flex items-start gap-3">
                <div className={`p-2 rounded-full bg-muted ${typeColor}`}>
                  <TypeIcon className="w-4 h-4" />
                </div>
                <div className="flex-1">
                  <div className="font-medium">{title || 'Titolo notifica'}</div>
                  <div className="text-sm text-muted-foreground line-clamp-2 mt-1">
                    {body || 'Contenuto della notifica...'}
                  </div>
                  {actionUrl && (
                    <div className="text-xs text-primary mt-2">
                      → {actionUrl}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center pt-4 border-t">
          <div className="text-sm text-muted-foreground">
            <Users className="w-4 h-4 inline mr-1" />
            {reach.total} destinatari stimati
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={onClose}>
              Annulla
            </Button>
            <CRUDPrimaryButton
              onClick={handleSend}
              disabled={sendMutation.isPending || !title.trim() || !body.trim()}
            >
              {sendMutation.isPending ? (
                'Invio in corso...'
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Invia Notifica
                </>
              )}
            </CRUDPrimaryButton>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
