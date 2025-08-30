import React from 'react';
import { PersonsPage } from '../persons/PersonsPage';
import { FILTER_CONFIGS } from '../../services/roleHierarchyService';

/**
 * Pagina Dipendenti - wrapper per PersonsPage con filtro employees
 */
export const EmployeesPage: React.FC = () => {
  return (
    <PersonsPage
      filter={FILTER_CONFIGS.employees}
      filterType="employees"
      title="Dipendenti"
      subtitle="Gestione dipendenti aziendali (Responsabile Aziendale e inferiori)"
    />
  );
};

export default EmployeesPage;