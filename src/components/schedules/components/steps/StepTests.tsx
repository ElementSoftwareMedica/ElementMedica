/**
 * StepTests - Step 4 del ScheduleEventModal
 * Gestisce la selezione e invio dei test per il corso programmato
 */

import React from 'react';
import { FileQuestion, Info } from 'lucide-react';
import TestManager from '../TestManager';

interface Person {
    id: string | number;
    firstName: string;
    lastName: string;
    email?: string;
}

interface StepTestsProps {
    scheduleId?: string | number | null;
    courseId?: string;
    riskLevel?: string;
    courseType?: string;
    selectedPersons: (string | number)[];
    persons: Person[];
    attendance: Record<number, (string | number)[]>;
    onSendTest?: (testId: string, personIds: string[]) => void;
}

export const StepTests: React.FC<StepTestsProps> = ({
    scheduleId,
    courseId,
    riskLevel,
    courseType,
    selectedPersons,
    persons,
    attendance,
    onSendTest
}) => {
    // Filtra solo le persone selezionate
    const selectedPersonsData = persons.filter(p =>
        selectedPersons.includes(p.id) || selectedPersons.includes(String(p.id))
    );

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center gap-2 mb-4">
                <FileQuestion className="h-5 w-5 text-blue-600" />
                <h3 className="text-lg font-semibold text-gray-900">
                    Test e Valutazioni
                </h3>
            </div>

            {/* Info box */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <div className="flex items-start">
                    <Info className="h-5 w-5 text-blue-600 mr-3 mt-0.5 flex-shrink-0" />
                    <div className="text-sm text-blue-800">
                        <p className="font-medium mb-1">Test Automatici</p>
                        <p>
                            I test mostrati sono configurati per questo tipo di corso
                            {riskLevel && ` (Rischio: ${riskLevel})`}
                            {courseType && ` (${courseType === 'PRIMO_CORSO' ? 'Primo Corso' : 'Aggiornamento'})`}.
                        </p>
                        {!scheduleId && (
                            <p className="mt-2 text-blue-600">
                                💡 Salva prima il corso programmato per poter inviare i test ai partecipanti.
                            </p>
                        )}
                    </div>
                </div>
            </div>

            {/* Test Manager */}
            {courseId ? (
                <TestManager
                    scheduleId={scheduleId}
                    courseId={courseId}
                    riskLevel={riskLevel}
                    courseType={courseType}
                    persons={selectedPersonsData}
                    attendance={attendance}
                    onSendTest={onSendTest}
                    readOnly={!scheduleId}
                />
            ) : (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
                    <FileQuestion className="h-10 w-10 text-yellow-400 mx-auto mb-3" />
                    <h4 className="text-lg font-medium text-yellow-800 mb-1">
                        Seleziona un Corso
                    </h4>
                    <p className="text-sm text-yellow-700">
                        Torna allo Step 1 e seleziona un corso per visualizzare i test disponibili.
                    </p>
                </div>
            )}

            {/* Partecipanti count */}
            {selectedPersonsData.length > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                    <p className="text-sm text-gray-600">
                        <strong>{selectedPersonsData.length}</strong> partecipanti selezionati per ricevere i test
                    </p>
                </div>
            )}
        </div>
    );
};

export default StepTests;
