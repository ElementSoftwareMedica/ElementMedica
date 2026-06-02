import React, { useEffect } from 'react';
import { Input } from '../../../design-system/atoms/Input';
import { Label } from '../../../design-system/atoms/Label';
import Select from 'react-select';
import AsyncSelect from 'react-select/async';
import { normalizeText as normalizeTextUtil, extractCourses as extractCoursesUtil } from '../utils';
import { apiGet } from '../../../services/api';
import { SelectionPills } from '../../../design-system/molecules/SelectionPills/SelectionPills';
import type { SelectionPillAction } from '../../../design-system/molecules/SelectionPills/SelectionPills';

// Sostituisci i tipi locali con alias ai tipi condivisi per evitare divergenze
type Training = import('../utils').Training;
type Trainer = import('../utils').Trainer;

interface CourseDetailsFormProps {
  trainings: Training[];
  trainers: Trainer[];
  formData: {
    training_id: string | number;
    trainer_id: string | number;
    co_trainer_id: string | number;
    location: string;
    max_participants: number;
    notes: string;
    delivery_mode?: string;
    risk_level?: string;
    course_type?: string;
    isPublic?: boolean;
  };
  onFormDataChange: (field: string, value: unknown) => void;
  selectedCourse: Training | undefined;
  filteredTrainers: Trainer[];
  coTrainerOptions: Trainer[];
  courseSearch: string;
  onCourseSearchChange: (search: string) => void;
  DELIVERY_MODES: Array<{ value: string; label: string }>;
  RISK_LEVEL_OPTIONS?: Array<{ value: string; label: string }>;
  COURSE_TYPE_OPTIONS?: Array<{ value: string; label: string }>;
  onCourseSelected?: (course: Training | undefined) => void;
  // Nuovo: conteggio varianti rilevate per il corso selezionato
  variantsCount?: number;
}

interface CourseOption {
  value: string;
  label: string;
}

interface GroupedCourseOption {
  label: string;
  options: CourseOption[];
}

export const CourseDetailsForm: React.FC<CourseDetailsFormProps> = ({
  trainings = [],
  formData,
  onFormDataChange,
  selectedCourse,
  filteredTrainers,
  courseSearch,
  onCourseSearchChange,
  DELIVERY_MODES,
  RISK_LEVEL_OPTIONS,
  COURSE_TYPE_OPTIONS,
  onCourseSelected,
  // Aggiunto: conteggio varianti per logica pillole
  variantsCount,
}) => {

  // Build unique course options by macro-corso (unique title/name)
  const uniqueCourseOptions = React.useMemo(() => {
    const titles = new Set<string>();
    trainings.forEach((t: Training) => {
      const title = t.title || t.name || `Corso ${t.id}`;
      titles.add(title);
    });
    return Array.from(titles)
      .sort((a, b) => a.localeCompare(b))
      .map(title => ({ value: title, label: title }));
  }, [trainings]);

  // Evita clipping del menu dentro il modal e prefetch iniziale se non ho corsi locali
  const menuPortalTarget = typeof window !== 'undefined' ? document.body : undefined;
  // Se ho poche opzioni locali, lascia che AsyncSelect faccia prefetch dal server
  const defaultCourseOptions = uniqueCourseOptions.length >= 10 ? uniqueCourseOptions : true;
  const selectedCourseOption =
    selectedCourse
      ? { value: selectedCourse.title || selectedCourse.name, label: selectedCourse.title || selectedCourse.name }
      : null;

  // FIX: Usa formData come fonte di verità per la selezione corrente delle pillole
  // selectedCourse.riskLevel/courseType sono solo suggerimenti iniziali, non sovrascrivono la selezione utente
  const riskValue = (formData.risk_level as string) || '';
  const courseTypeValue = (formData.course_type as string) || '';

  // AUTOSELEZIONE: se esiste una sola opzione valida e nessun valore impostato, seleziona automaticamente
  useEffect(() => {
    if (!riskValue && RISK_LEVEL_OPTIONS && RISK_LEVEL_OPTIONS.length === 1) {
      onFormDataChange('risk_level', RISK_LEVEL_OPTIONS[0].value);
    }
  }, [riskValue, RISK_LEVEL_OPTIONS, onFormDataChange]);

  useEffect(() => {
    if (!courseTypeValue && COURSE_TYPE_OPTIONS && COURSE_TYPE_OPTIONS.length === 1) {
      onFormDataChange('course_type', COURSE_TYPE_OPTIONS[0].value);
    }
  }, [courseTypeValue, COURSE_TYPE_OPTIONS, onFormDataChange]);

  interface SelectStylesBase {
    [key: string]: unknown;
  }

  const selectStyles = {
    control: (base: SelectStylesBase) => ({
      ...base,
      borderRadius: 9999,
      minHeight: 40
    }),
    valueContainer: (base: SelectStylesBase) => ({ ...base, paddingLeft: 14, paddingRight: 14 }),
    indicatorsContainer: (base: SelectStylesBase) => ({ ...base, paddingRight: 8 })
  } as const;

  const extractCourses = extractCoursesUtil;

  const normalizeText = normalizeTextUtil;

  const loadCourseOptions = async (inputValue: string) => {
    try {
      const termRaw = inputValue || '';
      const term = encodeURIComponent(termRaw);

      let items: Training[] = [];

      // Helper: tenta fetch mirato delle varianti lato server (evita chiamate "all courses" costose)
      const fetchVariantsBySearch = async (q: string): Promise<Training[]> => {
        try {
          const res = await apiGet(`/api/v1/courses/variants?search=${encodeURIComponent(q)}`);
          return extractCourses(res);
        } catch (e) {
          try {
            const pubRes = await apiGet(`/api/v1/public/courses?search=${encodeURIComponent(q)}&limit=50`);
            return extractCourses(pubRes);
          } catch (pubErr) {
            return [] as Training[];
          }
        }
      };

      // 1) Se non c'è input, usa PRIMA i trainings props (già caricati da Dashboard)
      if (!termRaw) {
        // ✅ PRIORITY 1: Usa trainings props se disponibili (evita richieste duplicate)
        if (trainings && trainings.length > 0) {
          if (process.env.NODE_ENV === 'development') {
          }
          const map = new Map<string, Training>();
          const pushUnique = (arr: Training[]) => {
            arr.forEach((c) => {
              const rawTitle = (c?.title || c?.name || `Corso ${c?.id}`) as string;
              const key = normalizeText(rawTitle);
              if (!map.has(key)) map.set(key, c);
            });
          };
          pushUnique(trainings);
          items = Array.from(map.values()).slice(0, 500);

          // ✅ NON ricaricare da server se abbiamo già i dati!
          // Questo evita timeout da RequestThrottler
        } else {
          // ✅ FALLBACK: Solo se trainings props è vuoto, allora ricarica
          if (process.env.NODE_ENV === 'development') {
          }
          try {
            const { getCourses } = await import('../../../services/courses');
            const allCourses = await getCourses();
            if (allCourses && allCourses.length > 0) {
              const map = new Map<string, Training>();
              const pushUnique = (arr: Training[]) => {
                arr.forEach((c) => {
                  const rawTitle = (c?.title || c?.name || `Corso ${c?.id}`) as string;
                  const key = normalizeText(rawTitle);
                  if (!map.has(key)) map.set(key, c);
                });
              };
              pushUnique(allCourses as Training[]);
              items = Array.from(map.values()).slice(0, 500);
            }
          } catch (serverError) {
            // Ultimo fallback: corsi pubblici
            try {
              const pubRes = await apiGet(`/api/v1/public/courses?limit=100`);
              items = extractCourses(pubRes);
            } catch (apiError) {
              items = [];
            }
          }
        }
      } else {
        // 2) Con input, prima filtro localmente, altrimenti fetch mirato varianti -> fallback pubblici
        if (trainings && trainings.length > 0) {
          const localFiltered = trainings.filter((c: Training) => {
            const title = (c?.title || c?.name || '').toLowerCase();
            return title.includes(termRaw.toLowerCase());
          });
          if (localFiltered.length > 0) {
            items = localFiltered.slice(0, 100);
          } else {
            items = await fetchVariantsBySearch(termRaw);
          }
        } else {
          items = await fetchVariantsBySearch(termRaw);
        }
      }

      // 3) Raggruppa per macro-corso (titolo) e restituisci opzioni uniche
      const groupedByTitle = new Map<string, { value: string; label: string }>();
      items.forEach((c: Training) => {
        const rawTitle = (c?.title || c?.name || `Corso ${c?.id}`) as string;
        const key = normalizeText(rawTitle);
        if (!groupedByTitle.has(key)) {
          groupedByTitle.set(key, { value: rawTitle, label: rawTitle });
        }
      });
      return Array.from(groupedByTitle.values()).sort((a, b) => a.label.localeCompare(b.label));
    } catch {
      // Fallback migliorato: usa sempre i trainings passati come props
      if (trainings && trainings.length > 0) {
        const groupedByTitle = new Map<string, { value: string; label: string }>();
        trainings.forEach((c: Training) => {
          const rawTitle = (c?.title || c?.name || `Corso ${c?.id}`) as string;
          const key = normalizeText(rawTitle);
          if (!groupedByTitle.has(key) && (!inputValue || rawTitle.toLowerCase().includes(inputValue.toLowerCase()))) {
            groupedByTitle.set(key, { value: rawTitle, label: rawTitle });
          }
        });
        return Array.from(groupedByTitle.values()).sort((a, b) => a.label.localeCompare(b.label));
      }

      return [];
    }
  };

  //Azioni per le pillole di rischio e tipo
  const riskActions: SelectionPillAction[] = (RISK_LEVEL_OPTIONS || []).map(opt => ({
    label: opt.label,
    onClick: () => onFormDataChange('risk_level', opt.value === riskValue ? '' : opt.value),
    variant: (opt.value === riskValue ? 'primary' : 'secondary') as 'primary' | 'secondary'
  }));

  const typeActions: SelectionPillAction[] = (COURSE_TYPE_OPTIONS || []).map(opt => ({
    label: opt.label,
    onClick: () => onFormDataChange('course_type', opt.value === courseTypeValue ? '' : opt.value),
    variant: (opt.value === courseTypeValue ? 'primary' : 'secondary') as 'primary' | 'secondary'
  }));

  // Fix: I campi devono essere abilitati quando c'è un corso selezionato E ci sono opzioni disponibili
  const hasRiskOptions = Array.isArray(RISK_LEVEL_OPTIONS) && RISK_LEVEL_OPTIONS.length > 0;
  const hasTypeOptions = Array.isArray(COURSE_TYPE_OPTIONS) && COURSE_TYPE_OPTIONS.length > 0;
  const riskDisabled = !selectedCourse || !hasRiskOptions;
  const typeDisabled = !selectedCourse || !hasTypeOptions;

  // Se ci sono più varianti (>1), non mostrare "Non applicabile" per evitare confusione
  const multipleVariants = (typeof variantsCount === 'number' ? variantsCount : 0) > 1;
  const showRiskNonApplicable = riskDisabled && !multipleVariants;
  const showTypeNonApplicable = typeDisabled && !multipleVariants;

  // Log di diagnostica leggero per le pillole (solo in sviluppo)
  useEffect(() => {
    if (typeof window !== 'undefined' && (import.meta?.env?.MODE === 'development')) {
    }
  }, [
    selectedCourse,
    variantsCount,
    riskDisabled,
    typeDisabled,
    riskValue,
    courseTypeValue,
    RISK_LEVEL_OPTIONS,
    COURSE_TYPE_OPTIONS,
    multipleVariants,
    showRiskNonApplicable,
    showTypeNonApplicable,
  ]);

  return (
    <div className="space-y-6">
      <h3 className="font-semibold text-gray-700 dark:text-gray-300">Dettagli del Corso</h3>

      {/* Course Selection - unique options by macro-corso */}
      <div className="mb-6">
        <Label>Corso *</Label>
        <AsyncSelect
          cacheOptions
          defaultOptions={defaultCourseOptions}
          loadOptions={loadCourseOptions}
          value={selectedCourseOption}
          onChange={async (option) => {
            if (!option) {
              onFormDataChange('training_id', '');
              onFormDataChange('risk_level', '');
              onFormDataChange('course_type', '');
              onCourseSelected?.(undefined);
              onCourseSearchChange('');
              return;
            }
            const macroTitle = (option as { value: string; label: string }).value as string;
            // Non resettare training_id, solo risk_level e course_type
            onFormDataChange('risk_level', '');
            onFormDataChange('course_type', '');

            // Cerca il corso completo nei trainings per avere tutti i dati necessari
            const fullCourse = trainings.find(t =>
              (t.title || t.name) === macroTitle
            );

            if (fullCourse) {
              // Usa il corso completo trovato nei trainings e imposta training_id
              onFormDataChange('training_id', fullCourse.id);
              onCourseSelected?.(fullCourse);
            } else {
              // Fallback: resetta training_id e crea un oggetto con il titolo per permettere la ricerca delle varianti
              onFormDataChange('training_id', '');
              onCourseSelected?.({
                id: '',
                title: macroTitle,
                name: macroTitle,
                // Aggiungi campi minimi per evitare errori
                duration: undefined,
                certifications: [],
                riskLevel: undefined,
                courseType: undefined
              } as Training);
            }
            onCourseSearchChange('');
          }}
          noOptionsMessage={() => courseSearch ? 'Nessun corso trovato: prova con parole chiave diverse' : 'Inizia a digitare per cercare'}
          placeholder="Seleziona un corso"
          isClearable
          classNamePrefix="react-select"
          styles={{
            ...selectStyles,
            menuPortal: (base: SelectStylesBase) => ({ ...base, zIndex: 9999 })
          }}
          menuPortalTarget={menuPortalTarget}
          inputValue={courseSearch}
          onInputChange={(value, meta) => {
            if (meta.action === 'input-change') onCourseSearchChange(value);
          }}
        />

        {selectedCourse && ((
          (selectedCourse.duration ||
            ((Array.isArray(selectedCourse?.certifications)
              ? selectedCourse!.certifications
              : (typeof selectedCourse?.certifications === 'string'
                ? (selectedCourse!.certifications as unknown as string).split(',').map((c: string) => c.trim()).filter(Boolean)
                : [] as string[])
            ).length > 0) ||
            selectedCourse.riskLevel ||
            selectedCourse.courseType)
        ) && false
        )}

        {/* Risk Level + Course Type side-by-side */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 mt-8">
          <div>
            <Label>{`Livello di Rischio${hasRiskOptions ? ' *' : ''}`}</Label>
            {showRiskNonApplicable ? (
              <div className="text-sm text-gray-500 dark:text-gray-400 py-2">Non applicabile per questo corso</div>
            ) : (
              hasRiskOptions ? <SelectionPills actions={riskActions} className="mt-1" /> : null
            )}
          </div>

          <div>
            <Label>{`Tipo Corso${hasTypeOptions ? ' *' : ''}`}</Label>
            {showTypeNonApplicable ? (
              <div className="text-sm text-gray-500 dark:text-gray-400 py-2">Non applicabile per questo corso</div>
            ) : (
              hasTypeOptions ? <SelectionPills actions={typeActions} className="mt-1" /> : null
            )}
          </div>
        </div>

        {/* Location + Delivery Mode side-by-side */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <Label>Luogo</Label>
            <Input
              type="text"
              placeholder="Inserisci il luogo del corso"
              value={formData.location}
              onChange={(e) => onFormDataChange('location', e.target.value)}
            />
          </div>
          <div>
            <Label>Modalità di Erogazione *</Label>
            <Select
              value={DELIVERY_MODES?.find(mode => mode.value === formData.delivery_mode) || null}
              onChange={(option) => onFormDataChange('delivery_mode', option ? option.value : '')}
              options={DELIVERY_MODES || []}
              placeholder="Seleziona modalità"
              isClearable
              classNamePrefix="react-select"
              styles={selectStyles}
            />
          </div>
        </div>

        {/* Public Calendar Toggle - Integrated with layout */}
        <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-indigo-50 to-blue-50 dark:from-indigo-900/30 dark:to-blue-900/30 rounded-lg border border-indigo-200 dark:border-indigo-700 shadow-sm">
          <div className="flex-shrink-0">
            <input
              type="checkbox"
              id="isPublic"
              checked={formData.isPublic || false}
              onChange={(e) => onFormDataChange('isPublic', e.target.checked)}
              className="w-5 h-5 text-indigo-600 border-gray-300 dark:border-gray-600 rounded focus:ring-indigo-500 cursor-pointer dark:bg-gray-700"
            />
          </div>
          <label htmlFor="isPublic" className="flex-1 cursor-pointer">
            <div className="flex items-center gap-2">
              <span className="font-medium text-gray-900 dark:text-gray-100">🌐 Visibile nel Calendario Pubblico</span>
              {formData.isPublic && (
                <span className="px-2 py-0.5 text-xs bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-400 rounded-full font-medium">
                  Attivo
                </span>
              )}
            </div>
            <span className="text-sm text-gray-500 dark:text-gray-400 mt-0.5 block">
              Rendi questo corso visibile nel calendario pubblico del sito web
            </span>
          </label>
        </div>
      </div>
    </div>
  );
};

export default CourseDetailsForm;