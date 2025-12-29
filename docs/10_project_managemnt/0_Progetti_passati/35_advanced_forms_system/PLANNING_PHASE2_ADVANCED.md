# Advanced Forms System - Phase 2: Planning Dettagliato

**Data**: 17 Novembre 2025  
**Manager**: Matteo Michielon  
**Priorità**: Critica  
**Durata Stimata**: 12 giorni (96 ore)

---

## 🎯 Obiettivi Phase 2

### Fixes Critici Identificati
1. ✅ **FormTemplatesPage UI Redesign** - Layout migliorato, dropdown actions, bulk delete
2. ✅ **Field Type Icon Fix** - Icone corrette per dropdown field types
3. ✅ **Field Type Edit Bug** - Fix visualizzazione tipo campo durante edit
4. ✅ **Validation Rules UI** - Aggiungere conditional validation nel builder
5. ✅ **Conditional Logic Complete** - Implementare tutti i 30 operatori

### Nuove Features
6. ✅ **Form Builder Page** - Pagina completa per creare/modificare form
7. ✅ **Submissions Dashboard** - Visualizzazione e gestione risposte
8. ✅ **Advanced Conditional Logic** - 30 tipi di condizioni
9. ✅ **Entity Mapping** - Collegamento campi → entità DB
10. ✅ **File Upload** - Gestione allegati

---

## 📦 Task Breakdown

### ✅ FASE 2.1: Fix Critici UI (2 giorni - 16h)

#### Task 2.1.1: FormTemplatesPage Redesign (6h)

**Problemi Attuali**:
```
❌ Layout poco attraente e disorganizzato
❌ Colonna "Azioni" in fondo invece che prima
❌ Azioni come icone sparse invece di dropdown
❌ Manca search bar
❌ Manca filtro per tipo/stato
❌ Manca bulk delete con checkboxes
```

**Obiettivo**: Redesign completo pagina con layout moderno

**Checklist**:
- [ ] **Header Section**
  ```tsx
  <div className="flex justify-between items-center mb-6">
    <div>
      <h1>Form Templates</h1>
      <p className="text-gray-600">Gestisci i moduli dell'applicazione</p>
    </div>
    <Button variant="primary" onClick={handleCreate}>
      <Plus /> Nuovo Form
    </Button>
  </div>
  ```

- [ ] **Filters Bar**
  ```tsx
  <div className="flex gap-4 mb-4">
    <Input 
      placeholder="Cerca per nome..."
      value={searchQuery}
      onChange={setSearchQuery}
      icon={<Search />}
    />
    <Select 
      options={FORM_TYPES}
      value={filterType}
      onChange={setFilterType}
      placeholder="Tutti i tipi"
    />
    <Select 
      options={[{label: 'Attivi', value: true}, {label: 'Inattivi', value: false}]}
      value={filterActive}
      onChange={setFilterActive}
      placeholder="Tutti gli stati"
    />
    {hasSelected && (
      <Button variant="danger" onClick={handleBulkDelete}>
        <Trash2 /> Elimina ({selectedCount})
      </Button>
    )}
  </div>
  ```

- [ ] **Table Redesign**
  ```tsx
  <Table>
    <thead>
      <tr>
        <th width="40px">
          <Checkbox 
            checked={allSelected}
            onChange={toggleSelectAll}
          />
        </th>
        <th width="120px">Azioni</th>  {/* PRIMA COLONNA */}
        <th>Nome</th>
        <th>Tipo</th>
        <th>Campi</th>
        <th>Stato</th>
        <th>Risposte</th>
        <th>Ultimo Aggiornamento</th>
      </tr>
    </thead>
    <tbody>
      {templates.map(template => (
        <tr key={template.id}>
          <td>
            <Checkbox 
              checked={selected.includes(template.id)}
              onChange={() => toggleSelect(template.id)}
            />
          </td>
          <td>
            <DropdownMenu>
              <DropdownMenuItem onClick={() => handleView(template)}>
                <Eye /> Visualizza Risposte
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleEdit(template)}>
                <Edit /> Modifica
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleDuplicate(template)}>
                <Copy /> Duplica
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={() => handleToggleActive(template)}
                variant={template.isActive ? 'default' : 'success'}
              >
                {template.isActive ? <EyeOff /> : <Eye />}
                {template.isActive ? 'Disattiva' : 'Attiva'}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={() => handleDelete(template)}
                variant="danger"
              >
                <Trash2 /> Elimina
              </DropdownMenuItem>
            </DropdownMenu>
          </td>
          <td>
            <div className="flex items-center gap-2">
              <span className="font-medium">{template.name}</span>
              {template.isPublic && <Globe className="w-4 h-4 text-blue-500" />}
            </div>
            {template.description && (
              <p className="text-sm text-gray-500">{template.description}</p>
            )}
          </td>
          <td><Badge variant={getTypeVariant(template.type)}>{template.type}</Badge></td>
          <td>{template.fields?.length || 0}</td>
          <td>
            <Badge variant={template.isActive ? 'success' : 'default'}>
              {template.isActive ? 'Attivo' : 'Inattivo'}
            </Badge>
          </td>
          <td>{template.submissionsCount || 0}</td>
          <td>{formatDate(template.updatedAt)}</td>
        </tr>
      ))}
    </tbody>
  </Table>
  ```

**Files da Modificare**:
- `src/pages/forms/FormTemplatesPage.tsx`

**Deliverable**: Pagina redesign completa con screenshot

---

#### Task 2.1.2: Field Type Icons Fix (2h)

**Problema Attuale**:
```
❌ Dropdown field types usa icone generiche
❌ Stile non coerente con resto app
```

**Obiettivo**: Icone lucide-react per ogni field type

**Mapping Icone**:
```typescript
import {
  Type, Mail, Phone, MessageSquare, List, CheckSquare,
  Circle, Calendar, Hash, FileText, FileUp,
  ListChecks, CircleDot, CheckCircle2, Globe,
  Home, CreditCard, User, Star, Sliders
} from 'lucide-react';

const FIELD_TYPE_ICONS = {
  text: Type,
  email: Mail,
  tel: Phone,
  textarea: MessageSquare,
  select: List,
  checkbox: CheckSquare,
  radio: Circle,
  date: Calendar,
  number: Hash,
  file: FileUp,
  
  // Test/Quiz
  multiple_choice: ListChecks,
  single_choice: CircleDot,
  true_false: CheckCircle2,
  fill_in_blank: FileText,
  
  // Anagrafiche
  address: Home,
  fiscal_code: CreditCard,
  vat_number: CreditCard,
  phone_number: Phone,
  
  // Utility
  section_header: Type,
  html_content: Globe,
  signature: User,
  rating: Star,
  slider: Sliders
};

const getFieldTypeIcon = (type: FormFieldType) => {
  const Icon = FIELD_TYPE_ICONS[type] || Type;
  return <Icon className="w-4 h-4" />;
};
```

**Checklist**:
- [ ] Creare utility `getFieldTypeIcon()` in `src/utils/formFieldIcons.ts`
- [ ] Aggiornare Select field type per usare icone
- [ ] Aggiungere colore distintivo per categorie (test=purple, anagrafica=blue, base=gray)
- [ ] Test visual su tutti i field types

**Files da Modificare**:
- `src/utils/formFieldIcons.ts` (NEW)
- `src/components/forms/FieldTypeSelector.tsx` (se esiste)

**Deliverable**: Dropdown con icone corrette

---

#### Task 2.1.3: Field Type Edit Bug Fix (4h)

**Problema Attuale**:
```
❌ Edit form con multiple_choice/single_choice mostra "text" invece del tipo reale
```

**Root Cause Analysis**:
```typescript
// PROBLEMA: Nel edit, il campo type non viene estratto correttamente da JSON
const loadFormData = async () => {
  const template = await getFormTemplate(id);
  const fields = template.fields.map(field => ({
    ...field,
    // ❌ Se field.type è salvato in field.options.type o field.metadata.type
    //    invece che direttamente in field.type, non viene letto
    type: field.type || 'text'  // ← Fallback errato
  }));
};
```

**Soluzione**:
```typescript
// 1. Verificare dove viene salvato il tipo nel DB
const inspectFieldStructure = (field) => {
  console.log('Field DB structure:', {
    id: field.id,
    name: field.name,
    type: field.type,                    // Colonna type
    options: field.options,              // JSON
    metadata: field.metadata,            // Se esiste
    validation: field.validation         // JSON
  });
};

// 2. Normalizzare il tipo durante il load
const normalizeFieldType = (field) => {
  // Priorità: field.type > field.options?.type > field.metadata?.type
  return field.type 
    || field.options?.type 
    || field.metadata?.fieldType 
    || 'text';
};

// 3. Durante il save, assicurarsi che type sia nella colonna corretta
const saveField = (field) => {
  return {
    ...field,
    type: field.type,  // Colonna DB
    options: {
      ...field.options,
      // NON salvare type qui per evitare duplicazione
    }
  };
};
```

**Checklist**:
- [ ] Analizzare struttura DB per field.type vs field.options
- [ ] Implementare `normalizeFieldType()` utility
- [ ] Aggiornare `FormBuilderPage` load logic
- [ ] Aggiornare save logic per consistency
- [ ] Test edit per ogni field type
- [ ] Regression test: verificare che i form esistenti carichino correttamente

**Files da Modificare**:
- `src/pages/forms/FormBuilderPage.tsx` (o FormTemplateEdit.tsx)
- `src/services/formTemplates.ts`

**Deliverable**: Bug fix con test cases

---

#### Task 2.1.4: Validation Rules UI (4h)

**Problema Attuale**:
```
❌ Creando form manca UI per aggiungere validation rules (number, email, regex, ecc)
```

**Obiettivo**: Pannello Validation Rules per ogni campo

**UI Design**:
```tsx
<FieldPropertiesPanel field={selectedField}>
  {/* Tabs */}
  <Tabs>
    <Tab label="Base" />
    <Tab label="Validazione" />  {/* NEW */}
    <Tab label="Condizioni" />
    <Tab label="Mapping" />
  </Tabs>

  {/* Validation Tab */}
  <TabPanel value="validation">
    <div className="space-y-4">
      
      {/* Field Type Specific Validation */}
      {field.type === 'text' && (
        <>
          <Input 
            label="Lunghezza Minima"
            type="number"
            value={validation.minLength}
            onChange={v => setValidation({...validation, minLength: v})}
          />
          <Input 
            label="Lunghezza Massima"
            type="number"
            value={validation.maxLength}
            onChange={v => setValidation({...validation, maxLength: v})}
          />
          <Input 
            label="Pattern Regex"
            placeholder="^[A-Z].*"
            value={validation.pattern}
            onChange={v => setValidation({...validation, pattern: v})}
          />
          <Input 
            label="Messaggio Errore Custom"
            value={validation.errorMessage}
            onChange={v => setValidation({...validation, errorMessage: v})}
          />
        </>
      )}

      {field.type === 'number' && (
        <>
          <Input 
            label="Valore Minimo"
            type="number"
            value={validation.min}
            onChange={v => setValidation({...validation, min: v})}
          />
          <Input 
            label="Valore Massimo"
            type="number"
            value={validation.max}
            onChange={v => setValidation({...validation, max: v})}
          />
          <Input 
            label="Step"
            type="number"
            placeholder="1"
            value={validation.step}
            onChange={v => setValidation({...validation, step: v})}
          />
        </>
      )}

      {field.type === 'email' && (
        <>
          <Checkbox 
            label="Verifica dominio email"
            checked={validation.verifyDomain}
            onChange={v => setValidation({...validation, verifyDomain: v})}
          />
          <Input 
            label="Domini consentiti (separati da virgola)"
            placeholder="@azienda.com, @example.com"
            value={validation.allowedDomains}
            onChange={v => setValidation({...validation, allowedDomains: v})}
          />
        </>
      )}

      {field.type === 'file' && (
        <>
          <Input 
            label="Dimensione Massima (MB)"
            type="number"
            value={validation.maxSize}
            onChange={v => setValidation({...validation, maxSize: v})}
          />
          <Input 
            label="Tipi File Consentiti"
            placeholder=".pdf, .jpg, .png"
            value={validation.allowedTypes}
            onChange={v => setValidation({...validation, allowedTypes: v})}
          />
          <Input 
            label="Numero Massimo File"
            type="number"
            value={validation.maxFiles}
            onChange={v => setValidation({...validation, maxFiles: v})}
          />
        </>
      )}

      {field.type === 'date' && (
        <>
          <Input 
            label="Data Minima"
            type="date"
            value={validation.minDate}
            onChange={v => setValidation({...validation, minDate: v})}
          />
          <Input 
            label="Data Massima"
            type="date"
            value={validation.maxDate}
            onChange={v => setValidation({...validation, maxDate: v})}
          />
          <Checkbox 
            label="Solo date future"
            checked={validation.futureOnly}
            onChange={v => setValidation({...validation, futureOnly: v})}
          />
        </>
      )}

      {/* Universal Validation */}
      <div className="border-t pt-4 mt-4">
        <h4 className="font-medium mb-2">Validazione Universale</h4>
        <Checkbox 
          label="Campo obbligatorio"
          checked={field.required}
          onChange={v => updateField({...field, required: v})}
        />
        <Checkbox 
          label="Nascondi se vuoto (conditional)"
          checked={validation.hideIfEmpty}
          onChange={v => setValidation({...validation, hideIfEmpty: v})}
        />
      </div>
      
    </div>
  </TabPanel>
</FieldPropertiesPanel>
```

**Validation Schema Structure**:
```typescript
interface FieldValidation {
  // Text
  minLength?: number;
  maxLength?: number;
  pattern?: string;  // Regex
  
  // Number
  min?: number;
  max?: number;
  step?: number;
  
  // Email
  verifyDomain?: boolean;
  allowedDomains?: string[];
  
  // File
  maxSize?: number;  // MB
  allowedTypes?: string[];
  maxFiles?: number;
  
  // Date
  minDate?: string;
  maxDate?: string;
  futureOnly?: boolean;
  pastOnly?: boolean;
  
  // Universal
  required?: boolean;
  errorMessage?: string;
  hideIfEmpty?: boolean;
}
```

**Checklist**:
- [ ] Creare componente `ValidationRulesPanel.tsx`
- [ ] Implementare logic per ogni field type
- [ ] Aggiungere preview validation in preview panel
- [ ] Integrare con backend validation
- [ ] Test validazione client-side e server-side

**Files Coinvolti**:
- `src/components/forms/ValidationRulesPanel.tsx` (NEW)
- `src/pages/forms/FormBuilderPage.tsx`

**Deliverable**: Pannello validation completo

---

### ✅ FASE 2.2: Conditional Logic Completa (3 giorni - 24h)

#### Task 2.2.1: Backend - Conditional Evaluator Engine (12h)

**Obiettivo**: Implementare tutti i 30 operatori condizionali

**File**: `backend/services/conditionalEvaluator.js`

**Struttura**:
```javascript
class ConditionalEvaluator {
  /**
   * Valuta una condizione singola
   */
  evaluateCondition(condition, formData, context) {
    const { field, operator, value } = condition;
    const fieldValue = formData[field];

    switch (operator) {
      // 1-2: Uguaglianza
      case 'equals':
        return fieldValue === value;
      case 'not_equals':
        return fieldValue !== value;
      
      // 3-4: Null/Empty
      case 'is_null':
        return fieldValue === null || fieldValue === undefined;
      case 'is_not_null':
        return fieldValue !== null && fieldValue !== undefined;
      case 'is_empty':
        return !fieldValue || fieldValue.length === 0;
      case 'is_not_empty':
        return fieldValue && fieldValue.length > 0;
      
      // 5-8: Numerici
      case 'greater':
        return Number(fieldValue) > Number(value);
      case 'greater_or_equal':
        return Number(fieldValue) >= Number(value);
      case 'less':
        return Number(fieldValue) < Number(value);
      case 'less_or_equal':
        return Number(fieldValue) <= Number(value);
      case 'between':
        return Number(fieldValue) >= value[0] && Number(fieldValue) <= value[1];
      case 'not_between':
        return Number(fieldValue) < value[0] || Number(fieldValue) > value[1];
      
      // 9-13: Testuali
      case 'contains':
        return String(fieldValue).includes(String(value));
      case 'not_contains':
        return !String(fieldValue).includes(String(value));
      case 'starts_with':
        return String(fieldValue).startsWith(String(value));
      case 'ends_with':
        return String(fieldValue).endsWith(String(value));
      case 'length_equals':
        return String(fieldValue).length === Number(value);
      case 'length_greater':
        return String(fieldValue).length > Number(value);
      case 'length_less':
        return String(fieldValue).length < Number(value);
      case 'matches_regex':
        return new RegExp(value).test(String(fieldValue));
      
      // 14-15: Booleani
      case 'is_true':
        return fieldValue === true || fieldValue === 'true' || fieldValue === 1;
      case 'is_false':
        return fieldValue === false || fieldValue === 'false' || fieldValue === 0;
      
      // 16-22: Date
      case 'date_after':
        return new Date(fieldValue) > new Date(value);
      case 'date_before':
        return new Date(fieldValue) < new Date(value);
      case 'date_between':
        const date = new Date(fieldValue);
        return date >= new Date(value[0]) && date <= new Date(value[1]);
      case 'date_relative_days':
        // value = {days: 7, operator: 'within'}
        const diff = Math.abs(new Date(fieldValue) - new Date()) / (1000 * 60 * 60 * 24);
        return diff <= value.days;
      case 'date_is_today':
        return new Date(fieldValue).toDateString() === new Date().toDateString();
      case 'date_is_past':
        return new Date(fieldValue) < new Date();
      case 'date_is_future':
        return new Date(fieldValue) > new Date();
      
      // 23-24: Array
      case 'in':
        return value.includes(fieldValue);
      case 'not_in':
        return !value.includes(fieldValue);
      
      // 25-27: Calcoli
      case 'sum_equals':
        // value = {fields: ['field1', 'field2'], target: 100}
        const sum = value.fields.reduce((acc, f) => acc + Number(formData[f] || 0), 0);
        return sum === value.target;
      case 'count_equals':
        // value = {field: 'multi_select', target: 3}
        return Array.isArray(formData[value.field]) && formData[value.field].length === value.target;
      
      // 28: Correttezza risposta (per test)
      case 'answer_correct':
        return fieldValue === condition.correctAnswer;
      
      default:
        throw new Error(`Unsupported operator: ${operator}`);
    }
  }

  /**
   * Valuta condizioni complesse (AND/OR/NOT)
   */
  evaluateComplex(condition, formData, context) {
    const { operator, conditions } = condition;

    switch (operator) {
      case 'AND':
        return conditions.every(c => this.evaluate(c, formData, context));
      case 'OR':
        return conditions.some(c => this.evaluate(c, formData, context));
      case 'NOT':
        return !this.evaluate(conditions[0], formData, context);
      default:
        throw new Error(`Unsupported complex operator: ${operator}`);
    }
  }

  /**
   * Valuta condizioni su entità (Person, Company, ecc)
   */
  async evaluateEntity(condition, formData, context) {
    const { entity, field, operator, value } = condition;
    
    // Fetch entity data from DB
    const entityData = await this.fetchEntityData(entity, context);
    
    // Apply same evaluation logic
    return this.evaluateCondition({
      field: field,
      operator: operator,
      value: value
    }, entityData, context);
  }

  /**
   * Valuta condizioni su permessi
   */
  evaluatePermission(condition, formData, context) {
    const { type, key, operator, value } = condition;
    const user = context.user;

    switch (type) {
      case 'role':
        return operator === 'equals' ? user.role === value : user.role !== value;
      case 'permission':
        return operator === 'has' ? user.permissions.includes(key) : !user.permissions.includes(key);
      case 'tenant_attribute':
        return user.tenant[key] === value;
      default:
        return false;
    }
  }

  /**
   * Entry point principale
   */
  evaluate(condition, formData, context = {}) {
    if (!condition) return true;

    // Condizione singola
    if (condition.field && condition.operator) {
      return this.evaluateCondition(condition, formData, context);
    }

    // Condizione complessa
    if (condition.operator && condition.conditions) {
      return this.evaluateComplex(condition, formData, context);
    }

    // Condizione su entità
    if (condition.entity) {
      return this.evaluateEntity(condition, formData, context);
    }

    // Condizione su permesso
    if (condition.permission) {
      return this.evaluatePermission(condition.permission, formData, context);
    }

    return true;
  }

  /**
   * Valuta tutte le condizioni di un form e ritorna campi visibili
   */
  async evaluateForm(template, formData, context) {
    const visibleFields = [];

    for (const field of template.fields) {
      // Se nessuna condizione, sempre visibile
      if (!field.conditional) {
        visibleFields.push(field);
        continue;
      }

      // Valuta condizione
      const isVisible = await this.evaluate(field.conditional, formData, context);
      if (isVisible) {
        visibleFields.push(field);
      }
    }

    return visibleFields;
  }
}

export default new ConditionalEvaluator();
```

**Checklist**:
- [ ] Implementare tutti i 30 operatori
- [ ] Aggiungere caching per performance
- [ ] Unit tests per ogni operatore
- [ ] Integration tests con Prisma
- [ ] Documentare ogni operatore con esempi

**Deliverable**: `conditionalEvaluator.js` + 100+ tests

---

#### Task 2.2.2: Backend - API Endpoint Preview (4h)

**Obiettivo**: Endpoint per testare condizioni in real-time

**Route**: `POST /api/v1/forms/:templateId/evaluate-conditions`

**Controller**:
```javascript
// backend/controllers/formsController.js

export const evaluateConditions = async (req, res) => {
  try {
    const { templateId } = req.params;
    const { formData } = req.body;
    const context = {
      user: req.user,
      tenant: req.tenant
    };

    // Get template
    const template = await prisma.form_templates.findUnique({
      where: { id: templateId },
      include: { form_fields: true }
    });

    if (!template) {
      return res.status(404).json({
        success: false,
        error: 'Template not found'
      });
    }

    // Evaluate
    const visibleFields = await conditionalEvaluator.evaluateForm(
      template,
      formData,
      context
    );

    res.json({
      success: true,
      data: {
        visibleFields: visibleFields.map(f => f.name),
        hiddenFields: template.form_fields
          .filter(f => !visibleFields.find(vf => vf.id === f.id))
          .map(f => f.name)
      }
    });
  } catch (error) {
    logger.error('Failed to evaluate conditions', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};
```

**Checklist**:
- [ ] Implementare endpoint
- [ ] Aggiungere rate limiting (10 req/min)
- [ ] Test con Postman/curl
- [ ] Integrare nel frontend preview

**Deliverable**: Endpoint funzionante

---

#### Task 2.2.3: Frontend - Conditional Logic Visual Editor (8h)

**Obiettivo**: UI drag & drop per creare condizioni complesse

**Componente**: `src/components/forms/ConditionalLogicEditor.tsx`

**UI Design**:
```tsx
<ConditionalLogicEditor 
  field={selectedField}
  allFields={formFields}
  onChange={handleConditionalChange}
>
  {/* Simple Condition */}
  <div className="border rounded p-4">
    <h4>Mostra questo campo quando:</h4>
    
    <div className="flex gap-2 items-center">
      <Select 
        options={allFields}
        value={condition.field}
        onChange={v => setCondition({...condition, field: v})}
        placeholder="Seleziona campo..."
      />
      
      <Select 
        options={OPERATORS}
        value={condition.operator}
        onChange={v => setCondition({...condition, operator: v})}
        placeholder="Operatore..."
      />
      
      {/* Dynamic value input based on operator */}
      {renderValueInput(condition.operator)}
    </div>
    
    <Button onClick={addCondition} variant="secondary" size="sm">
      + Aggiungi Condizione
    </Button>
  </div>

  {/* Complex Conditions (AND/OR) */}
  {conditions.length > 1 && (
    <div className="mt-4">
      <Select 
        options={[
          { value: 'AND', label: 'Tutte le condizioni devono essere vere (AND)' },
          { value: 'OR', label: 'Almeno una condizione deve essere vera (OR)' }
        ]}
        value={complexOperator}
        onChange={setComplexOperator}
      />
    </div>
  )}

  {/* Conditions List */}
  <div className="space-y-2 mt-4">
    {conditions.map((cond, index) => (
      <div key={index} className="flex items-center gap-2 p-3 bg-gray-50 rounded">
        <span className="text-sm">
          {getConditionLabel(cond)}
        </span>
        <Button 
          onClick={() => removeCondition(index)}
          variant="ghost"
          size="sm"
        >
          <X />
        </Button>
      </div>
    ))}
  </div>
</ConditionalLogicEditor>
```

**Operators Dropdown**:
```typescript
const OPERATOR_GROUPS = [
  {
    label: 'Uguaglianza',
    options: [
      { value: 'equals', label: 'È uguale a', icon: Equal },
      { value: 'not_equals', label: 'È diverso da', icon: NotEqual }
    ]
  },
  {
    label: 'Numeri',
    options: [
      { value: 'greater', label: 'Maggiore di', icon: ChevronUp },
      { value: 'less', label: 'Minore di', icon: ChevronDown },
      { value: 'between', label: 'Compreso tra', icon: ArrowLeftRight }
    ]
  },
  {
    label: 'Testo',
    options: [
      { value: 'contains', label: 'Contiene', icon: Search },
      { value: 'starts_with', label: 'Inizia con', icon: AlignLeft },
      { value: 'ends_with', label: 'Finisce con', icon: AlignRight },
      { value: 'matches_regex', label: 'Corrisponde a pattern', icon: Code }
    ]
  },
  {
    label: 'Date',
    options: [
      { value: 'date_after', label: 'Dopo il', icon: CalendarPlus },
      { value: 'date_before', label: 'Prima del', icon: CalendarMinus },
      { value: 'date_is_today', label: 'È oggi', icon: CalendarCheck }
    ]
  },
  {
    label: 'Stato',
    options: [
      { value: 'is_empty', label: 'È vuoto', icon: Inbox },
      { value: 'is_not_empty', label: 'Non è vuoto', icon: InboxCheck },
      { value: 'is_true', label: 'È vero', icon: Check },
      { value: 'is_false', label: 'È falso', icon: X }
    ]
  }
];
```

**Checklist**:
- [ ] Implementare componente base
- [ ] Aggiungere tutti gli operatori con icone
- [ ] Implementare drag & drop per riordinare condizioni
- [ ] Preview real-time condizioni
- [ ] Validazione condizioni (no circular dependencies)
- [ ] Save/Load da JSON

**Deliverable**: Editor visuale completo

---

### ✅ FASE 2.3: Form Builder Page (3 giorni - 24h)

#### Task 2.3.1: Form Builder UI Layout (12h)

**Obiettivo**: Pagina completa per creare/modificare form con drag & drop

**Route**: `/forms/builder/:templateId?`

**Layout Structure**:
```tsx
// src/pages/forms/FormBuilderPage.tsx

<div className="form-builder-container h-screen flex flex-col">
  
  {/* Header */}
  <header className="border-b px-6 py-4 flex justify-between items-center">
    <div className="flex items-center gap-4">
      <Button variant="ghost" onClick={handleBack}>
        <ArrowLeft /> Indietro
      </Button>
      <div>
        <Input 
          value={formName}
          onChange={setFormName}
          placeholder="Nome modulo..."
          className="text-xl font-bold"
        />
        <p className="text-sm text-gray-500">
          {isDraft ? 'Bozza' : 'Pubblicato'} · Ultimo salvataggio: {lastSaved}
        </p>
      </div>
    </div>
    
    <div className="flex gap-2">
      <Button variant="secondary" onClick={handlePreview}>
        <Eye /> Anteprima
      </Button>
      <Button variant="secondary" onClick={handleSaveDraft}>
        <Save /> Salva Bozza
      </Button>
      <Button variant="primary" onClick={handlePublish}>
        <CheckCircle /> Pubblica
      </Button>
    </div>
  </header>

  {/* Main Content */}
  <div className="flex-1 flex overflow-hidden">
    
    {/* Sidebar - Field Types Palette */}
    <aside className="w-64 border-r bg-gray-50 p-4 overflow-y-auto">
      <h3 className="font-medium mb-4">Campi Disponibili</h3>
      
      <FieldTypesPalette>
        {FIELD_TYPES_GROUPS.map(group => (
          <div key={group.label} className="mb-6">
            <h4 className="text-xs uppercase text-gray-500 mb-2">{group.label}</h4>
            
            {group.types.map(type => (
              <DraggableFieldType 
                key={type.value}
                type={type}
                onDragStart={() => setDraggingType(type.value)}
              >
                <div className="flex items-center gap-2 p-2 rounded hover:bg-gray-200 cursor-move">
                  {getFieldTypeIcon(type.value)}
                  <span className="text-sm">{type.label}</span>
                </div>
              </DraggableFieldType>
            ))}
          </div>
        ))}
      </FieldTypesPalette>
    </aside>

    {/* Center - Form Canvas */}
    <main className="flex-1 p-8 overflow-y-auto bg-gray-100">
      <div className="max-w-3xl mx-auto">
        
        {/* Form Settings Card */}
        <Card className="mb-6">
          <CardHeader>
            <h3>Impostazioni Modulo</h3>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <Select 
                label="Tipo Modulo"
                options={FORM_TEMPLATE_TYPES}
                value={formType}
                onChange={setFormType}
              />
              <Select 
                label="Categoria"
                options={CATEGORIES}
                value={category}
                onChange={setCategory}
              />
              <Checkbox 
                label="Modulo Pubblico (accessibile senza login)"
                checked={isPublic}
                onChange={setIsPublic}
              />
              <Checkbox 
                label="Consenti risposte multiple"
                checked={allowMultiple}
                onChange={setAllowMultiple}
              />
            </div>
          </CardContent>
        </Card>

        {/* Form Preview Card */}
        <Card className="bg-white">
          <CardHeader className="border-b">
            <Input 
              value={formTitle}
              onChange={setFormTitle}
              placeholder="Titolo del modulo"
              className="text-2xl font-bold border-none"
            />
            <Textarea 
              value={formDescription}
              onChange={setFormDescription}
              placeholder="Descrizione del modulo..."
              className="border-none"
            />
          </CardHeader>
          
          <CardContent>
            {/* Drop Zone */}
            <DropZone 
              onDrop={handleFieldDrop}
              fields={fields}
            >
              {fields.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <Plus className="w-12 h-12 mx-auto mb-2" />
                  <p>Trascina i campi qui per creare il modulo</p>
                </div>
              ) : (
                <SortableFieldsList 
                  fields={fields}
                  onReorder={handleReorder}
                  onSelect={setSelectedField}
                  selectedField={selectedField}
                  onDelete={handleDeleteField}
                  onDuplicate={handleDuplicateField}
                />
              )}
            </DropZone>

            {/* Add Field Button */}
            <Button 
              variant="dashed"
              onClick={() => setShowFieldTypesModal(true)}
              className="w-full mt-4"
            >
              <Plus /> Aggiungi Campo
            </Button>
          </CardContent>
        </Card>

        {/* Form Actions */}
        <Card className="mt-6">
          <CardHeader>
            <h3>Azioni Post-Invio</h3>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <Checkbox 
                label="Invia email di conferma"
                checked={actions.sendConfirmation}
                onChange={v => setActions({...actions, sendConfirmation: v})}
              />
              <Checkbox 
                label="Notifica amministratori"
                checked={actions.notifyAdmins}
                onChange={v => setActions({...actions, notifyAdmins: v})}
              />
              <Input 
                label="Email Destinatari (separati da virgola)"
                value={actions.recipients}
                onChange={v => setActions({...actions, recipients: v})}
              />
              <Textarea 
                label="Messaggio di Successo"
                value={actions.successMessage}
                onChange={v => setActions({...actions, successMessage: v})}
                placeholder="Grazie per aver inviato il modulo!"
              />
              <Input 
                label="URL Redirect (opzionale)"
                value={actions.redirectUrl}
                onChange={v => setActions({...actions, redirectUrl: v})}
                placeholder="https://..."
              />
            </div>
          </CardContent>
        </Card>

      </div>
    </main>

    {/* Right Sidebar - Field Properties */}
    {selectedField && (
      <aside className="w-96 border-l bg-white p-4 overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-medium">Proprietà Campo</h3>
          <Button variant="ghost" size="sm" onClick={() => setSelectedField(null)}>
            <X />
          </Button>
        </div>

        <Tabs>
          <Tab label="Base" />
          <Tab label="Validazione" />
          <Tab label="Condizioni" />
          <Tab label="Mapping" />
        </Tabs>

        {/* Tab: Base */}
        <TabPanel value="base">
          <div className="space-y-4">
            <Input 
              label="Etichetta"
              value={selectedField.label}
              onChange={v => updateField({...selectedField, label: v})}
            />
            <Input 
              label="Nome (campo tecnico)"
              value={selectedField.name}
              onChange={v => updateField({...selectedField, name: v})}
              disabled={selectedField.id}  // Non modificabile dopo creazione
            />
            <Textarea 
              label="Descrizione / Helper Text"
              value={selectedField.description}
              onChange={v => updateField({...selectedField, description: v})}
            />
            <Input 
              label="Placeholder"
              value={selectedField.placeholder}
              onChange={v => updateField({...selectedField, placeholder: v})}
            />
            <Input 
              label="Valore Predefinito"
              value={selectedField.defaultValue}
              onChange={v => updateField({...selectedField, defaultValue: v})}
            />
            <Checkbox 
              label="Campo Obbligatorio"
              checked={selectedField.required}
              onChange={v => updateField({...selectedField, required: v})}
            />
            <Checkbox 
              label="Campo di sola lettura"
              checked={selectedField.readonly}
              onChange={v => updateField({...selectedField, readonly: v})}
            />

            {/* Options per select/radio/checkbox */}
            {['select', 'radio', 'checkbox', 'multiple_choice', 'single_choice'].includes(selectedField.type) && (
              <div>
                <label className="block mb-2 font-medium">Opzioni</label>
                <OptionsEditor 
                  options={selectedField.options}
                  onChange={opts => updateField({...selectedField, options: opts})}
                />
              </div>
            )}
          </div>
        </TabPanel>

        {/* Tab: Validazione */}
        <TabPanel value="validation">
          <ValidationRulesPanel 
            field={selectedField}
            onChange={updateField}
          />
        </TabPanel>

        {/* Tab: Condizioni */}
        <TabPanel value="conditions">
          <ConditionalLogicEditor 
            field={selectedField}
            allFields={fields}
            onChange={cond => updateField({...selectedField, conditional: cond})}
          />
        </TabPanel>

        {/* Tab: Mapping */}
        <TabPanel value="mapping">
          <EntityMappingPanel 
            field={selectedField}
            onChange={mapping => updateField({...selectedField, entityMapping: mapping})}
          />
        </TabPanel>

      </aside>
    )}

  </div>

  {/* Preview Modal */}
  {showPreview && (
    <Modal size="xl" onClose={() => setShowPreview(false)}>
      <ModalHeader>Anteprima Modulo</ModalHeader>
      <ModalContent>
        <FormPreview 
          template={{
            name: formName,
            title: formTitle,
            description: formDescription,
            fields: fields
          }}
          onSubmit={handleTestSubmit}
        />
      </ModalContent>
    </Modal>
  )}

</div>
```

**Field Types Groups**:
```typescript
const FIELD_TYPES_GROUPS = [
  {
    label: 'Campi Base',
    types: [
      { value: 'text', label: 'Testo Breve', icon: Type },
      { value: 'textarea', label: 'Testo Lungo', icon: MessageSquare },
      { value: 'number', label: 'Numero', icon: Hash },
      { value: 'email', label: 'Email', icon: Mail },
      { value: 'tel', label: 'Telefono', icon: Phone },
      { value: 'date', label: 'Data', icon: Calendar },
      { value: 'file', label: 'Upload File', icon: FileUp }
    ]
  },
  {
    label: 'Selezione',
    types: [
      { value: 'select', label: 'Menu a Tendina', icon: List },
      { value: 'radio', label: 'Pulsanti Radio', icon: CircleDot },
      { value: 'checkbox', label: 'Checkbox', icon: CheckSquare }
    ]
  },
  {
    label: 'Test / Quiz',
    types: [
      { value: 'multiple_choice', label: 'Scelta Multipla', icon: ListChecks },
      { value: 'single_choice', label: 'Singola Scelta', icon: Circle },
      { value: 'true_false', label: 'Vero/Falso', icon: CheckCircle2 },
      { value: 'fill_in_blank', label: 'Riempi gli Spazi', icon: FileText }
    ]
  },
  {
    label: 'Anagrafiche',
    types: [
      { value: 'address', label: 'Indirizzo', icon: Home },
      { value: 'fiscal_code', label: 'Codice Fiscale', icon: CreditCard },
      { value: 'vat_number', label: 'Partita IVA', icon: CreditCard }
    ]
  },
  {
    label: 'Utility',
    types: [
      { value: 'section_header', label: 'Intestazione Sezione', icon: Type },
      { value: 'html_content', label: 'Contenuto HTML', icon: Globe },
      { value: 'rating', label: 'Valutazione (Stelle)', icon: Star },
      { value: 'signature', label: 'Firma Digitale', icon: User },
      { value: 'slider', label: 'Slider', icon: Sliders }
    ]
  }
];
```

**Checklist**:
- [ ] Implementare layout a 3 colonne (palette, canvas, properties)
- [ ] Drag & drop da palette a canvas
- [ ] Reorder campi con drag & drop
- [ ] Field properties panel con tabs
- [ ] Autosave ogni 30 secondi
- [ ] Preview modal con form reale
- [ ] Validazione struttura form
- [ ] Import/Export JSON

**Deliverable**: Form Builder completo funzionante

---

#### Task 2.3.2: Options Editor Component (4h)

**Obiettivo**: Editor per opzioni select/radio/checkbox

**Component**: `src/components/forms/OptionsEditor.tsx`

```tsx
interface Option {
  value: string;
  label: string;
  score?: number;  // Per test
  isCorrect?: boolean;  // Per test
}

const OptionsEditor = ({ options, onChange, showScoring = false }) => {
  const [localOptions, setLocalOptions] = useState(options || []);

  const addOption = () => {
    const newOption = {
      value: `option_${Date.now()}`,
      label: '',
      score: showScoring ? 0 : undefined
    };
    setLocalOptions([...localOptions, newOption]);
  };

  const updateOption = (index, updates) => {
    const updated = [...localOptions];
    updated[index] = { ...updated[index], ...updates };
    setLocalOptions(updated);
    onChange(updated);
  };

  const removeOption = (index) => {
    const updated = localOptions.filter((_, i) => i !== index);
    setLocalOptions(updated);
    onChange(updated);
  };

  const reorder = (fromIndex, toIndex) => {
    const updated = [...localOptions];
    const [moved] = updated.splice(fromIndex, 1);
    updated.splice(toIndex, 0, moved);
    setLocalOptions(updated);
    onChange(updated);
  };

  return (
    <div className="space-y-2">
      <DndContext onDragEnd={handleDragEnd}>
        <SortableContext items={localOptions.map((_, i) => i)}>
          {localOptions.map((option, index) => (
            <SortableItem key={index} id={index}>
              <div className="flex items-center gap-2 p-2 border rounded bg-white">
                <GripVertical className="w-4 h-4 text-gray-400 cursor-move" />
                
                <Input 
                  value={option.label}
                  onChange={v => updateOption(index, { label: v })}
                  placeholder={`Opzione ${index + 1}`}
                  className="flex-1"
                />

                {showScoring && (
                  <>
                    <Input 
                      type="number"
                      value={option.score}
                      onChange={v => updateOption(index, { score: Number(v) })}
                      placeholder="Punteggio"
                      className="w-24"
                    />
                    <Checkbox 
                      checked={option.isCorrect}
                      onChange={v => updateOption(index, { isCorrect: v })}
                      label="Corretta"
                    />
                  </>
                )}

                <Button 
                  variant="ghost"
                  size="sm"
                  onClick={() => removeOption(index)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </SortableItem>
          ))}
        </SortableContext>
      </DndContext>

      <Button 
        variant="secondary"
        size="sm"
        onClick={addOption}
        className="w-full"
      >
        <Plus /> Aggiungi Opzione
      </Button>

      {/* Bulk Import */}
      <Collapsible trigger="Importa da testo">
        <Textarea 
          placeholder="Inserisci un'opzione per riga..."
          onBlur={handleBulkImport}
        />
      </Collapsible>
    </div>
  );
};
```

**Checklist**:
- [ ] Implementare drag & drop reorder
- [ ] Bulk import da testo
- [ ] Scoring per test
- [ ] Validazione opzioni duplicate
- [ ] Preview opzioni in real-time

**Deliverable**: Options Editor componente

---

#### Task 2.3.3: Entity Mapping Panel (4h)

**Obiettivo**: Mappare campi form → entità database (Person, Company, ecc)

**Component**: `src/components/forms/EntityMappingPanel.tsx`

```tsx
const EntityMappingPanel = ({ field, onChange }) => {
  const [mapping, setMapping] = useState(field.entityMapping || null);

  const ENTITY_TYPES = [
    { value: 'person', label: 'Persona' },
    { value: 'company', label: 'Azienda' },
    { value: 'submission', label: 'Risposta Form' },
    { value: 'custom', label: 'Custom' }
  ];

  const PERSON_FIELDS = [
    { value: 'firstName', label: 'Nome' },
    { value: 'lastName', label: 'Cognome' },
    { value: 'email', label: 'Email' },
    { value: 'phone', label: 'Telefono' },
    { value: 'fiscalCode', label: 'Codice Fiscale' },
    { value: 'dateOfBirth', label: 'Data di Nascita' },
    { value: 'address', label: 'Indirizzo' },
    { value: 'city', label: 'Città' },
    { value: 'province', label: 'Provincia' },
    { value: 'postalCode', label: 'CAP' },
    { value: 'country', label: 'Paese' }
  ];

  const COMPANY_FIELDS = [
    { value: 'name', label: 'Ragione Sociale' },
    { value: 'vatNumber', label: 'Partita IVA' },
    { value: 'fiscalCode', label: 'Codice Fiscale' },
    { value: 'legalAddress', label: 'Sede Legale' },
    { value: 'pec', label: 'PEC' },
    { value: 'sdi', label: 'Codice SDI' }
  ];

  const getAvailableFields = () => {
    switch (mapping?.entity) {
      case 'person':
        return PERSON_FIELDS;
      case 'company':
        return COMPANY_FIELDS;
      default:
        return [];
    }
  };

  return (
    <div className="space-y-4">
      <Alert variant="info">
        Mappa questo campo a un'entità del database per sincronizzare automaticamente i dati.
      </Alert>

      <Checkbox 
        label="Abilita mapping entità"
        checked={!!mapping}
        onChange={enabled => {
          if (enabled) {
            setMapping({ entity: 'person', field: '', action: 'update_or_create' });
          } else {
            setMapping(null);
            onChange(null);
          }
        }}
      />

      {mapping && (
        <>
          <Select 
            label="Tipo Entità"
            options={ENTITY_TYPES}
            value={mapping.entity}
            onChange={v => setMapping({...mapping, entity: v, field: ''})}
          />

          {mapping.entity !== 'custom' && (
            <Select 
              label="Campo Destinazione"
              options={getAvailableFields()}
              value={mapping.field}
              onChange={v => {
                const updated = {...mapping, field: v};
                setMapping(updated);
                onChange(updated);
              }}
            />
          )}

          {mapping.entity === 'custom' && (
            <Input 
              label="Nome Campo Custom"
              value={mapping.field}
              onChange={v => {
                const updated = {...mapping, field: v};
                setMapping(updated);
                onChange(updated);
              }}
              placeholder="customFieldName"
            />
          )}

          <Select 
            label="Azione"
            options={[
              { value: 'update_or_create', label: 'Aggiorna o Crea' },
              { value: 'create_only', label: 'Solo Creazione' },
              { value: 'update_only', label: 'Solo Aggiornamento' },
              { value: 'skip_if_exists', label: 'Salta se Esiste' }
            ]}
            value={mapping.action}
            onChange={v => {
              const updated = {...mapping, action: v};
              setMapping(updated);
              onChange(updated);
            }}
          />

          <Input 
            label="Condizione (opzionale)"
            value={mapping.condition}
            onChange={v => {
              const updated = {...mapping, condition: v};
              setMapping(updated);
              onChange(updated);
            }}
            placeholder="es: role === 'admin'"
          />
        </>
      )}
    </div>
  );
};
```

**Checklist**:
- [ ] Implementare panel con enable/disable
- [ ] Dropdown entità (Person, Company, Custom)
- [ ] Dropdown campi per ogni entità
- [ ] Condizioni mapping (quando mappare)
- [ ] Validazione mapping (tipo campo compatibile)
- [ ] Test mapping con database

**Deliverable**: Entity Mapping Panel

---

#### Task 2.3.4: Form Save/Load Logic (4h)

**Obiettivo**: Salvare e caricare form template con autosave

**Service**: `src/services/formBuilder.ts`

```typescript
interface FormBuilderState {
  template: FormTemplate;
  fields: FormField[];
  isDirty: boolean;
  lastSaved: Date;
}

class FormBuilderService {
  private autosaveInterval: NodeJS.Timeout | null = null;

  /**
   * Load template per edit
   */
  async loadTemplate(templateId: string): Promise<FormTemplate> {
    const response = await fetch(`/api/v1/forms/templates/${templateId}`);
    if (!response.ok) throw new Error('Failed to load template');
    
    const { data } = await response.json();
    return this.normalizeTemplate(data);
  }

  /**
   * Normalize template structure
   */
  private normalizeTemplate(template: any): FormTemplate {
    return {
      ...template,
      fields: template.form_fields?.map(field => ({
        ...field,
        type: this.normalizeFieldType(field),
        options: this.parseJSON(field.options),
        validation: this.parseJSON(field.validation),
        conditional: this.parseJSON(field.conditional),
        entityMapping: this.parseJSON(field.entityMapping)
      })) || []
    };
  }

  /**
   * Fix per bug field type
   */
  private normalizeFieldType(field: any): string {
    // Priorità: colonna type > options.type > metadata.type
    return field.type 
      || field.options?.type 
      || field.metadata?.fieldType 
      || 'text';
  }

  /**
   * Save template (create or update)
   */
  async saveTemplate(template: FormTemplate, isDraft = false): Promise<FormTemplate> {
    const payload = {
      name: template.name,
      type: template.type,
      title: template.title,
      description: template.description,
      isPublic: template.isPublic,
      isActive: !isDraft,
      category: template.category,
      fields: template.fields.map(field => ({
        name: field.name,
        type: field.type,  // ← Salva nella colonna corretta
        label: field.label,
        placeholder: field.placeholder,
        defaultValue: field.defaultValue,
        required: field.required,
        order: field.order,
        options: field.options ? JSON.stringify(field.options) : null,
        validation: field.validation ? JSON.stringify(field.validation) : null,
        conditional: field.conditional ? JSON.stringify(field.conditional) : null,
        entityMapping: field.entityMapping ? JSON.stringify(field.entityMapping) : null
      }))
    };

    const method = template.id ? 'PUT' : 'POST';
    const url = template.id 
      ? `/api/v1/forms/templates/${template.id}`
      : `/api/v1/forms/templates`;

    const response = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) throw new Error('Failed to save template');
    
    const { data } = await response.json();
    return this.normalizeTemplate(data);
  }

  /**
   * Autosave setup
   */
  startAutosave(
    getState: () => FormBuilderState,
    onSave: (template: FormTemplate) => void,
    intervalMs = 30000
  ) {
    this.stopAutosave();
    
    this.autosaveInterval = setInterval(async () => {
      const state = getState();
      if (state.isDirty) {
        try {
          const saved = await this.saveTemplate(state.template, true);
          onSave(saved);
        } catch (error) {
          console.error('Autosave failed:', error);
        }
      }
    }, intervalMs);
  }

  /**
   * Stop autosave
   */
  stopAutosave() {
    if (this.autosaveInterval) {
      clearInterval(this.autosaveInterval);
      this.autosaveInterval = null;
    }
  }

  /**
   * Validate template
   */
  validateTemplate(template: FormTemplate): string[] {
    const errors: string[] = [];

    if (!template.name || template.name.trim() === '') {
      errors.push('Nome modulo obbligatorio');
    }

    if (!template.type) {
      errors.push('Tipo modulo obbligatorio');
    }

    if (template.fields.length === 0) {
      errors.push('Aggiungi almeno un campo');
    }

    // Validate field names uniqueness
    const fieldNames = template.fields.map(f => f.name);
    const duplicates = fieldNames.filter((name, index) => fieldNames.indexOf(name) !== index);
    if (duplicates.length > 0) {
      errors.push(`Nomi campo duplicati: ${duplicates.join(', ')}`);
    }

    // Validate conditional dependencies
    template.fields.forEach(field => {
      if (field.conditional) {
        const referencedField = this.getReferencedField(field.conditional);
        if (referencedField && !fieldNames.includes(referencedField)) {
          errors.push(`Campo ${field.name}: dipendenza non trovata (${referencedField})`);
        }
      }
    });

    return errors;
  }

  private getReferencedField(conditional: any): string | null {
    if (conditional.field) return conditional.field;
    if (conditional.conditions) {
      for (const cond of conditional.conditions) {
        const ref = this.getReferencedField(cond);
        if (ref) return ref;
      }
    }
    return null;
  }

  private parseJSON(value: any): any {
    if (typeof value === 'string') {
      try {
        return JSON.parse(value);
      } catch {
        return null;
      }
    }
    return value;
  }
}

export default new FormBuilderService();
```

**Checklist**:
- [ ] Implementare load template
- [ ] Implementare save (create/update)
- [ ] Autosave ogni 30 secondi
- [ ] Validazione template pre-save
- [ ] Normalizzazione field type (fix bug)
- [ ] Error handling con toast notifications

**Deliverable**: Form Builder Save/Load completo

---

### ✅ FASE 2.4: Form Submissions Page (2 giorni - 16h)

#### Task 2.4.1: Submissions Dashboard UI (10h)

**Obiettivo**: Pagina per visualizzare e gestire risposte form

**Route**: `/forms/submissions/:templateId?`

**Layout**:
```tsx
// src/pages/forms/FormSubmissionsPage.tsx

<div className="submissions-dashboard p-6">
  
  {/* Header */}
  <div className="flex justify-between items-center mb-6">
    <div>
      <h1 className="text-2xl font-bold">Risposte Form</h1>
      <p className="text-gray-600">
        {selectedTemplate?.name || 'Tutti i moduli'}
      </p>
    </div>
    <div className="flex gap-2">
      <Button variant="secondary" onClick={handleExportCSV}>
        <Download /> Esporta CSV
      </Button>
      <Button variant="secondary" onClick={handleExportExcel}>
        <FileSpreadsheet /> Esporta Excel
      </Button>
    </div>
  </div>

  {/* Stats Cards */}
  <div className="grid grid-cols-4 gap-4 mb-6">
    <Card>
      <CardContent className="flex items-center gap-3">
        <div className="p-3 bg-blue-100 rounded-lg">
          <FileText className="w-6 h-6 text-blue-600" />
        </div>
        <div>
          <p className="text-sm text-gray-600">Totale Risposte</p>
          <p className="text-2xl font-bold">{stats.total}</p>
        </div>
      </CardContent>
    </Card>

    <Card>
      <CardContent className="flex items-center gap-3">
        <div className="p-3 bg-yellow-100 rounded-lg">
          <Clock className="w-6 h-6 text-yellow-600" />
        </div>
        <div>
          <p className="text-sm text-gray-600">In Attesa</p>
          <p className="text-2xl font-bold">{stats.pending}</p>
        </div>
      </CardContent>
    </Card>

    <Card>
      <CardContent className="flex items-center gap-3">
        <div className="p-3 bg-green-100 rounded-lg">
          <CheckCircle className="w-6 h-6 text-green-600" />
        </div>
        <div>
          <p className="text-sm text-gray-600">Processate</p>
          <p className="text-2xl font-bold">{stats.processed}</p>
        </div>
      </CardContent>
    </Card>

    <Card>
      <CardContent className="flex items-center gap-3">
        <div className="p-3 bg-gray-100 rounded-lg">
          <Archive className="w-6 h-6 text-gray-600" />
        </div>
        <div>
          <p className="text-sm text-gray-600">Archiviate</p>
          <p className="text-2xl font-bold">{stats.archived}</p>
        </div>
      </CardContent>
    </Card>
  </div>

  {/* Filters */}
  <Card className="mb-6">
    <CardContent>
      <div className="grid grid-cols-5 gap-4">
        <Select 
          label="Modulo"
          options={templates}
          value={filters.templateId}
          onChange={v => setFilters({...filters, templateId: v})}
          placeholder="Tutti i moduli"
        />
        <Select 
          label="Stato"
          options={[
            { value: 'pending', label: 'In Attesa' },
            { value: 'processed', label: 'Processate' },
            { value: 'archived', label: 'Archiviate' }
          ]}
          value={filters.status}
          onChange={v => setFilters({...filters, status: v})}
          placeholder="Tutti gli stati"
        />
        <Input 
          label="Da Data"
          type="date"
          value={filters.fromDate}
          onChange={v => setFilters({...filters, fromDate: v})}
        />
        <Input 
          label="A Data"
          type="date"
          value={filters.toDate}
          onChange={v => setFilters({...filters, toDate: v})}
        />
        <Input 
          label="Cerca"
          placeholder="Email, nome..."
          value={filters.search}
          onChange={v => setFilters({...filters, search: v})}
          icon={<Search />}
        />
      </div>
    </CardContent>
  </Card>

  {/* Bulk Actions */}
  {selectedSubmissions.length > 0 && (
    <Alert variant="info" className="mb-4">
      <div className="flex justify-between items-center">
        <span>{selectedSubmissions.length} risposte selezionate</span>
        <div className="flex gap-2">
          <Button 
            variant="secondary"
            size="sm"
            onClick={() => handleBulkAction('mark_processed')}
          >
            <CheckCircle /> Segna come Processate
          </Button>
          <Button 
            variant="secondary"
            size="sm"
            onClick={() => handleBulkAction('archive')}
          >
            <Archive /> Archivia
          </Button>
          <Button 
            variant="danger"
            size="sm"
            onClick={() => handleBulkAction('delete')}
          >
            <Trash2 /> Elimina
          </Button>
        </div>
      </div>
    </Alert>
  )}

  {/* Submissions Table */}
  <Card>
    <Table>
      <thead>
        <tr>
          <th width="40px">
            <Checkbox 
              checked={allSelected}
              onChange={toggleSelectAll}
            />
          </th>
          <th>ID</th>
          <th>Modulo</th>
          <th>Utente/Email</th>
          <th>Data Invio</th>
          <th>Stato</th>
          <th>Punteggio</th>
          <th>Azioni</th>
        </tr>
      </thead>
      <tbody>
        {submissions.map(submission => (
          <tr key={submission.id}>
            <td>
              <Checkbox 
                checked={selectedSubmissions.includes(submission.id)}
                onChange={() => toggleSelect(submission.id)}
              />
            </td>
            <td className="font-mono text-sm">
              #{submission.id.slice(0, 8)}
            </td>
            <td>{submission.template.name}</td>
            <td>
              <div>
                <p className="font-medium">{submission.submittedBy || 'Anonimo'}</p>
                <p className="text-sm text-gray-500">{submission.submittedEmail}</p>
              </div>
            </td>
            <td>{formatDate(submission.createdAt)}</td>
            <td>
              <Badge variant={getStatusVariant(submission.status)}>
                {submission.status}
              </Badge>
            </td>
            <td>
              {submission.score && (
                <span className="font-medium">{submission.score}/100</span>
              )}
            </td>
            <td>
              <div className="flex gap-2">
                <Button 
                  variant="ghost"
                  size="sm"
                  onClick={() => handleViewDetails(submission)}
                >
                  <Eye />
                </Button>
                <Button 
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDownloadPDF(submission)}
                >
                  <Download />
                </Button>
                <DropdownMenu>
                  <DropdownMenuItem onClick={() => handleMarkProcessed(submission)}>
                    <CheckCircle /> Segna Processata
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleArchive(submission)}>
                    <Archive /> Archivia
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    variant="danger"
                    onClick={() => handleDelete(submission)}
                  >
                    <Trash2 /> Elimina
                  </DropdownMenuItem>
                </DropdownMenu>
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </Table>

    {/* Pagination */}
    <div className="flex justify-between items-center p-4 border-t">
      <p className="text-sm text-gray-600">
        Mostrando {(page - 1) * perPage + 1}-{Math.min(page * perPage, total)} di {total}
      </p>
      <Pagination 
        currentPage={page}
        totalPages={Math.ceil(total / perPage)}
        onPageChange={setPage}
      />
    </div>
  </Card>

  {/* Submission Details Modal */}
  {selectedSubmission && (
    <Modal size="xl" onClose={() => setSelectedSubmission(null)}>
      <ModalHeader>
        Dettagli Risposta #{selectedSubmission.id.slice(0, 8)}
      </ModalHeader>
      <ModalContent>
        <SubmissionDetailsView submission={selectedSubmission} />
      </ModalContent>
      <ModalFooter>
        <Button variant="secondary" onClick={() => setSelectedSubmission(null)}>
          Chiudi
        </Button>
        <Button onClick={() => handleDownloadPDF(selectedSubmission)}>
          <Download /> Scarica PDF
        </Button>
      </ModalFooter>
    </Modal>
  )}

</div>
```

**Checklist**:
- [ ] Implementare dashboard layout
- [ ] Stats cards con dati real-time
- [ ] Filters bar con multiple filters
- [ ] Table con sorting e pagination
- [ ] Bulk actions (mark processed, archive, delete)
- [ ] Submission details modal
- [ ] Export CSV/Excel

**Deliverable**: Submissions Dashboard completo

---

#### Task 2.4.2: Submission Details View (3h)

**Componente**: `src/components/forms/SubmissionDetailsView.tsx`

```tsx
const SubmissionDetailsView = ({ submission }) => {
  const template = submission.template;
  const data = JSON.parse(submission.formData);

  return (
    <div className="space-y-6">
      {/* Metadata */}
      <Card>
        <CardHeader>
          <h3>Informazioni Generali</h3>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-gray-600">ID Risposta</label>
              <p className="font-mono">{submission.id}</p>
            </div>
            <div>
              <label className="text-sm text-gray-600">Modulo</label>
              <p className="font-medium">{template.name}</p>
            </div>
            <div>
              <label className="text-sm text-gray-600">Data Invio</label>
              <p>{formatDateTime(submission.createdAt)}</p>
            </div>
            <div>
              <label className="text-sm text-gray-600">Stato</label>
              <Badge variant={getStatusVariant(submission.status)}>
                {submission.status}
              </Badge>
            </div>
            {submission.submittedBy && (
              <div>
                <label className="text-sm text-gray-600">Inviato da</label>
                <p>{submission.submittedBy}</p>
              </div>
            )}
            {submission.score && (
              <div>
                <label className="text-sm text-gray-600">Punteggio</label>
                <p className="text-xl font-bold">{submission.score}/100</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Risposte */}
      <Card>
        <CardHeader>
          <h3>Risposte</h3>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {template.form_fields.map(field => {
              const value = data[field.name];
              
              return (
                <div key={field.id} className="border-b pb-4 last:border-b-0">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {field.label}
                    {field.required && <span className="text-red-500 ml-1">*</span>}
                  </label>
                  
                  {renderFieldValue(field, value)}
                  
                  {/* Show correct answer for quiz */}
                  {field.options?.isCorrect && (
                    <div className="mt-2">
                      <Badge variant={value === field.options.correctAnswer ? 'success' : 'danger'}>
                        {value === field.options.correctAnswer ? 'Corretto' : 'Errato'}
                      </Badge>
                      {value !== field.options.correctAnswer && (
                        <p className="text-sm text-gray-600 mt-1">
                          Risposta corretta: {field.options.correctAnswer}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Attachments */}
      {submission.attachments && submission.attachments.length > 0 && (
        <Card>
          <CardHeader>
            <h3>Allegati</h3>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {submission.attachments.map(attachment => (
                <div key={attachment.id} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                  <div className="flex items-center gap-2">
                    <FileIcon type={attachment.mimeType} />
                    <div>
                      <p className="font-medium">{attachment.filename}</p>
                      <p className="text-sm text-gray-500">{formatFileSize(attachment.size)}</p>
                    </div>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => downloadAttachment(attachment)}
                  >
                    <Download />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
```

---

#### Task 2.4.3: Export CSV/Excel (3h)

**Service**: `src/services/exportService.ts`

```typescript
class ExportService {
  /**
   * Export submissions to CSV
   */
  exportToCSV(submissions: Submission[], template: FormTemplate): string {
    const fields = template.form_fields;
    
    // Headers
    const headers = [
      'ID',
      'Data Invio',
      'Stato',
      'Utente',
      ...fields.map(f => f.label),
      'Punteggio'
    ];

    // Rows
    const rows = submissions.map(sub => {
      const data = JSON.parse(sub.formData);
      return [
        sub.id,
        formatDateTime(sub.createdAt),
        sub.status,
        sub.submittedBy || 'Anonimo',
        ...fields.map(f => this.formatValueForCSV(data[f.name])),
        sub.score || ''
      ];
    });

    // Generate CSV
    const csv = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    return csv;
  }

  /**
   * Download CSV file
   */
  downloadCSV(submissions: Submission[], template: FormTemplate) {
    const csv = this.exportToCSV(submissions, template);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `${template.name}_${Date.now()}.csv`;
    link.click();
    
    URL.revokeObjectURL(url);
  }

  /**
   * Export to Excel (using xlsx library)
   */
  async exportToExcel(submissions: Submission[], template: FormTemplate) {
    const XLSX = await import('xlsx');
    
    const fields = template.form_fields;
    
    // Create worksheet data
    const wsData = [
      // Headers
      ['ID', 'Data Invio', 'Stato', 'Utente', ...fields.map(f => f.label), 'Punteggio'],
      
      // Rows
      ...submissions.map(sub => {
        const data = JSON.parse(sub.formData);
        return [
          sub.id,
          formatDateTime(sub.createdAt),
          sub.status,
          sub.submittedBy || 'Anonimo',
          ...fields.map(f => data[f.name]),
          sub.score || ''
        ];
      })
    ];

    // Create workbook
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    
    // Auto-size columns
    const colWidths = wsData[0].map((_, i) => ({
      wch: Math.max(...wsData.map(row => String(row[i] || '').length))
    }));
    ws['!cols'] = colWidths;

    XLSX.utils.book_append_sheet(wb, ws, 'Risposte');
    
    // Download
    XLSX.writeFile(wb, `${template.name}_${Date.now()}.xlsx`);
  }

  private formatValueForCSV(value: any): string {
    if (Array.isArray(value)) return value.join('; ');
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value || '');
  }
}

export default new ExportService();
```

---

### ✅ FASE 2.5: Backend Enhancements (2 giorni - 16h)

#### Task 2.5.1: Database Schema Extensions (4h)

**Migrations**: `backend/prisma/migrations/XXX_forms_advanced/migration.sql`

```sql
-- Add scoring columns
ALTER TABLE form_submissions ADD COLUMN IF NOT EXISTS score INTEGER;
ALTER TABLE form_submissions ADD COLUMN IF NOT EXISTS max_score INTEGER;
ALTER TABLE form_submissions ADD COLUMN IF NOT EXISTS passed BOOLEAN;

-- Add file attachments support
CREATE TABLE IF NOT EXISTS form_attachments (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  submission_id TEXT NOT NULL REFERENCES form_submissions(id) ON DELETE CASCADE,
  field_name TEXT NOT NULL,
  filename TEXT NOT NULL,
  original_filename TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size INTEGER NOT NULL,
  storage_path TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT fk_submission FOREIGN KEY (submission_id) REFERENCES form_submissions(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_attachments_submission ON form_attachments(submission_id);

-- Add conditional logic support (store complex conditions as JSON)
ALTER TABLE form_fields ADD COLUMN IF NOT EXISTS conditional JSONB;

-- Add entity mapping support
ALTER TABLE form_fields ADD COLUMN IF NOT EXISTS entity_mapping JSONB;

-- Add capacity tracking for options
CREATE TABLE IF NOT EXISTS form_option_capacity (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  field_id TEXT NOT NULL REFERENCES form_fields(id) ON DELETE CASCADE,
  option_value TEXT NOT NULL,
  max_capacity INTEGER NOT NULL,
  current_count INTEGER DEFAULT 0,
  
  CONSTRAINT fk_field FOREIGN KEY (field_id) REFERENCES form_fields(id) ON DELETE CASCADE,
  CONSTRAINT unique_field_option UNIQUE (field_id, option_value)
);

-- Add form workflow support
ALTER TABLE form_submissions ADD COLUMN IF NOT EXISTS workflow_state TEXT DEFAULT 'pending';
ALTER TABLE form_submissions ADD COLUMN IF NOT EXISTS processed_by TEXT;
ALTER TABLE form_submissions ADD COLUMN IF NOT EXISTS processed_at TIMESTAMP;

-- Add submission notes/comments
CREATE TABLE IF NOT EXISTS form_submission_notes (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  submission_id TEXT NOT NULL REFERENCES form_submissions(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  note TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT fk_submission FOREIGN KEY (submission_id) REFERENCES form_submissions(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_notes_submission ON form_submission_notes(submission_id);
```

**Prisma Schema Update**:
```prisma
// backend/prisma/schema.prisma

model form_attachments {
  id                TEXT      @id @default(dbgenerated("gen_random_uuid()::text"))
  submission_id     String
  field_name        String
  filename          String
  original_filename String
  mime_type         String
  size              Int
  storage_path      String
  created_at        DateTime  @default(now())
  
  submission        form_submissions @relation(fields: [submission_id], references: [id], onDelete: Cascade)
  
  @@index([submission_id])
}

model form_option_capacity {
  id            TEXT    @id @default(dbgenerated("gen_random_uuid()::text"))
  field_id      String
  option_value  String
  max_capacity  Int
  current_count Int     @default(0)
  
  field         form_fields @relation(fields: [field_id], references: [id], onDelete: Cascade)
  
  @@unique([field_id, option_value])
}

model form_submission_notes {
  id            TEXT      @id @default(dbgenerated("gen_random_uuid()::text"))
  submission_id String
  user_id       String
  note          String
  created_at    DateTime  @default(now())
  
  submission    form_submissions @relation(fields: [submission_id], references: [id], onDelete: Cascade)
  
  @@index([submission_id])
}
```

**Checklist**:
- [ ] Create migration file
- [ ] Update Prisma schema
- [ ] Run migration on dev_db
- [ ] Test migration rollback
- [ ] Update TypeScript types

---

#### Task 2.5.2: File Upload Service (6h)

**Service**: `backend/services/fileUploadService.js`

```javascript
import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { prisma } from '../database/prisma.js';

class FileUploadService {
  constructor() {
    this.uploadDir = process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads', 'forms');
    this.maxFileSize = parseInt(process.env.MAX_FILE_SIZE || '10485760'); // 10MB
    this.allowedMimeTypes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];
  }

  /**
   * Initialize upload directory
   */
  async init() {
    await fs.mkdir(this.uploadDir, { recursive: true });
  }

  /**
   * Validate file
   */
  validateFile(file, fieldValidation) {
    const errors = [];

    // Check file size
    const maxSize = fieldValidation?.maxSize 
      ? fieldValidation.maxSize * 1024 * 1024 
      : this.maxFileSize;
    
    if (file.size > maxSize) {
      errors.push(`File troppo grande (max ${maxSize / 1024 / 1024}MB)`);
    }

    // Check mime type
    const allowedTypes = fieldValidation?.allowedTypes 
      ? fieldValidation.allowedTypes.split(',').map(t => t.trim())
      : this.allowedMimeTypes;
    
    if (!allowedTypes.includes(file.mimetype)) {
      errors.push(`Tipo file non consentito. Consentiti: ${allowedTypes.join(', ')}`);
    }

    return errors;
  }

  /**
   * Save file to disk
   */
  async saveFile(file, submissionId, fieldName) {
    await this.init();

    // Generate unique filename
    const ext = path.extname(file.originalname);
    const hash = crypto.randomBytes(16).toString('hex');
    const filename = `${hash}${ext}`;
    const storagePath = path.join(this.uploadDir, submissionId, filename);

    // Create submission directory
    await fs.mkdir(path.dirname(storagePath), { recursive: true });

    // Save file
    await fs.writeFile(storagePath, file.buffer);

    // Create database record
    const attachment = await prisma.form_attachments.create({
      data: {
        submission_id: submissionId,
        field_name: fieldName,
        filename: filename,
        original_filename: file.originalname,
        mime_type: file.mimetype,
        size: file.size,
        storage_path: storagePath
      }
    });

    return attachment;
  }

  /**
   * Get file
   */
  async getFile(attachmentId) {
    const attachment = await prisma.form_attachments.findUnique({
      where: { id: attachmentId }
    });

    if (!attachment) {
      throw new Error('Attachment not found');
    }

    const fileBuffer = await fs.readFile(attachment.storage_path);

    return {
      buffer: fileBuffer,
      filename: attachment.original_filename,
      mimeType: attachment.mime_type
    };
  }

  /**
   * Delete file
   */
  async deleteFile(attachmentId) {
    const attachment = await prisma.form_attachments.findUnique({
      where: { id: attachmentId }
    });

    if (!attachment) return;

    // Delete from disk
    try {
      await fs.unlink(attachment.storage_path);
    } catch (error) {
      console.error('Failed to delete file from disk:', error);
    }

    // Delete from database
    await prisma.form_attachments.delete({
      where: { id: attachmentId }
    });
  }

  /**
   * Delete all files for submission
   */
  async deleteSubmissionFiles(submissionId) {
    const attachments = await prisma.form_attachments.findMany({
      where: { submission_id: submissionId }
    });

    for (const attachment of attachments) {
      await this.deleteFile(attachment.id);
    }
  }
}

export default new FileUploadService();
```

**Controller**: `backend/controllers/fileUploadController.js`

```javascript
import fileUploadService from '../services/fileUploadService.js';
import multer from 'multer';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
  }
});

export const uploadFile = [
  upload.single('file'),
  async (req, res) => {
    try {
      const { submissionId, fieldName } = req.body;
      const file = req.file;

      if (!file) {
        return res.status(400).json({
          success: false,
          error: 'No file provided'
        });
      }

      // Validate
      const errors = fileUploadService.validateFile(file, req.body.validation);
      if (errors.length > 0) {
        return res.status(400).json({
          success: false,
          errors
        });
      }

      // Save
      const attachment = await fileUploadService.saveFile(file, submissionId, fieldName);

      res.json({
        success: true,
        data: attachment
      });
    } catch (error) {
      console.error('File upload error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to upload file'
      });
    }
  }
];

export const downloadFile = async (req, res) => {
  try {
    const { attachmentId } = req.params;

    const { buffer, filename, mimeType } = await fileUploadService.getFile(attachmentId);

    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  } catch (error) {
    console.error('File download error:', error);
    res.status(404).json({
      success: false,
      error: 'File not found'
    });
  }
};
```

**Checklist**:
- [ ] Implement file upload service
- [ ] Add multer middleware
- [ ] Create upload/download controllers
- [ ] Add routes `/api/v1/forms/attachments`
- [ ] Test file validation
- [ ] Test file upload/download
- [ ] Test file deletion

---

#### Task 2.5.3: Scoring System (3h)

**Service**: `backend/services/scoringService.js`

```javascript
class ScoringService {
  /**
   * Calculate submission score for quiz
   */
  calculateScore(template, submissionData) {
    const fields = template.form_fields.filter(f => f.options?.isCorrect !== undefined);
    
    if (fields.length === 0) {
      return null; // Not a quiz
    }

    let totalScore = 0;
    let maxScore = 0;

    for (const field of fields) {
      const fieldScore = field.options.score || 1;
      maxScore += fieldScore;

      const userAnswer = submissionData[field.name];
      const correctAnswer = field.options.correctAnswer;

      // Single choice
      if (field.type === 'single_choice' || field.type === 'radio') {
        if (userAnswer === correctAnswer) {
          totalScore += fieldScore;
        }
      }

      // Multiple choice
      if (field.type === 'multiple_choice' || field.type === 'checkbox') {
        const userAnswers = Array.isArray(userAnswer) ? userAnswer : [userAnswer];
        const correctAnswers = Array.isArray(correctAnswer) ? correctAnswer : [correctAnswer];

        // All correct = full points
        // Partial correct = proportional points
        const correctCount = userAnswers.filter(a => correctAnswers.includes(a)).length;
        const incorrectCount = userAnswers.filter(a => !correctAnswers.includes(a)).length;

        if (incorrectCount === 0 && correctCount === correctAnswers.length) {
          totalScore += fieldScore;
        } else if (correctCount > 0) {
          totalScore += (fieldScore * correctCount) / correctAnswers.length;
        }
      }

      // True/False
      if (field.type === 'true_false') {
        if (String(userAnswer).toLowerCase() === String(correctAnswer).toLowerCase()) {
          totalScore += fieldScore;
        }
      }

      // Fill in blank (case insensitive)
      if (field.type === 'fill_in_blank') {
        if (String(userAnswer).toLowerCase().trim() === String(correctAnswer).toLowerCase().trim()) {
          totalScore += fieldScore;
        }
      }
    }

    // Calculate percentage
    const percentage = Math.round((totalScore / maxScore) * 100);
    const passed = percentage >= (template.passingScore || 60);

    return {
      score: totalScore,
      maxScore,
      percentage,
      passed
    };
  }

  /**
   * Get quiz statistics
   */
  async getQuizStats(templateId) {
    const submissions = await prisma.form_submissions.findMany({
      where: {
        template_id: templateId,
        score: { not: null }
      }
    });

    if (submissions.length === 0) {
      return null;
    }

    const scores = submissions.map(s => (s.score / s.max_score) * 100);
    const passRate = submissions.filter(s => s.passed).length / submissions.length;

    return {
      totalAttempts: submissions.length,
      averageScore: scores.reduce((a, b) => a + b, 0) / scores.length,
      minScore: Math.min(...scores),
      maxScore: Math.max(...scores),
      passRate: passRate * 100,
      passed: submissions.filter(s => s.passed).length,
      failed: submissions.filter(s => !s.passed).length
    };
  }
}

export default new ScoringService();
```

**Checklist**:
- [ ] Implement scoring logic
- [ ] Support multiple answer types
- [ ] Add partial credit for multiple choice
- [ ] Calculate pass/fail
- [ ] Add quiz statistics endpoint
- [ ] Test scoring with various scenarios

---

#### Task 2.5.4: Entity Mapping Service (3h)

**Service**: `backend/services/entityMappingService.js`

```javascript
import { prisma } from '../database/prisma.js';

class EntityMappingService {
  /**
   * Process entity mappings from submission
   */
  async processSubmission(template, submissionData, context) {
    const mappings = template.form_fields
      .filter(f => f.entity_mapping)
      .map(f => ({
        field: f,
        mapping: typeof f.entity_mapping === 'string' 
          ? JSON.parse(f.entity_mapping) 
          : f.entity_mapping,
        value: submissionData[f.name]
      }));

    const results = [];

    for (const { field, mapping, value } of mappings) {
      // Check condition
      if (mapping.condition && !this.evaluateCondition(mapping.condition, submissionData, context)) {
        continue;
      }

      const result = await this.mapToEntity(mapping, value, context);
      results.push({
        field: field.name,
        entity: mapping.entity,
        success: result.success,
        entityId: result.entityId
      });
    }

    return results;
  }

  /**
   * Map value to entity
   */
  async mapToEntity(mapping, value, context) {
    const { entity, field, action } = mapping;

    try {
      switch (entity) {
        case 'person':
          return await this.mapToPerson(field, value, action, context);
        case 'company':
          return await this.mapToCompany(field, value, action, context);
        default:
          throw new Error(`Unsupported entity type: ${entity}`);
      }
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Map to Person entity
   */
  async mapToPerson(field, value, action, context) {
    const tenantId = context.tenant?.id;

    // Find existing person by email or fiscal code
    let person = null;
    if (field === 'email') {
      person = await prisma.persons.findFirst({
        where: { email: value, tenant_id: tenantId }
      });
    } else if (field === 'fiscalCode') {
      person = await prisma.persons.findFirst({
        where: { fiscal_code: value, tenant_id: tenantId }
      });
    }

    // Handle action
    if (action === 'create_only' && person) {
      return { success: false, error: 'Person already exists' };
    }

    if (action === 'update_only' && !person) {
      return { success: false, error: 'Person not found' };
    }

    if (action === 'skip_if_exists' && person) {
      return { success: true, entityId: person.id, skipped: true };
    }

    // Update or create
    if (person) {
      person = await prisma.persons.update({
        where: { id: person.id },
        data: { [this.getDBField(field)]: value }
      });
    } else {
      person = await prisma.persons.create({
        data: {
          tenant_id: tenantId,
          [this.getDBField(field)]: value,
          created_by: context.user?.id
        }
      });
    }

    return {
      success: true,
      entityId: person.id
    };
  }

  /**
   * Map to Company entity
   */
  async mapToCompany(field, value, action, context) {
    const tenantId = context.tenant?.id;

    let company = null;
    if (field === 'vatNumber') {
      company = await prisma.companies.findFirst({
        where: { vat_number: value, tenant_id: tenantId }
      });
    }

    // Similar logic as mapToPerson...
    
    return {
      success: true,
      entityId: company?.id
    };
  }

  /**
   * Get database field name
   */
  getDBField(field) {
    const mapping = {
      firstName: 'first_name',
      lastName: 'last_name',
      fiscalCode: 'fiscal_code',
      dateOfBirth: 'date_of_birth',
      postalCode: 'postal_code',
      vatNumber: 'vat_number',
      legalAddress: 'legal_address'
    };
    return mapping[field] || field.toLowerCase();
  }

  /**
   * Evaluate condition
   */
  evaluateCondition(condition, data, context) {
    // Simple eval for now, can be extended
    try {
      const fn = new Function('data', 'context', `return ${condition}`);
      return fn(data, context);
    } catch {
      return false;
    }
  }
}

export default new EntityMappingService();
```

**Checklist**:
- [ ] Implement entity mapping service
- [ ] Support Person and Company entities
- [ ] Handle create/update/skip actions
- [ ] Validate entity constraints
- [ ] Test mapping scenarios
- [ ] Add logging for debugging

---

## 📅 Timeline Riepilogo

| Fase | Durata | Tasks | Output |
|------|--------|-------|--------|
| 2.1 - Fix Critici UI | 2 giorni | 4 tasks | FormTemplatesPage redesign, Field icons, Edit bug fix, Validation UI |
| 2.2 - Conditional Logic | 3 giorni | 3 tasks | Evaluator backend (30 operators), API preview, Editor UI |
| 2.3 - Form Builder | 3 giorni | 4 tasks | Builder page, Options editor, Entity mapping, Save/Load |
| 2.4 - Submissions | 2 giorni | 3 tasks | Dashboard, Details view, Export CSV/Excel |
| 2.5 - Backend | 2 giorni | 4 tasks | Schema extensions, File upload, Scoring, Entity mapping |
| **TOTALE** | **12 giorni** | **18 tasks** | **Sistema forms completo** |

---

## 🎯 Priorità di Implementazione

### ⚡ IMMEDIATI (Blockers)
1. ✅ FormTemplatesPage Redesign (Task 2.1.1) - 6h
2. ✅ Field Type Edit Bug Fix (Task 2.1.3) - 4h
3. ✅ Field Type Icons Fix (Task 2.1.2) - 2h

### 🔥 HIGH (User-Facing)
4. ✅ Validation Rules UI (Task 2.1.4) - 4h
5. ✅ Conditional Evaluator Backend (Task 2.2.1) - 12h
6. ✅ Conditional Logic Editor UI (Task 2.2.3) - 8h

### 📦 MEDIUM (New Features)
7. ✅ Form Builder Page (Task 2.3.1) - 12h
8. ✅ Options Editor (Task 2.3.2) - 4h
9. ✅ Form Save/Load (Task 2.3.4) - 4h
10. ✅ Submissions Dashboard (Task 2.4.1) - 10h

### 🔧 LOW (Backend Infrastructure)
11. ✅ Database Schema (Task 2.5.1) - 4h
12. ✅ File Upload Service (Task 2.5.2) - 6h
13. ✅ Scoring System (Task 2.5.3) - 3h
14. ✅ Entity Mapping (Task 2.5.4) - 3h

---

## ✅ Acceptance Criteria

### FormTemplatesPage
- [ ] Layout moderno con header/filters/table
- [ ] Colonna Azioni come prima colonna con dropdown
- [ ] Bulk delete con checkboxes
- [ ] Search bar e filtri per tipo/stato
- [ ] Responsive su mobile

### Form Builder
- [ ] Drag & drop campi da palette
- [ ] Reorder campi nel canvas
- [ ] Properties panel con 4 tabs
- [ ] Autosave ogni 30 secondi
- [ ] Preview modal funzionante
- [ ] Validazione pre-publish

### Conditional Logic
- [ ] Tutti i 30 operatori implementati
- [ ] Editor visuale con gruppi AND/OR
- [ ] Preview real-time nel builder
- [ ] Backend evaluation engine
- [ ] API endpoint `/evaluate-conditions`

### Submissions Dashboard
- [ ] Stats cards con dati real-time
- [ ] Filters multi-dimensionali
- [ ] Table con sorting/pagination
- [ ] Details modal con risposte
- [ ] Export CSV e Excel
- [ ] Bulk actions (process/archive/delete)

### Backend
- [ ] Schema migrations eseguite
- [ ] File upload funzionante (max 10MB)
- [ ] Scoring system per quiz
- [ ] Entity mapping Person/Company
- [ ] API complete e documentate
- [ ] Test coverage > 80%

---

## 🚀 Deploy Checklist

### Development
- [ ] Tutte le migrations applicate
- [ ] Seed data aggiornati
- [ ] Environment variables configurate
- [ ] Frontend build senza errori
- [ ] Backend test passati

### Staging
- [ ] Deploy su Hetzner staging
- [ ] Database Supabase configurato
- [ ] File upload su storage esterno
- [ ] Test end-to-end superati
- [ ] Performance check (< 200ms API)

### Production
- [ ] Backup database pre-deploy
- [ ] Deploy rollback plan pronto
- [ ] Monitoring alerts configurati
- [ ] Documentation aggiornata
- [ ] User training materiale preparato

---

## 📝 Note Tecniche

### Performance
- Conditional evaluator: cache risultati per 5 min
- Submissions list: pagination server-side
- File upload: stream processing per file > 5MB
- Export: background job per > 1000 submissions

### Security
- File upload: virus scan con ClamAV
- Entity mapping: validate tenant isolation
- Conditional logic: sandbox execution
- API: rate limiting 100 req/min per user

### GDPR
- Submissions: anonimizzazione dopo 2 anni
- File attachments: encryption at rest
- Export: audit log per ogni download
- Right to erasure: cascade delete con attachments

---

**Documento creato**: 17 Novembre 2025  
**Ultima modifica**: 17 Novembre 2025  
**Status**: Planning Completo - Ready for Implementation
