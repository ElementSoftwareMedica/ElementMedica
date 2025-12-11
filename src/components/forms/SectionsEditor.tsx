import React, { useState } from 'react';
import { Button } from '../../design-system/atoms/Button';
import { Plus, Trash2, GripVertical, ChevronDown, ChevronUp, Settings } from 'lucide-react';
import { useConfirmDialog } from '../../contexts/ConfirmDialogContext';

export interface FormSection {
  id: string;
  title: string;
  description?: string;
  order: number;
  collapsible?: boolean;
  conditional?: {
    simple?: {
      field: string;
      operator: string;
      value: any;
    };
    complex?: any;
  };
}

interface SectionsEditorProps {
  sections: FormSection[];
  onChange: (sections: FormSection[]) => void;
  availableFields: Array<{ name: string; label: string }>;
}

export const SectionsEditor: React.FC<SectionsEditorProps> = ({
  sections,
  onChange,
  availableFields
}) => {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [editingConditional, setEditingConditional] = useState<string | null>(null);
  const { confirmDelete } = useConfirmDialog();

  const addSection = () => {
    const newSection: FormSection = {
      id: `section-${Date.now()}`,
      title: `Sezione ${sections.length + 1}`,
      description: '',
      order: sections.length,
      collapsible: true
    };
    onChange([...sections, newSection]);
  };

  const deleteSection = async (id: string) => {
    const confirmed = await confirmDelete('Vuoi eliminare questa sezione?');
    if (confirmed) {
      onChange(sections.filter(s => s.id !== id));
    }
  };

  const updateSection = (id: string, updates: Partial<FormSection>) => {
    onChange(
      sections.map(s => s.id === id ? { ...s, ...updates } : s)
    );
  };

  const toggleExpand = (id: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedSections(newExpanded);
  };

  const moveSection = (index: number, direction: 'up' | 'down') => {
    const newSections = [...sections];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;

    if (targetIndex >= 0 && targetIndex < sections.length) {
      [newSections[index], newSections[targetIndex]] = [newSections[targetIndex], newSections[index]];
      newSections.forEach((section, idx) => {
        section.order = idx;
      });
      onChange(newSections);
    }
  };

  const addConditional = (sectionId: string) => {
    setEditingConditional(sectionId);
  };

  const saveConditional = (sectionId: string, field: string, operator: string, value: string) => {
    updateSection(sectionId, {
      conditional: {
        simple: { field, operator, value }
      }
    });
    setEditingConditional(null);
  };

  const removeConditional = (sectionId: string) => {
    updateSection(sectionId, { conditional: undefined });
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Sezioni Form</h3>
        <Button onClick={addSection} size="sm" leftIcon={<Plus size={16} />}>
          Aggiungi Sezione
        </Button>
      </div>

      {sections.length === 0 && (
        <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
          <p className="text-gray-500 mb-3">Nessuna sezione configurata</p>
          <p className="text-sm text-gray-400 mb-4">
            Le sezioni permettono di organizzare i campi e applicare logica condizionale
          </p>
          <Button onClick={addSection} size="sm" leftIcon={<Plus size={16} />}>
            Crea Prima Sezione
          </Button>
        </div>
      )}

      <div className="space-y-3">
        {sections.map((section, index) => (
          <div
            key={section.id}
            className="border border-gray-200 rounded-lg bg-white shadow-sm"
          >
            {/* Section Header */}
            <div className="flex items-center gap-2 p-3 bg-gray-50 border-b border-gray-200">
              <div className="flex flex-col gap-1">
                <button
                  onClick={() => moveSection(index, 'up')}
                  disabled={index === 0}
                  className="text-gray-400 hover:text-gray-600 disabled:opacity-30"
                >
                  <ChevronUp size={16} />
                </button>
                <button
                  onClick={() => moveSection(index, 'down')}
                  disabled={index === sections.length - 1}
                  className="text-gray-400 hover:text-gray-600 disabled:opacity-30"
                >
                  <ChevronDown size={16} />
                </button>
              </div>

              <GripVertical size={20} className="text-gray-400" />

              <div className="flex-1">
                <input
                  type="text"
                  value={section.title}
                  onChange={(e) => updateSection(section.id, { title: e.target.value })}
                  className="font-medium text-gray-900 bg-transparent border-0 focus:ring-0 w-full"
                  placeholder="Titolo sezione"
                />
              </div>

              <button
                onClick={() => toggleExpand(section.id)}
                className="text-gray-500 hover:text-gray-700"
              >
                {expandedSections.has(section.id) ? (
                  <ChevronUp size={20} />
                ) : (
                  <ChevronDown size={20} />
                )}
              </button>

              <button
                onClick={() => deleteSection(section.id)}
                className="text-red-500 hover:text-red-700"
              >
                <Trash2 size={18} />
              </button>
            </div>

            {/* Section Body (Expanded) */}
            {expandedSections.has(section.id) && (
              <div className="p-4 space-y-4">
                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Descrizione
                  </label>
                  <textarea
                    value={section.description || ''}
                    onChange={(e) => updateSection(section.id, { description: e.target.value })}
                    placeholder="Descrizione opzionale della sezione"
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Collapsible Toggle */}
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id={`collapsible-${section.id}`}
                    checked={section.collapsible || false}
                    onChange={(e) => updateSection(section.id, { collapsible: e.target.checked })}
                    className="rounded border-gray-300"
                  />
                  <label htmlFor={`collapsible-${section.id}`} className="text-sm text-gray-700">
                    Sezione collassabile
                  </label>
                </div>

                {/* Conditional Logic */}
                <div className="border-t border-gray-200 pt-4">
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-sm font-medium text-gray-700">
                      Logica Condizionale
                    </label>
                    {section.conditional ? (
                      <button
                        onClick={() => removeConditional(section.id)}
                        className="text-xs text-red-600 hover:text-red-800"
                      >
                        Rimuovi
                      </button>
                    ) : (
                      <button
                        onClick={() => addConditional(section.id)}
                        className="text-xs text-blue-600 hover:text-blue-800"
                      >
                        + Aggiungi Condizione
                      </button>
                    )}
                  </div>

                  {section.conditional?.simple && (
                    <div className="bg-blue-50 border border-blue-200 rounded-md p-3 text-sm">
                      <p className="text-gray-700">
                        Mostra quando <span className="font-semibold">{section.conditional.simple.field}</span>{' '}
                        {section.conditional.simple.operator === 'equals' ? '=' : section.conditional.simple.operator}{' '}
                        <span className="font-semibold">"{section.conditional.simple.value}"</span>
                      </p>
                    </div>
                  )}

                  {editingConditional === section.id && (
                    <div className="bg-gray-50 border border-gray-300 rounded-md p-3 space-y-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Campo di riferimento
                        </label>
                        <select
                          id={`cond-field-${section.id}`}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                          defaultValue=""
                        >
                          <option value="">Seleziona campo...</option>
                          {availableFields.map(field => (
                            <option key={field.name} value={field.name}>
                              {field.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Operatore
                        </label>
                        <select
                          id={`cond-op-${section.id}`}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                          defaultValue="equals"
                        >
                          <option value="equals">Uguale a (=)</option>
                          <option value="not_equals">Diverso da (≠)</option>
                          <option value="contains">Contiene</option>
                          <option value="greater_than">Maggiore di (&gt;)</option>
                          <option value="less_than">Minore di (&lt;)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Valore
                        </label>
                        <input
                          type="text"
                          id={`cond-value-${section.id}`}
                          placeholder="Valore di confronto"
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                        />
                      </div>

                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => {
                            const field = (document.getElementById(`cond-field-${section.id}`) as HTMLSelectElement).value;
                            const operator = (document.getElementById(`cond-op-${section.id}`) as HTMLSelectElement).value;
                            const value = (document.getElementById(`cond-value-${section.id}`) as HTMLInputElement).value;
                            if (field && value) {
                              saveConditional(section.id, field, operator, value);
                            } else {
                              alert('Seleziona campo e inserisci valore');
                            }
                          }}
                        >
                          Salva
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => setEditingConditional(null)}
                        >
                          Annulla
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {sections.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-medium text-blue-900 mb-2">💡 Guida Sezioni</h4>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Le sezioni organizzano i campi del form in gruppi logici</li>
            <li>• Puoi riordinare le sezioni usando le frecce</li>
            <li>• Aggiungi condizioni per mostrare sezioni in base alle risposte</li>
            <li>• Esempio: Mostra "Dati Azienda" solo se "Tipo Utente" = "Azienda"</li>
          </ul>
        </div>
      )}
    </div>
  );
};
