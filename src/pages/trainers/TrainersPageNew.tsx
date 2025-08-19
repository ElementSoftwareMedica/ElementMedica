import React from 'react';
import { PersonsPage } from '../persons/PersonsPage';
import { FILTER_CONFIGS } from '../../services/roleHierarchyService';

/**
 * Pagina Formatori - wrapper per PersonsPage con filtro trainers
 */
export const TrainersPage: React.FC = () => {
  return (
    <PersonsPage
      filter={FILTER_CONFIGS.trainers}
      filterType="trainers"
      title="Formatori"
      subtitle="Gestione formatori e coordinatori (Coordinatore Formatori e inferiori)"
    />
  );
};

export default TrainersPage;