/**
 * GroupFormModal - Creazione/Modifica Gruppo
 * 
 * Modale per creare o modificare gruppi di destinatari.
 * Supporta gruppi statici, dinamici, role-based e segmenti.
 * 
 * PROGETTO 47 - Advanced Notification System - Fase 6
 */

import { useState, useEffect } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { X, Users, Database, UserCheck, Tags, Plus, Trash2, Search } from 'lucide-react';
import { apiGet, apiPost, apiPut } from '@/services/api';
import { useToast } from '@/hooks/useToast';
import { useTenantMode } from '@/contexts/TenantModeContext';
import { Button } from '@/components/ui/button';
import { CRUDPrimaryButton } from '@/components/shared/CRUDButton';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
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
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { DatePickerElegante } from '@/components/ui/DatePickerElegante';

const API_BASE = '/api/v1/notifications/advanced';

// Types
interface NotificationGroup {
  id: string;
  name: string;
  description: string | null;
  type: 'STATIC' | 'DYNAMIC' | 'ROLE_BASED' | 'SEGMENT';
  dynamicQuery: Record<string, unknown> | null;
  isActive: boolean;
  memberCount: number;
}

interface Segment {
  id: string;
  name: string;
  description: string;
}

interface Person {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

interface GroupFormModalProps {
  open: boolean;
  group?: NotificationGroup | null;
  onClose: () => void;
  onSuccess: () => void;
}

// Role types disponibili - must match Prisma RoleType enum
const ROLE_TYPES = [
  { value: 'ADMIN', label: 'Amministratore' },
  { value: 'SUPER_ADMIN', label: 'Super Admin' },
  { value: 'TENANT_ADMIN', label: 'Tenant Admin' },
  { value: 'MEDICO', label: 'Medico' },
  { value: 'INFERMIERE', label: 'Infermiere' },
  { value: 'SEGRETERIA_CLINICA', label: 'Segreteria Clinica' },
  { value: 'OPERATOR', label: 'Operatore' },
  { value: 'MANAGER', label: 'Manager' },
  { value: 'PAZIENTE', label: 'Paziente' },
  { value: 'TRAINER', label: 'Formatore' },
  { value: 'EMPLOYEE', label: 'Dipendente' }
];

export default function GroupFormModal({ open, group, onClose, onSuccess }: GroupFormModalProps) {
  const { showToast } = useToast();
  const { canPerformCRUD } = useTenantMode();
  const isEdit = !!group;

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<'STATIC' | 'DYNAMIC' | 'ROLE_BASED' | 'SEGMENT'>('STATIC');
  const [isActive, setIsActive] = useState(true);

  // Type-specific state
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [selectedSegment, setSelectedSegment] = useState<string>('');
  const [dynamicQuery, setDynamicQuery] = useState<Record<string, unknown>>({});
  const [selectedMembers, setSelectedMembers] = useState<Person[]>([]);
  const [memberSearch, setMemberSearch] = useState('');

  // Fetch segments
  const { data: segmentsData } = useQuery({
    queryKey: ['notification-segments'],
    queryFn: async () => apiGet<{ success: boolean; data: Segment[] }>(`${API_BASE}/segments`),
    enabled: open
  });

  const segments = segmentsData?.data || [];

  // Fetch persons for static group
  const { data: personsData, isLoading: personsLoading } = useQuery({
    queryKey: ['persons-search', memberSearch],
    queryFn: async () => {
      const url = memberSearch
        ? `/api/v1/persons?search=${memberSearch}&limit=20`
        : '/api/v1/persons?limit=20';
      return apiGet<{ success: boolean; data: Person[] }>(url);
    },
    enabled: open && type === 'STATIC' && memberSearch.length >= 2
  });

  const availablePersons = personsData?.data || [];

  // Initialize form on edit
  useEffect(() => {
    if (group) {
      setName(group.name);
      setDescription(group.description || '');
      setType(group.type);
      setIsActive(group.isActive);

      if (group.type === 'ROLE_BASED' && group.dynamicQuery) {
        const roles = (group.dynamicQuery as { roleType?: string[] }).roleType || [];
        setSelectedRoles(roles);
      }

      if (group.type === 'SEGMENT' && group.dynamicQuery) {
        const segmentId = (group.dynamicQuery as { segmentId?: string }).segmentId || '';
        setSelectedSegment(segmentId);
      }

      if (group.type === 'DYNAMIC' && group.dynamicQuery) {
        setDynamicQuery(group.dynamicQuery);
      }
    } else {
      // Reset form
      setName('');
      setDescription('');
      setType('STATIC');
      setIsActive(true);
      setSelectedRoles([]);
      setSelectedSegment('');
      setDynamicQuery({});
      setSelectedMembers([]);
    }
  }, [group, open]);

  // Create/Update mutation
  const saveMutation = useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      if (isEdit && group) {
        return apiPut(`${API_BASE}/groups/${group.id}`, data);
      }
      return apiPost(`${API_BASE}/groups`, data);
    },
    onSuccess: () => {
      showToast({
        message: isEdit ? 'Gruppo aggiornato' : 'Gruppo creato',
        type: 'success'
      });
      onSuccess();
    },
    onError: (error: Error) => {
      showToast({
        message: 'Errore salvataggio gruppo',
        type: 'error'
      });
    }
  });

  // Build dynamic query based on type
  const buildDynamicQuery = () => {
    switch (type) {
      case 'ROLE_BASED':
        return { roleType: selectedRoles };
      case 'SEGMENT':
        return { segmentId: selectedSegment };
      case 'DYNAMIC':
        return dynamicQuery;
      default:
        return null;
    }
  };

  // Handle save
  const handleSave = () => {
    if (!name.trim()) {
      showToast({ message: 'Il nome è obbligatorio', type: 'warning' });
      return;
    }

    if (type === 'ROLE_BASED' && selectedRoles.length === 0) {
      showToast({ message: 'Seleziona almeno un ruolo', type: 'warning' });
      return;
    }

    if (type === 'SEGMENT' && !selectedSegment) {
      showToast({ message: 'Seleziona un segmento', type: 'warning' });
      return;
    }

    const data: Record<string, unknown> = {
      name: name.trim(),
      description: description.trim() || null,
      type,
      isActive,
      dynamicQuery: buildDynamicQuery()
    };

    // For static groups, include member IDs
    if (type === 'STATIC' && selectedMembers.length > 0 && !isEdit) {
      data.memberIds = selectedMembers.map(m => m.id);
    }

    saveMutation.mutate(data);
  };

  // Add member to static group
  const handleAddMember = (person: Person) => {
    if (!selectedMembers.find(m => m.id === person.id)) {
      setSelectedMembers([...selectedMembers, person]);
    }
    setMemberSearch('');
  };

  // Remove member
  const handleRemoveMember = (personId: string) => {
    setSelectedMembers(selectedMembers.filter(m => m.id !== personId));
  };

  // Toggle role selection
  const handleRoleToggle = (role: string) => {
    if (selectedRoles.includes(role)) {
      setSelectedRoles(selectedRoles.filter(r => r !== role));
    } else {
      setSelectedRoles([...selectedRoles, role]);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? 'Modifica Gruppo' : 'Nuovo Gruppo'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Basic Info */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Nome Gruppo *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Es. Team Marketing, Pazienti VIP..."
              />
            </div>

            <div>
              <Label htmlFor="description">Descrizione</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Descrizione opzionale del gruppo..."
                rows={2}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="active">Gruppo Attivo</Label>
              <Switch
                id="active"
                checked={isActive}
                onCheckedChange={setIsActive}
              />
            </div>
          </div>

          {/* Type Selection */}
          <div>
            <Label>Tipo Gruppo</Label>
            <Tabs value={type} onValueChange={(v) => setType(v as typeof type)} className="mt-2">
              <TabsList className="grid grid-cols-4 w-full">
                <TabsTrigger value="STATIC" className="gap-2">
                  <Users className="w-4 h-4" />
                  Statico
                </TabsTrigger>
                <TabsTrigger value="ROLE_BASED" className="gap-2">
                  <UserCheck className="w-4 h-4" />
                  Per Ruolo
                </TabsTrigger>
                <TabsTrigger value="SEGMENT" className="gap-2">
                  <Tags className="w-4 h-4" />
                  Segmento
                </TabsTrigger>
                <TabsTrigger value="DYNAMIC" className="gap-2">
                  <Database className="w-4 h-4" />
                  Dinamico
                </TabsTrigger>
              </TabsList>

              {/* Static Group - Member Selection */}
              <TabsContent value="STATIC" className="mt-4 space-y-4">
                <p className="text-sm text-muted-foreground">
                  Seleziona manualmente i membri del gruppo.
                </p>

                {!isEdit && (
                  <>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        placeholder="Cerca persone da aggiungere..."
                        value={memberSearch}
                        onChange={(e) => setMemberSearch(e.target.value)}
                        className="pl-10"
                      />
                    </div>

                    {memberSearch.length >= 2 && (
                      <div className="border rounded-md max-h-48 overflow-y-auto">
                        {personsLoading ? (
                          <div className="p-4 text-center text-muted-foreground">Caricamento...</div>
                        ) : availablePersons.length === 0 ? (
                          <div className="p-4 text-center text-muted-foreground">Nessun risultato</div>
                        ) : (
                          availablePersons.map(person => (
                            <div
                              key={person.id}
                              className="p-2 hover:bg-muted cursor-pointer flex items-center justify-between"
                              onClick={() => handleAddMember(person)}
                            >
                              <div>
                                <div className="font-medium">
                                  {person.firstName} {person.lastName}
                                </div>
                                <div className="text-sm text-muted-foreground">{person.email}</div>
                              </div>
                              <Plus className="w-4 h-4 text-muted-foreground" />
                            </div>
                          ))
                        )}
                      </div>
                    )}

                    {/* Selected Members */}
                    {selectedMembers.length > 0 && (
                      <div>
                        <Label>Membri Selezionati ({selectedMembers.length})</Label>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {selectedMembers.map(member => (
                            <Badge
                              key={member.id}
                              variant="secondary"
                              className="flex items-center gap-1"
                            >
                              {member.firstName} {member.lastName}
                              <button
                                onClick={() => handleRemoveMember(member.id)}
                                className="ml-1 hover:text-destructive"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}

                {isEdit && (
                  <p className="text-sm text-muted-foreground italic">
                    Per modificare i membri, usa la sezione dedicata nella pagina del gruppo.
                  </p>
                )}
              </TabsContent>

              {/* Role-Based Group */}
              <TabsContent value="ROLE_BASED" className="mt-4 space-y-4">
                <p className="text-sm text-muted-foreground">
                  Include automaticamente tutti gli utenti con i ruoli selezionati.
                </p>

                <div className="grid grid-cols-2 gap-2">
                  {ROLE_TYPES.map(role => (
                    <div
                      key={role.value}
                      onClick={() => handleRoleToggle(role.value)}
                      className={`
                        p-3 border rounded-md cursor-pointer transition-colors
                        ${selectedRoles.includes(role.value)
                          ? 'border-primary bg-primary/10'
                          : 'border-border hover:border-primary/50'
                        }
                      `}
                    >
                      <div className="flex items-center gap-2">
                        <div className={`
                          w-4 h-4 rounded border flex items-center justify-center
                          ${selectedRoles.includes(role.value)
                            ? 'bg-primary border-primary'
                            : 'border-muted-foreground'
                          }
                        `}>
                          {selectedRoles.includes(role.value) && (
                            <span className="text-primary-foreground text-xs">✓</span>
                          )}
                        </div>
                        <span>{role.label}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </TabsContent>

              {/* Segment Group */}
              <TabsContent value="SEGMENT" className="mt-4 space-y-4">
                <p className="text-sm text-muted-foreground">
                  Usa un segmento predefinito con criteri automatici.
                </p>

                <Select value={selectedSegment} onValueChange={setSelectedSegment}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleziona segmento..." />
                  </SelectTrigger>
                  <SelectContent>
                    {segments.map(segment => (
                      <SelectItem key={segment.id} value={segment.id}>
                        <div>
                          <div className="font-medium">{segment.name}</div>
                          <div className="text-sm text-muted-foreground">{segment.description}</div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </TabsContent>

              {/* Dynamic Group */}
              <TabsContent value="DYNAMIC" className="mt-4 space-y-4">
                <p className="text-sm text-muted-foreground">
                  Configura query personalizzate per la selezione dinamica.
                </p>

                <div className="space-y-4">
                  <div>
                    <Label>Appuntamento Dopo</Label>
                    <DatePickerElegante
                      value={(dynamicQuery.hasAppointmentSince as string) || ''}
                      onChange={(date) => setDynamicQuery({
                        ...dynamicQuery,
                        hasAppointmentSince: date ? date.toISOString().split('T')[0] : undefined
                      })}
                      theme="blue"
                    />
                  </div>

                  <div>
                    <Label>Ultimo Login Dopo</Label>
                    <DatePickerElegante
                      value={(dynamicQuery.lastLoginAfter as string) || ''}
                      onChange={(date) => setDynamicQuery({
                        ...dynamicQuery,
                        lastLoginAfter: date ? date.toISOString().split('T')[0] : undefined
                      })}
                      theme="blue"
                    />
                  </div>

                  <div>
                    <Label>Ultimo Login Prima</Label>
                    <DatePickerElegante
                      value={(dynamicQuery.lastLoginBefore as string) || ''}
                      onChange={(date) => setDynamicQuery({
                        ...dynamicQuery,
                        lastLoginBefore: date ? date.toISOString().split('T')[0] : undefined
                      })}
                      theme="blue"
                    />
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Annulla
          </Button>
          <CRUDPrimaryButton
            onClick={handleSave}
            disabled={saveMutation.isPending}
          >
            {saveMutation.isPending ? 'Salvataggio...' : (isEdit ? 'Aggiorna' : 'Crea Gruppo')}
          </CRUDPrimaryButton>
        </div>
      </DialogContent>
    </Dialog>
  );
}
