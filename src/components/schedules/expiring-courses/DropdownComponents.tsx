/**
 * Dropdown Components for ExpiringCoursesSection
 * 
 * Reusable dropdown components for export and import actions.
 */

import React, { useState, useRef, useEffect } from 'react';
import { Download, ChevronDown, Plus, Upload, FileDown, FileSpreadsheet } from 'lucide-react';
import { Button } from '../../../design-system/atoms/Button';

/** Dropdown per il download/esportazione */
export const DownloadDropdown: React.FC<{ onExportCSV: () => void }> = ({ onExportCSV }) => {
    const [open, setOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className="relative" ref={dropdownRef}>
            <Button
                variant="outline"
                size="sm"
                onClick={() => setOpen(!open)}
                className="flex items-center gap-1"
            >
                <Download className="h-4 w-4" />
                Esporta
                <ChevronDown className="h-3 w-3 ml-1" />
            </Button>

            {open && (
                <div className="absolute right-0 mt-1 w-56 bg-white dark:bg-gray-900 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-50">
                    <button
                        onClick={() => { onExportCSV(); setOpen(false); }}
                        className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center gap-2 text-gray-900 dark:text-gray-100"
                    >
                        <FileSpreadsheet className="h-4 w-4 text-green-600 dark:text-green-400" />
                        Esporta dati CSV
                    </button>
                </div>
            )}
        </div>
    );
};

/** Dropdown per import e aggiunta corsi esterni */
export const ImportDropdown: React.FC<{
    onImportCSV: () => void;
    onAddExternal: () => void;
}> = ({ onImportCSV, onAddExternal }) => {
    const [open, setOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const downloadTemplate = () => {
        const headers = ['CodiceFiscale', 'NomeCorso', 'DataCompletamento', 'LivelloRischio', 'TipoCorso', 'Note'];
        const exampleRows = [
            ['RSSMRA80A01H501X', 'Formazione Generale', '15/03/2024', 'BASSO', 'GENERALE', 'Corso esterno'],
            ['VRDLGI75B02F205Y', 'Formazione Specifica', '20/06/2024', 'ALTO', 'SPECIFICA', ''],
        ];

        const csvContent = [
            headers.join(';'),
            ...exampleRows.map(row => row.join(';'))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = 'template-import-corsi-scadenza.csv';
        link.click();
        setOpen(false);
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <Button
                variant="outline"
                size="sm"
                onClick={() => setOpen(!open)}
                className="flex items-center gap-1 text-orange-600 dark:text-orange-400 border-orange-300 dark:border-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/30"
            >
                <Plus className="h-4 w-4" />
                Aggiungi Scadenza
                <ChevronDown className="h-3 w-3 ml-1" />
            </Button>

            {open && (
                <div className="absolute right-0 mt-1 w-64 bg-white dark:bg-gray-900 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-50">
                    <button
                        onClick={() => { onAddExternal(); setOpen(false); }}
                        className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center gap-2 text-gray-900 dark:text-gray-100"
                    >
                        <Plus className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                        <div>
                            <div className="font-medium">Aggiungi singolo corso</div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">Inserimento manuale</div>
                        </div>
                    </button>
                    <div className="border-t border-gray-100 dark:border-gray-700 my-1" />
                    <button
                        onClick={() => { onImportCSV(); setOpen(false); }}
                        className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center gap-2 text-gray-900 dark:text-gray-100"
                    >
                        <Upload className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                        <div>
                            <div className="font-medium">Importa da CSV</div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">Carica file con corsi esterni</div>
                        </div>
                    </button>
                    <button
                        onClick={downloadTemplate}
                        className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center gap-2 text-gray-900 dark:text-gray-100"
                    >
                        <FileDown className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                        <div>
                            <div className="font-medium">Scarica template CSV</div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">Formato: dd/mm/yyyy</div>
                        </div>
                    </button>
                </div>
            )}
        </div>
    );
};
