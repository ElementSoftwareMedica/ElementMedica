/**
 * EscalationConfigPanel - Pannello Configurazione Escalation
 * 
 * Componente per configurare i livelli di escalation per tenant.
 * Permette di personalizzare target, delay, canali e messaggi.
 * 
 * PROGETTO 47 - Advanced Notification System - Fase 7
 */

import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Settings, Save, RotateCcw, Clock, Users,
  MessageSquare, Bell, Mail, Phone, AlertTriangle
} from 'lucide-react';
import { apiGet, apiPut, apiDelete } from '@/services/api';
import { useToast } from '@/hooks/useToast';
import { useTenantMode } from '@/contexts/TenantModeContext';
import { Button } from '@/components/ui/button';
import { CRUDPrimaryButton } from '@/components/shared/CRUDButton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

// API Base
const API_BASE = '/api/v1/notifications/advanced';

// Types
interface LevelConfig {
  level?: number;
  delayMinutes: number;
  targetType: string;
  targetRole?: string;
  targetPersonIds?: string[];
  additionalChannels: string[];
  messageTemplate: string;
  isActive?: boolean;
  isDefault?: boolean;
}

interface EscalationConfig {
  level1: LevelConfig;
  level2: LevelConfig;
  level3: LevelConfig;
}

interface DefaultConfig {
  level1: LevelConfig;
  level2: LevelConfig;
  level3: LevelConfig;
}

// Target types with labels
const TARGET_TYPES = [
  { value: 'SUPERVISOR', label: 'Supervisore', description: 'Supervisore del destinatario originale' },
  { value: 'MANAGER', label: 'Manager', description: 'Tutti i manager del tenant' },
  { value: 'ADMIN', label: 'Admin', description: 'Tutti gli admin del tenant' },
  { value: 'ROLE', label: 'Ruolo specifico', description: 'Utenti con un ruolo specifico' },
  { value: 'PERSON', label: 'Persone specifiche', description: 'Utenti selezionati manualmente' }
];

// Channel options
const CHANNELS = [
  { value: 'EMAIL', label: 'Email', icon: Mail },
  { value: 'SMS', label: 'SMS', icon: Phone },
  { value: 'WHATSAPP', label: 'WhatsApp', icon: MessageSquare },
  { value: 'PUSH', label: 'Push', icon: Bell }
];

// Fetch functions
const fetchConfig = async () => {
  const result = await apiGet(`${API_BASE}/escalations/config`);
  return result as { config: EscalationConfig };
};

const fetchDefaultConfig = async () => {
  const result = await apiGet(`${API_BASE}/escalations/config/defaults`);
  return result as { config: DefaultConfig };
};

export default function EscalationConfigPanel() {
  const { showToast } = useToast();
  const { canPerformCRUD } = useTenantMode();
  const queryClient = useQueryClient();

  // State for editing
  const [editedConfigs, setEditedConfigs] = useState<Record<number, Partial<LevelConfig>>>({});
  const [expandedLevel, setExpandedLevel] = useState<string>('level-1');

  // Queries
  const { data: configData, isLoading: loadingConfig } = useQuery({
    queryKey: ['escalation-config'],
    queryFn: fetchConfig
  });

  const { data: defaultData } = useQuery({
    queryKey: ['escalation-config-defaults'],
    queryFn: fetchDefaultConfig
  });

  // Mutations
  const updateMutation = useMutation({
    mutationFn: ({ level, data }: { level: number; data: Partial<LevelConfig> }) =>
      apiPut(`${API_BASE}/escalations/config/${level}`, data),
    onSuccess: (_, { level }) => {
      showToast({ message: `Configurazione livello ${level} salvata`, type: 'success' });
      queryClient.invalidateQueries({ queryKey: ['escalation-config'] });
      setEditedConfigs(prev => {
        const next = { ...prev };
        delete next[level];
        return next;
      });
    },
    onError: (error: Error) => {
      showToast({ message: 'Errore', type: 'error' });
    }
  });

  const resetMutation = useMutation({
    mutationFn: (level: number | 'all') =>
      apiDelete(`${API_BASE}/escalations/config/${level}`),
    onSuccess: (_, level) => {
      showToast({
        message: level === 'all'
          ? 'Configurazione resettata ai valori default'
          : `Livello ${level} resettato ai valori default`,
        type: 'success'
      });
      queryClient.invalidateQueries({ queryKey: ['escalation-config'] });
      setEditedConfigs({});
    },
    onError: (error: Error) => {
      showToast({ message: 'Errore', type: 'error' });
    }
  });

  // Handlers
  const handleConfigChange = useCallback((level: number, field: keyof LevelConfig, value: unknown) => {
    setEditedConfigs(prev => ({
      ...prev,
      [level]: {
        ...prev[level],
        [field]: value
      }
    }));
  }, []);

  const handleChannelToggle = useCallback((level: number, channel: string, currentChannels: string[]) => {
    const newChannels = currentChannels.includes(channel)
      ? currentChannels.filter(c => c !== channel)
      : [...currentChannels, channel];
    handleConfigChange(level, 'additionalChannels', newChannels);
  }, [handleConfigChange]);

  const handleSave = useCallback((level: number) => {
    if (!canPerformCRUD) {
      showToast({ message: 'Seleziona un tenant per questa operazione', type: 'warning' });
      return;
    }

    const edited = editedConfigs[level];
    if (!edited || Object.keys(edited).length === 0) {
      showToast({ message: 'Nessuna modifica da salvare', type: 'info' });
      return;
    }

    // Merge with current config
    const levelKey = `level${level}` as keyof EscalationConfig;
    const current = configData?.config?.[levelKey];
    const merged = { ...current, ...edited };

    updateMutation.mutate({ level, data: merged });
  }, [canPerformCRUD, editedConfigs, configData, updateMutation, showToast]);

  const handleReset = useCallback((level: number | 'all') => {
    if (!canPerformCRUD) {
      showToast({ message: 'Seleziona un tenant per questa operazione', type: 'warning' });
      return;
    }
    resetMutation.mutate(level);
  }, [canPerformCRUD, resetMutation, showToast]);

  // Get current value (edited or saved)
  const getConfigValue = useCallback((level: number, field: keyof LevelConfig) => {
    const edited = editedConfigs[level]?.[field];
    if (edited !== undefined) return edited;

    const levelKey = `level${level}` as keyof EscalationConfig;
    return configData?.config?.[levelKey]?.[field];
  }, [editedConfigs, configData]);

  const config = configData?.config;
  const defaults = defaultData?.config;

  if (loadingConfig) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <div className="animate-pulse">Caricamento configurazione...</div>
        </CardContent>
      </Card>
    );
  }

  const renderLevelConfig = (level: 1 | 2 | 3) => {
    const levelKey = `level${level}` as keyof EscalationConfig;
    const levelConfig = config?.[levelKey];
    const defaultConfig = defaults?.[levelKey];
    const hasEdits = editedConfigs[level] && Object.keys(editedConfigs[level]).length > 0;
    const isDefault = levelConfig?.isDefault;

    const currentDelayMinutes = getConfigValue(level, 'delayMinutes') as number || defaultConfig?.delayMinutes || 30;
    const currentTargetType = getConfigValue(level, 'targetType') as string || defaultConfig?.targetType || 'SUPERVISOR';
    const currentChannels = getConfigValue(level, 'additionalChannels') as string[] || defaultConfig?.additionalChannels || [];
    const currentMessage = getConfigValue(level, 'messageTemplate') as string || defaultConfig?.messageTemplate || '';
    const currentTargetRole = getConfigValue(level, 'targetRole') as string || '';
    const currentIsActive = getConfigValue(level, 'isActive') !== false;

    const levelColors = {
      1: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      2: 'bg-orange-100 text-orange-800 border-orange-200',
      3: 'bg-red-100 text-red-800 border-red-200'
    };

    return (
      <AccordionItem value={`level-${level}`} key={level}>
        <AccordionTrigger className="hover:no-underline">
          <div className="flex items-center gap-3 w-full">
            <Badge variant="outline" className={levelColors[level]}>
              Livello {level}
            </Badge>
            <span className="text-sm font-medium">
              {TARGET_TYPES.find(t => t.value === currentTargetType)?.label || currentTargetType}
            </span>
            <span className="text-xs text-gray-500">
              ({currentDelayMinutes} min)
            </span>
            {isDefault && (
              <Badge variant="secondary" className="ml-auto mr-4">Default</Badge>
            )}
            {hasEdits && (
              <Badge variant="outline" className="ml-auto mr-4 bg-blue-50 text-blue-700">
                Modificato
              </Badge>
            )}
          </div>
        </AccordionTrigger>
        <AccordionContent>
          <div className="space-y-6 pt-4">
            {/* Active Toggle */}
            <div className="flex items-center justify-between">
              <div>
                <Label>Livello Attivo</Label>
                <p className="text-xs text-gray-500">Abilita/disabilita questo livello di escalation</p>
              </div>
              <Switch
                checked={currentIsActive}
                onCheckedChange={(checked) => handleConfigChange(level, 'isActive', checked)}
              />
            </div>

            {/* Delay */}
            <div className="space-y-2">
              <Label htmlFor={`delay-${level}`} className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Ritardo prima dell'escalation
              </Label>
              <div className="flex items-center gap-2">
                <Input
                  id={`delay-${level}`}
                  type="number"
                  min={5}
                  max={1440}
                  value={currentDelayMinutes}
                  onChange={(e) => handleConfigChange(level, 'delayMinutes', parseInt(e.target.value))}
                  className="w-24"
                />
                <span className="text-sm text-gray-500">minuti</span>
              </div>
              <p className="text-xs text-gray-500">
                Tempo di attesa dopo il livello precedente prima di escalare
              </p>
            </div>

            {/* Target Type */}
            <div className="space-y-2">
              <Label htmlFor={`target-${level}`} className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                Target Escalation
              </Label>
              <Select
                value={currentTargetType}
                onValueChange={(value) => handleConfigChange(level, 'targetType', value)}
              >
                <SelectTrigger id={`target-${level}`}>
                  <SelectValue placeholder="Seleziona target" />
                </SelectTrigger>
                <SelectContent>
                  {TARGET_TYPES.map(target => (
                    <SelectItem key={target.value} value={target.value}>
                      <div>
                        <div className="font-medium">{target.label}</div>
                        <div className="text-xs text-gray-500">{target.description}</div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Target Role (conditional) */}
            {currentTargetType === 'ROLE' && (
              <div className="space-y-2">
                <Label htmlFor={`role-${level}`}>Ruolo Target</Label>
                <Select
                  value={currentTargetRole}
                  onValueChange={(value) => handleConfigChange(level, 'targetRole', value)}
                >
                  <SelectTrigger id={`role-${level}`}>
                    <SelectValue placeholder="Seleziona ruolo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MEDICO">Medico</SelectItem>
                    <SelectItem value="INFERMIERE">Infermiere</SelectItem>
                    <SelectItem value="RECEPTIONIST">Receptionist</SelectItem>
                    <SelectItem value="FORMATORE">Formatore</SelectItem>
                    <SelectItem value="MANAGER">Manager</SelectItem>
                    <SelectItem value="ADMIN">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Channels */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Bell className="w-4 h-4" />
                Canali Aggiuntivi
              </Label>
              <p className="text-xs text-gray-500 mb-2">
                Canali extra oltre a IN_APP per notificare l'escalation
              </p>
              <div className="flex flex-wrap gap-2">
                {CHANNELS.map(channel => {
                  const isSelected = currentChannels.includes(channel.value);
                  const Icon = channel.icon;
                  return (
                    <Button
                      key={channel.value}
                      type="button"
                      variant={isSelected ? 'primary' : 'outline'}
                      size="sm"
                      onClick={() => handleChannelToggle(level, channel.value, currentChannels)}
                      className="gap-2"
                    >
                      <Icon className="w-4 h-4" />
                      {channel.label}
                    </Button>
                  );
                })}
              </div>
            </div>

            {/* Message Template */}
            <div className="space-y-2">
              <Label htmlFor={`message-${level}`} className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4" />
                Messaggio Escalation
              </Label>
              <Textarea
                id={`message-${level}`}
                value={currentMessage}
                onChange={(e) => handleConfigChange(level, 'messageTemplate', e.target.value)}
                placeholder="Inserisci il messaggio per questo livello di escalation..."
                rows={2}
              />
              <p className="text-xs text-gray-500">
                Questo messaggio verrà anteposto alla notifica originale
              </p>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 pt-4 border-t">
              <CRUDPrimaryButton
                onClick={() => handleSave(level)}
                disabled={!hasEdits || updateMutation.isPending}
              >
                <Save className="w-4 h-4 mr-2" />
                Salva Livello {level}
              </CRUDPrimaryButton>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleReset(level)}
                disabled={isDefault || resetMutation.isPending}
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Reset Default
              </Button>
            </div>
          </div>
        </AccordionContent>
      </AccordionItem>
    );
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Configurazione Escalation
            </CardTitle>
            <CardDescription>
              Personalizza il comportamento di ogni livello di escalation
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleReset('all')}
            disabled={resetMutation.isPending}
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Reset Tutti
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {/* Info Box */}
        <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-blue-600 mt-0.5" />
            <div>
              <h4 className="font-medium text-blue-900">Come funziona l'escalation</h4>
              <p className="text-sm text-blue-700 mt-1">
                Quando una notifica critica o urgente non viene letta/confermata entro il tempo stabilito,
                il sistema la scala automaticamente al livello successivo, notificando i target configurati
                attraverso i canali aggiuntivi selezionati.
              </p>
            </div>
          </div>
        </div>

        {/* Level Configurations */}
        <Accordion
          type="single"
          collapsible
          value={expandedLevel}
          onValueChange={setExpandedLevel}
          className="space-y-2"
        >
          {renderLevelConfig(1)}
          {renderLevelConfig(2)}
          {renderLevelConfig(3)}
        </Accordion>
      </CardContent>
    </Card>
  );
}

