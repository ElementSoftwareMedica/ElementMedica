import React, { useState, useEffect } from 'react';
import { Modal } from '../../design-system/molecules/Modal/Modal';
import { Button } from '../../design-system/atoms/Button/Button';
import { Badge } from '../../design-system/atoms/Badge/Badge';
import { Label } from '../../design-system/atoms/Label/Label';
import { Alert, AlertDescription } from '../ui/alert';
import { MoveVertical, AlertCircle, Loader2, Users, ChevronDown, ChevronRight } from 'lucide-react';
import { moveRoleInHierarchy } from '../../services/roles';

interface MoveRoleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onMove: (targetLevel: number, parentRoleType?: string) => Promise<void>;
  role: any;
  hierarchy: Record<string, any>;
  currentLevel: number;
}

const MoveRoleModal: React.FC<MoveRoleModalProps> = ({
  isOpen,
  onClose,
  onMove,
  role,
  hierarchy,
  currentLevel
}) => {
  const [selectedLevel, setSelectedLevel] = useState<number | null>(null);
  const [selectedParentRole, setSelectedParentRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedLevels, setExpandedLevels] = useState<Set<number>>(new Set());

  // Reset lo stato quando si apre il modal
  useEffect(() => {
    if (isOpen) {
      setSelectedLevel(null);
      setSelectedParentRole(null);
      setError(null);
      setExpandedLevels(new Set());
    }
  }, [isOpen]);

  const handleMove = async () => {
    if (selectedLevel === null) {
      setError('Seleziona un livello di destinazione');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      // Usa il nuovo servizio per spostare il ruolo
      await moveRoleInHierarchy(role.roleType || role.type, selectedLevel, selectedParentRole || undefined);
      
      // Chiama anche la callback originale per compatibilità
      await onMove(selectedLevel, selectedParentRole || undefined);
      onClose();
    } catch (error: any) {
      console.error('Error moving role:', error);
      setError(error.message || 'Errore nello spostamento del ruolo');
    } finally {
      setLoading(false);
    }
  };

  // Prepara i livelli disponibili per lo spostamento
  const availableLevels = Object.keys(hierarchy)
    .map(roleType => {
      const roleData = hierarchy[roleType];
      return roleData?.level;
    })
    .filter((level): level is number => typeof level === 'number' && level !== currentLevel)
    .filter((level, index, array) => array.indexOf(level) === index) // Rimuovi duplicati
    .sort((a, b) => a - b);

  // Ottieni i ruoli disponibili come genitori per il livello selezionato
  const getAvailableParentRoles = (targetLevel: number) => {
    return Object.entries(hierarchy)
      .filter(([_, roleData]) => roleData?.level === targetLevel - 1) // Genitori sono al livello precedente
      .map(([roleType, roleData]) => ({ roleType, ...roleData }));
  };

  const toggleLevelExpansion = (level: number) => {
    const newExpanded = new Set(expandedLevels);
    if (newExpanded.has(level)) {
      newExpanded.delete(level);
    } else {
      newExpanded.add(level);
    }
    setExpandedLevels(newExpanded);
  };

  if (!role) return null;

  const modalFooter = (
    <>
      <Button
        variant="outline"
        onClick={onClose}
        disabled={loading}
      >
        Annulla
      </Button>
      <Button
        onClick={handleMove}
        disabled={loading || selectedLevel === null || availableLevels.length === 0}
      >
        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        <MoveVertical className="mr-2 h-4 w-4" />
        Sposta Ruolo
      </Button>
    </>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Sposta Ruolo nella Gerarchia"
      size="md"
      className="z-50"
      footer={modalFooter}
    >
      <div className="space-y-6">
        <div className="flex items-center space-x-3 p-4 bg-blue-50 rounded-lg">
          <MoveVertical className="h-6 w-6 text-blue-600 flex-shrink-0" />
          <div>
            <h3 className="font-medium text-blue-900">Modifica Posizione Gerarchica</h3>
            <p className="text-sm text-blue-700 mt-1">
              Seleziona il nuovo livello gerarchico e, opzionalmente, il ruolo genitore per "{role?.name}".
            </p>
          </div>
        </div>

        {role && (
          <div className="space-y-4">
            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="font-medium">{role.name}</span>
                <Badge variant="outline">Livello {currentLevel}</Badge>
              </div>
              {role.description && (
                <p className="text-sm text-gray-600 mt-1">{role.description}</p>
              )}
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-4">
              <Label className="text-base font-medium">Nuovo Livello Gerarchico</Label>
              
              <div className="space-y-3 max-h-80 overflow-y-auto border rounded-lg p-4">
                {availableLevels.length > 0 ? (
                  availableLevels.map((level) => {
                    // Trova tutti i ruoli a questo livello
                    const rolesAtLevel = Object.entries(hierarchy)
                      .filter(([_, roleData]) => roleData?.level === level)
                      .map(([roleType, roleData]) => ({ roleType, ...roleData }));
                    
                    const isHigher = level < currentLevel;
                    const isExpanded = expandedLevels.has(level);
                    const availableParents = getAvailableParentRoles(level);
                    
                    return (
                      <div key={level} className="space-y-3 border-b pb-3 last:border-b-0">
                        <div className="flex items-center space-x-3">
                          <input
                            type="radio"
                            name="newLevel"
                            value={level.toString()}
                            checked={selectedLevel === level}
                            onChange={() => {
                              setSelectedLevel(level);
                              setSelectedParentRole(null); // Reset parent selection
                              if (!isExpanded) {
                                toggleLevelExpansion(level);
                              }
                            }}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                          />
                          <Label className="flex-1 cursor-pointer">
                            <div className="flex items-center justify-between">
                              <span className="font-medium">Livello {level}</span>
                              <div className="flex items-center space-x-2">
                                <Badge variant={isHigher ? "default" : "secondary"}>
                                  {isHigher ? "Superiore" : "Inferiore"}
                                </Badge>
                                <Badge variant="outline" className="flex items-center space-x-1">
                                  <Users className="h-3 w-3" />
                                  <span>{rolesAtLevel.length}</span>
                                </Badge>
                              </div>
                            </div>
                            <p className="text-xs text-gray-500 mt-1">
                              {level < currentLevel ? 'Promozione' : level > currentLevel ? 'Retrocessione' : 'Nessun cambiamento'}
                            </p>
                          </Label>
                          {selectedLevel === level && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => toggleLevelExpansion(level)}
                              className="p-1"
                            >
                              {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                            </Button>
                          )}
                        </div>
                        
                        {selectedLevel === level && isExpanded && (
                          <div className="ml-6 space-y-3">
                            {/* Selezione del genitore */}
                            {availableParents.length > 0 && (
                              <div className="space-y-2">
                                <Label className="text-sm font-medium text-gray-700">
                                  Seleziona Ruolo Genitore (Livello {level - 1})
                                </Label>
                                <div className="space-y-2">
                                  <div className="flex items-center space-x-2">
                                    <input
                                      type="radio"
                                      name="parentRole"
                                      value=""
                                      checked={selectedParentRole === null}
                                      onChange={() => setSelectedParentRole(null)}
                                      className="h-3 w-3 text-blue-600 focus:ring-blue-500 border-gray-300"
                                    />
                                    <Label className="text-sm text-gray-600">Nessun genitore specifico</Label>
                                  </div>
                                  {availableParents.map((parentRole) => (
                                    <div key={parentRole.roleType} className="flex items-center space-x-2">
                                      <input
                                        type="radio"
                                        name="parentRole"
                                        value={parentRole.roleType}
                                        checked={selectedParentRole === parentRole.roleType}
                                        onChange={() => setSelectedParentRole(parentRole.roleType)}
                                        className="h-3 w-3 text-blue-600 focus:ring-blue-500 border-gray-300"
                                      />
                                      <Label className="text-sm">
                                        <Badge variant="outline" className="mr-2">
                                          {parentRole.name || parentRole.roleType}
                                        </Badge>
                                        <span className="text-gray-600">{parentRole.description}</span>
                                      </Label>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                            
                            {/* Ruoli esistenti a questo livello */}
                            {rolesAtLevel.length > 0 && (
                              <div className="space-y-2">
                                <Label className="text-sm font-medium text-gray-700">
                                  Ruoli esistenti a questo livello:
                                </Label>
                                <div className="flex flex-wrap gap-2">
                                  {rolesAtLevel.map((roleData, index) => (
                                    <Badge 
                                      key={`${level}-${roleData.roleType || index}`} 
                                      variant="outline" 
                                      className="text-xs"
                                    >
                                      {roleData.name || roleData.roleType}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <div className="py-8 text-center text-gray-500">
                    <MoveVertical className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                    <p>Non ci sono altri livelli disponibili nella gerarchia</p>
                  </div>
                )}
              </div>
            </div>

            {selectedLevel !== null && selectedLevel !== currentLevel && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Nota:</strong> Spostare il ruolo dal livello {currentLevel} al livello {selectedLevel} 
                  {selectedLevel < currentLevel ? ' aumenterà' : ' diminuirà'} la sua autorità nella gerarchia.
                  {selectedParentRole && (
                    <span className="block mt-1">
                      Il ruolo sarà subordinato a: <strong>{hierarchy[selectedParentRole]?.name || selectedParentRole}</strong>
                    </span>
                  )}
                  <span className="block mt-1 text-sm text-gray-600">
                    Questo potrebbe influire sui permessi e sulle relazioni gerarchiche esistenti.
                  </span>
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
};

export default MoveRoleModal;