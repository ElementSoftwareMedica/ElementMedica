# Quick Actions Components

> Componenti modal per azioni rapide nella pagina dettaglio azienda.

## Panoramica

Questa cartella contiene i componenti modal per le azioni rapide disponibili nella pagina `CompanyDetails`. Ogni modal è pre-compilato con i dati dell'azienda corrente per velocizzare l'inserimento dati.

## Componenti

### QuickActionsIntegrated

Pannello principale che sostituisce il vecchio `QuickActionsPanel`. Include:
- Gestione stato modal centralizzata
- Logica per determinare azioni mancanti vs completate
- Quick links di navigazione
- Callback `onActionComplete` per refresh dati

```tsx
import { QuickActionsIntegrated } from './components/companies/quick-actions';

<QuickActionsIntegrated
  companyId={id}
  companyName={company.ragioneSociale}
  nomine={company.nomine}
  sites={company.sites}
  hasTariffari={hasTariffariConfigured}
  hasMDLServices={hasMDLServices(company)}
  employeeCount={company._count?.personProfiles ?? 0}
  courseCount={company._count?.courseSchedules ?? 0}
  siteCount={company._count?.sites ?? 0}
  onActionComplete={handleActionComplete}
/>
```

### QuickActionNominaModal

Modal per creare nomina Medico Competente o RSPP.

**Props:**
- `isOpen: boolean` - Stato apertura modal
- `onClose: () => void` - Callback chiusura
- `onSuccess: () => void` - Callback successo
- `companyId: string` - ID azienda
- `companyName: string` - Nome azienda
- `tipo: 'MC' | 'RSPP'` - Tipo nomina

**Features:**
- Ricerca persona con autocomplete
- Selezione sede opzionale
- Date inizio/scadenza
- Info normativa D.Lgs 81/08

### QuickActionSopralluogoModal

Modal per programmare un sopralluogo di medicina del lavoro.

**Props:**
- `isOpen: boolean` - Stato apertura modal
- `onClose: () => void` - Callback chiusura
- `onSuccess: () => void` - Callback successo
- `companyId: string` - ID azienda
- `companyName: string` - Nome azienda

**Features:**
- Selezione sede con auto-select se unica
- Tipo sopralluogo (Ordinario/Straordinario/Verifica)
- Data e orario
- Assegnazione operatore

### QuickActionMansioneModal

Modal per assegnare mansioni ai dipendenti dell'azienda.

**Props:**
- `isOpen: boolean` - Stato apertura modal
- `onClose: () => void` - Callback chiusura
- `onSuccess: () => void` - Callback successo
- `companyId: string` - ID azienda
- `companyName: string` - Nome azienda

**Features:**
- Ricerca mansioni con filtro
- Visualizzazione rischi e livello rischio
- Multi-select dipendenti
- Indicatore mansioni già assegnate

### QuickActionTariffarioModal

Modal per associare un tariffario prestazioni all'azienda.

**Props:**
- `isOpen: boolean` - Stato apertura modal
- `onClose: () => void` - Callback chiusura
- `onSuccess: () => void` - Callback successo
- `companyId: string` - ID azienda
- `companyName: string` - Nome azienda

**Features:**
- Ricerca tariffari con filtro
- Preview prestazioni incluse
- Sconto percentuale personalizzato
- Indicatore tariffari già associati

### QuickActionDVRModal

Modal per gestire il Documento di Valutazione dei Rischi (DVR).

**Props:**
- `isOpen: boolean` - Stato apertura modal
- `onClose: () => void` - Callback chiusura
- `onSuccess: () => void` - Callback successo
- `companyId: string` - ID azienda
- `companyName: string` - Nome azienda

**Features:**
- Selezione sede con auto-select se unica
- Upload file PDF (max 10MB)
- Data redazione e revisione
- Numero revisione auto-incrementato
- Stato DVR corrente visualizzato
- Info normativa Art. 28-29 D.Lgs 81/08

## Pattern Utilizzati

### Gestione Form State
```tsx
const [formData, setFormData] = useState({...});
const [errors, setErrors] = useState<Record<string, string>>({});

const handleChange = (field: string, value: string) => {
  setFormData(prev => ({ ...prev, [field]: value }));
  if (errors[field]) {
    setErrors(prev => ({ ...prev, [field]: '' }));
  }
};
```

### React Query per Data Fetching
```tsx
const { data, isLoading } = useQuery({
  queryKey: ['entity-key', dependency],
  queryFn: async () => {
    const response = await apiGet<ResponseType>(endpoint);
    return response.data || [];
  },
  staleTime: 60 * 1000,
  enabled: isOpen
});
```

### Mutations per Submit
```tsx
const createMutation = useMutation({
  mutationFn: async (data) => apiPost(endpoint, data),
  onSuccess: () => {
    showToast({ type: 'success', message: 'Successo' });
    onSuccess();
    onClose();
  },
  onError: (error: Error) => {
    showToast({ type: 'error', message: error.message });
  }
});
```

## Design Guidelines

### Colori per Azione
| Azione | Colore Primario |
|--------|-----------------|
| Nomina MC | blue |
| Nomina RSPP | indigo |
| Sopralluogo | violet |
| Mansione | amber |
| Tariffario | emerald |
| DVR | blue |

### Layout Modal
1. **Header colorato** con icona e info azienda
2. **Form fields** con validazione inline
3. **Info normativa** in box grigio
4. **Actions** con bottoni Annulla/Conferma

## Dipendenze

- `@tanstack/react-query` - Data fetching e caching
- `lucide-react` - Icone
- `design-system/molecules/Modal` - Componente modal base
- `services/api` - API client
- `services/clinicaApi` - API servizi clinici
- `hooks/useToast` - Notifiche toast

## Normativa di Riferimento

- **Art. 38-40 D.Lgs 81/08** - Medico Competente
- **Art. 32 D.Lgs 81/08** - RSPP/ASPP
- **Art. 25 D.Lgs 81/08** - Sopralluoghi
- **Art. 28-29 D.Lgs 81/08** - DVR e Valutazione rischi
- **Art. 41 D.Lgs 81/08** - Sorveglianza sanitaria

## Test

Verificare:
1. Apertura modal da QuickActionsIntegrated
2. Pre-compilazione dati azienda
3. Validazione form obbligatori
4. Submit e refresh dati
5. Gestione errori API
6. Responsive layout
7. Upload file DVR (PDF, max 10MB)

---

**Progetto:** P58 - Company Details Enhancement  
**Data:** Gennaio 2026  
**Autore:** GitHub Copilot
