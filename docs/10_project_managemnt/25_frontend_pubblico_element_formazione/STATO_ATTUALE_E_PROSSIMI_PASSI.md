interface UnifiedFormsPageProps {
  activeTab: 'templates' | 'submissions';
}

const UnifiedFormsPage = () => {
  const [activeTab, setActiveTab] = useState('templates');
  
  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">Gestione Forms</h1>
        </div>
        
        {/* Tab Switcher con pulsanti pillola */}
        <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
          <button
            onClick={() => setActiveTab('templates')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'templates'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Form Templates
          </button>
          <button
            onClick={() => setActiveTab('submissions')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'submissions'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Form Submissions
          </button>
        </div>
        
        {/* Contenuto Tab */}
        {activeTab === 'templates' && <FormTemplatesPage />}
        {activeTab === 'submissions' && <FormSubmissionsPage />}
      </div>
    </Layout>
  );
};
```

#### Struttura Card Form Submissions
```typescript
interface FormSubmissionCardProps {
  template: FormTemplate;
  submissionsCount: number;
  lastSubmission?: Date;
  onViewSubmissions: (templateId: string) => void;
}

const FormSubmissionCard = ({ template, submissionsCount, lastSubmission, onViewSubmissions }: FormSubmissionCardProps) => {
  return (
    <div 
      className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow cursor-pointer"
      onClick={() => onViewSubmissions(template.id)}
    >
      <div className="flex justify-between items-start mb-4">
        <h3 className="text-lg font-semibold text-gray-900">{template.name}</h3>
        <span className="bg-blue-100 text-blue-800 text-sm font-medium px-2.5 py-0.5 rounded">
          {submissionsCount} risposte
        </span>
      </div>
      
      <p className="text-gray-600 text-sm mb-4">{template.description}</p>
      
      <div className="flex justify-between items-center text-sm text-gray-500">
        <span>Ultima risposta: {lastSubmission ? formatDate(lastSubmission) : 'Nessuna'}</span>
        <ChevronRightIcon className="h-5 w-5" />
      </div>
    </div>
  );
};
```

### 📊 **CHECKLIST COMPLETAMENTO FASE 7** ✅

#### ✅ **TUTTI GLI OBIETTIVI COMPLETATI (10/10)**
- [x] Separazione colori frontend pubblico/privato
- [x] Fix form submissions (collegamento pubblico → privato)
- [x] Adeguamento pagina CMS con componenti riutilizzabili
- [x] Fix pagina course detail (courses/:id)
- [x] Fix pagina corsi pubblici (corsi/unified/:id)
- [x] Dashboard privata dedicata
- [x] Navigazione pubblico/privato
- [x] Unificazione pagina forms con tab switcher
- [x] Card per form submissions con drill-down
- [x] Verifica gestione end-to-end forms

### 🎊 **FASE 7 COMPLETATA CON SUCCESSO!**

**Il sistema Element Formazione è ora completamente operativo con:**
- ✅ Frontend pubblico aziendale funzionante
- ✅ Sistema form avanzati con gestione GDPR completa
- ✅ CMS per contenuti pubblici ottimizzato
- ✅ Sistema permessi granulare completo
- ✅ Autenticazione e autorizzazione funzionanti
- ✅ Gestione end-to-end forms verificata e operativa

---

**PROGETTO PRONTO PER PRODUZIONE!** 🚀✨