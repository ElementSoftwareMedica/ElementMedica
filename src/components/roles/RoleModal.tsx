/**
 * RoleModal Component
 * 
 * Refactored modal for creating and editing roles with permissions.
 * Uses hooks composition pattern with modular components.
 * 
 * @see RoleModal/README.md for comprehensive documentation
 */

import React, { useCallback, useEffect } from 'react';
import { Modal } from '../../design-system/molecules/Modal';
import { Button } from '../../design-system/atoms/Button';
import { Alert, AlertDescription } from '../ui/alert';
import { Loader2, AlertCircle } from 'lucide-react';

// Module imports
import {
  usePermissionLoader,
  usePermissionState,
  useRoleForm,
  useHierarchyState,
  PermissionSelector,
  RoleFormFields,
  HierarchySelector,
  PermissionHeader,
  useEntityIcons,
  getEntityIcon,
  validateRoleForm,
  prepareRoleDataForSubmit,
  type RoleModalProps
} from './RoleModal/index';

const RoleModal: React.FC<RoleModalProps> = ({
  isOpen,
  onClose,
  onSave,
  role,
  mode,
  hierarchy = {}
}) => {
  // ============================================================================
  // Hooks Composition
  // ============================================================================

  // Load available permissions and entities
  const {
    availablePermissions,
    entities,
    entityGroups,
    loadingPermissions,
    error: loadingError
  } = usePermissionLoader(isOpen);

  // Manage form state
  const {
    formData,
    handleInputChange,
    loading,
    setLoading,
    error,
    setError,
    setFormDataPermissions
  } = useRoleForm(isOpen, mode, role);

  // Manage permission selection state
  const {
    selectedPermissions,
    selectedPermissionGroup,
    setSelectedPermissionGroup,
    handlePermissionChange,
    handleSelectAllPermissions,
    handleSelectNoPermissions,
    handleSelectGroupPermissions,
    getSelectedPermissionsCount,
    totalSelectedPermissions,
    setSelectedPermissions
  } = usePermissionState(availablePermissions, entityGroups);

  // Manage hierarchy state
  const {
    availableParentRoles,
    canHaveParent
  } = useHierarchyState(parseInt(formData.level), hierarchy);

  // Entity icons
  const entityIcons = useEntityIcons();
  const getEntityIconCallback = useCallback(
    (entityName: string) => getEntityIcon(entityName, entityIcons),
    [entityIcons]
  );

  // ============================================================================
  // Effects - Sync form permissions with selection state
  // ============================================================================

  // One-way sync: from form to selection state (when editing existing role)
  // This runs only when form.permissions is loaded from backend
  useEffect(() => {
    const permissionKeys = Object.keys(formData.permissions);
    if (permissionKeys.length > 0) {
      setSelectedPermissions(formData.permissions);
    }
  }, [formData.permissions, setSelectedPermissions]);

  // When user changes permissions via UI, update form data
  // Use a ref to prevent infinite loop
  const selectedPermissionsRef = React.useRef(selectedPermissions);
  useEffect(() => {
    // Only update if selectedPermissions actually changed (not from form sync)
    if (selectedPermissionsRef.current !== selectedPermissions) {
      selectedPermissionsRef.current = selectedPermissions;
      setFormDataPermissions(selectedPermissions);
    }
  }, [selectedPermissions, setFormDataPermissions]);

  // ============================================================================
  // Handlers
  // ============================================================================

  const handleSubmit = async () => {
    try {
      setLoading(true);
      setError(null);

      // Validation
      const validationError = validateRoleForm(formData);
      if (validationError) {
        setError(validationError);
        return;
      }

      // Prepare data for API
      const roleData = prepareRoleDataForSubmit(formData, mode, role);

      await onSave(roleData);
      onClose();
    } catch (error: any) {
      console.error('[RoleModal] Error saving role:', error);
      setError(error.message || 'Errore nel salvataggio del ruolo');
    } finally {
      setLoading(false);
    }
  };

  // ============================================================================
  // Render
  // ============================================================================

  const displayError = error || loadingError;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={mode === 'create' ? 'Crea Nuovo Ruolo' : 'Modifica Ruolo'}
      size="lg"
    >
      <div className="space-y-6">
        {displayError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{displayError}</AlertDescription>
          </Alert>
        )}

        {/* Form Fields */}
        <RoleFormFields
          name={formData.name}
          description={formData.description}
          level={formData.level}
          onNameChange={(value) => handleInputChange('name', value)}
          onDescriptionChange={(value) => handleInputChange('description', value)}
          onLevelChange={(value) => handleInputChange('level', value)}
          mode={mode}
          loading={loading}
        />

        {/* Hierarchy Selector */}
        {mode === 'create' && (
          <HierarchySelector
            currentLevel={parseInt(formData.level)}
            parentRoleType={formData.parentRoleType}
            availableParentRoles={availableParentRoles}
            canHaveParent={canHaveParent}
            onParentChange={(value) => handleInputChange('parentRoleType', value)}
            loading={loading}
          />
        )}

        {/* Permissions Section */}
        <div className="space-y-4">
          <PermissionHeader
            totalSelectedPermissions={totalSelectedPermissions}
            onSelectAll={handleSelectAllPermissions}
            onSelectNone={handleSelectNoPermissions}
          />

          {loadingPermissions ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span className="ml-2">Caricamento permessi...</span>
            </div>
          ) : (
            <PermissionSelector
              availablePermissions={availablePermissions}
              entityGroups={entityGroups}
              selectedPermissionGroup={selectedPermissionGroup}
              setSelectedPermissionGroup={setSelectedPermissionGroup}
              selectedPermissions={selectedPermissions}
              handlePermissionChange={handlePermissionChange}
              handleSelectGroupPermissions={handleSelectGroupPermissions}
              getSelectedPermissionsCount={getSelectedPermissionsCount}
              getEntityIcon={getEntityIconCallback}
            />
          )}

          {!loadingPermissions && Object.keys(availablePermissions).length === 0 && entityGroups.length === 0 && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Nessun permesso disponibile. Contatta l'amministratore di sistema.
              </AlertDescription>
            </Alert>
          )}
        </div>
      </div>

      <div className="flex justify-end space-x-3 mt-6 pt-4 border-t">
        <Button variant="outline" onClick={onClose} disabled={loading}>
          Annulla
        </Button>
        <Button onClick={handleSubmit} disabled={loading || loadingPermissions}>
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {mode === 'create' ? 'Crea Ruolo' : 'Salva Modifiche'}
        </Button>
      </div>
    </Modal>
  );
};

export default RoleModal;
