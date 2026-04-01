import React from 'react';
import { PersonsPage } from '../persons/PersonsPage';
import { FILTER_CONFIGS } from '../../services/roleHierarchyService';

/**
 * Pagina Formatori e RSPP - wrapper per PersonsPage con filtro trainers
 * P60: Rinominata da "Formatori" a "Formatori e RSPP"
 */
export const TrainersPage: React.FC = () => {
  return (
    <PersonsPage
      filter={FILTER_CONFIGS.trainers}
      filterType="trainers"
      title="Formatori e RSPP"
      subtitle="Gestione formatori, coordinatori e RSPP"
    />
  );
};

export default TrainersPage;