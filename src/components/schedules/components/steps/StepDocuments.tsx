import React from 'react';
import { DocumentManager } from '../index';
import type { FormData } from '../../types';

type Person = { id: string | number; firstName: string; lastName: string };
type Training = {
  id: string | number;
  name?: string;
  nome?: string;
  title?: string;
  price?: number;
  prezzo?: number;
  duration?: number | string;
  tipoServizio?: string
};
type Company = { id: string | number; ragioneSociale: string };

interface StepDocumentsProps {
  status: string;
  onStatusChange: (status: string) => void;
  selectedPersons: (string | number)[];
  selectedCompanies: (string | number)[];
  attendance: Record<number, (string | number)[]>;
  dates: FormData['dates'];
  showStatusMenu: boolean;
  onShowStatusMenuChange: (show: boolean) => void;
  scheduleId?: string | number | null;
  trainers?: Array<{ id: string | number; firstName: string; lastName: string }>;
  persons?: Person[];
  selectedCourse?: Training;
  companies?: Company[];
  pendingPreventiviIds?: string[];
  onPendingPreventiviCreated?: (ids: string[]) => void;
}

export const StepDocuments: React.FC<StepDocumentsProps> = ({
  status,
  onStatusChange,
  selectedPersons = [],
  selectedCompanies = [],
  attendance = {},
  dates = [],
  showStatusMenu,
  onShowStatusMenuChange,
  scheduleId,
  trainers = [],
  persons = [],
  selectedCourse,
  companies = [],
  pendingPreventiviIds = [],
  onPendingPreventiviCreated
}) => {
  return (
    <DocumentManager
      status={status}
      onStatusChange={onStatusChange}
      selectedPersons={selectedPersons}
      selectedCompanies={selectedCompanies}
      attendance={attendance}
      dates={dates}
      showStatusMenu={showStatusMenu}
      onShowStatusMenuChange={onShowStatusMenuChange}
      scheduleId={scheduleId}
      trainers={trainers}
      persons={persons}
      selectedCourse={selectedCourse}
      companies={companies}
      pendingPreventiviIds={pendingPreventiviIds}
      onPendingPreventiviCreated={onPendingPreventiviCreated}
    />
  );
};

export default StepDocuments;
