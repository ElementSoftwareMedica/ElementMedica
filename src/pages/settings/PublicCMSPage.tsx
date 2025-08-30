import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { usePermissions } from '../../hooks/auth/usePermissions';
import { Button } from '../../design-system/atoms/Button/Button';
import { FormField } from '../../design-system/molecules/FormField/FormField';
import { Card } from '../../design-system/molecules/Card/Card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../design-system/molecules/Tabs/Tabs';
import { LoadingFallback } from '../../components/ui/LoadingFallback';
import { Alert, AlertDescription } from '../../components/ui/alert';
import { ImageUpload } from '../../components/ui/image-upload';
import { 
  Briefcase,
  Building,
  Globe,
  Phone,
  Settings
} from 'lucide-react';

interface CMSData {
  homepage: {
    heroTitle: string;
    heroSubtitle: string;
    heroDescription: string;
    heroImage: string;
    servicesTitle: string;
    servicesDescription: string;
    aboutTitle: string;
    aboutDescription: string;
    aboutImage: string;
  };
  services: {
    heroTitle: string;
    heroSubtitle: string;
    description: string;
    whyChooseTitle: string;
    whyChooseDescription: string;
  };
  contacts: {
    heroTitle: string;
    heroSubtitle: string;
    description: string;
    address: string;
    phone: string;
    email: string;
    hours: string;
  };
  careers: {
    heroTitle: string;
    heroSubtitle: string;
    description: string;
    benefitsTitle: string;
    benefitsDescription: string;
  };
  company: {
    heroTitle: string;
    heroSubtitle: string;
    description: string;
    missionTitle: string;
    missionDescription: string;
    visionTitle: string;
    visionDescription: string;
    valuesTitle: string;
    valuesDescription: string;
  };
}

const initialData: CMSData = {
  homepage: {
    heroTitle: 'Benvenuti in Element Formazione',
    heroSubtitle: 'La tua crescita professionale inizia qui',
    heroDescription: 'Offriamo corsi di formazione di alta qualità per sviluppare le tue competenze e accelerare la tua carriera.',
    heroImage: '',
    servicesTitle: 'I Nostri Servizi',
    servicesDescription: 'Scopri la nostra gamma completa di servizi formativi.',
    aboutTitle: 'Chi Siamo',
    aboutDescription: 'Element Formazione è un centro di eccellenza per la formazione professionale.',
    aboutImage: ''
  },
  services: {
    heroTitle: 'I Nostri Servizi',
    heroSubtitle: 'Formazione di qualità per ogni esigenza',
    description: 'Offriamo una vasta gamma di servizi formativi personalizzati.',
    whyChooseTitle: 'Perché Scegliere Element Formazione',
    whyChooseDescription: 'La nostra esperienza e professionalità al tuo servizio.'
  },
  contacts: {
    heroTitle: 'Contattaci',
    heroSubtitle: 'Siamo qui per aiutarti',
    description: 'Mettiti in contatto con noi per qualsiasi informazione.',
    address: 'Via Roma 123, 00100 Roma',
    phone: '+39 06 1234567',
    email: 'info@elementformazione.it',
    hours: 'Lun-Ven: 9:00-18:00'
  },
  careers: {
    heroTitle: 'Lavora con Noi',
    heroSubtitle: 'Unisciti al nostro team',
    description: 'Cerchiamo persone motivate e competenti.',
    benefitsTitle: 'I Nostri Benefit',
    benefitsDescription: 'Offriamo un ambiente di lavoro stimolante e benefit competitivi.'
  },
  company: {
    heroTitle: 'La Nostra Azienda',
    heroSubtitle: 'Eccellenza nella formazione dal 2010',
    description: 'Element Formazione è leader nel settore della formazione professionale.',
    missionTitle: 'La Nostra Missione',
    missionDescription: 'Fornire formazione di qualità per lo sviluppo professionale.',
    visionTitle: 'La Nostra Visione',
    visionDescription: 'Essere il punto di riferimento per la formazione in Italia.',
    valuesTitle: 'I Nostri Valori',
    valuesDescription: 'Qualità, innovazione e attenzione al cliente.'
  }
};

// Componente per sezione form riutilizzabile
interface FormSectionProps {
  title: string;
  subtitle: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}

const FormSection: React.FC<FormSectionProps> = ({ title, subtitle, icon, children }) => (
  <Card 
    title={title} 
    subtitle={subtitle}
    className="space-y-4"
  >
    {icon && (
      <div className="flex items-center gap-2 mb-4">
        {icon}
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
      </div>
    )}
    <div className="space-y-4">
      {children}
    </div>
  </Card>
);

// Componente per gruppo di campi riutilizzabile
interface FieldGroupProps {
  fields: Array<{
    name: string;
    label: string;
    type: 'text' | 'textarea' | 'email';
    value: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
    disabled?: boolean;
    error?: string;
    rows?: number;
    required?: boolean;
  }>;
}

const FieldGroup: React.FC<FieldGroupProps> = ({ fields }) => (
  <>
    {fields.map((field) => (
      <FormField
        key={field.name}
        name={field.name}
        label={field.label}
        type={field.type}
        value={field.value}
        onChange={field.onChange}
        disabled={field.disabled}
        error={field.error}
        rows={field.rows}
        required={field.required}
      />
    ))}
  </>
);

// Hook per validazione form ottimizzato
const useFormValidation = (data: CMSData) => {
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateField = (path: string, value: string) => {
    const newErrors = { ...errors };
    
    if (!value.trim()) {
      newErrors[path] = 'Questo campo è obbligatorio';
    } else {
      delete newErrors[path];
    }
    
    setErrors(newErrors);
    return !newErrors[path];
  };

  const validateAll = () => {
    const newErrors: Record<string, string> = {};
    
    // Validazione campi obbligatori
    const requiredFields = [
      'homepage.heroTitle',
      'homepage.heroSubtitle',
      'services.heroTitle',
      'contacts.heroTitle',
      'careers.heroTitle',
      'company.heroTitle'
    ];

    requiredFields.forEach(field => {
      const value = field.split('.').reduce((obj, key) => obj[key], data as any);
      if (!value?.trim()) {
        newErrors[field] = 'Questo campo è obbligatorio';
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  return { errors, validateField, validateAll, setErrors };
};

const PublicCMSPage: React.FC = () => {
  const { user } = useAuth();
  const { hasPermission } = usePermissions();
  const [formData, setFormData] = useState<CMSData>(initialData);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [activeTab, setActiveTab] = useState('homepage');
  const { errors, validateField, validateAll } = useFormValidation(formData);

  // Permessi
  const canView = hasPermission('cms', 'read');
  const canEdit = hasPermission('cms', 'edit') || hasPermission('cms', 'update');

  // Helper per aggiornare campi nested
  const handleFieldChange = (fieldPath: string, value: string) => {
    const keys = fieldPath.split('.');
    setFormData(prev => {
      const newData = { ...prev };
      let current = newData as any;
      
      for (let i = 0; i < keys.length - 1; i++) {
        current[keys[i]] = { ...current[keys[i]] };
        current = current[keys[i]];
      }
      
      current[keys[keys.length - 1]] = value;
      return newData;
    });
    setIsDirty(true);
    validateField(fieldPath, value);
  };

  // Helper generico per tutti i tipi di input
  const handleGenericChange = (fieldPath: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    handleFieldChange(fieldPath, e.target.value);
  };

  // Caricamento dati
  useEffect(() => {
    const loadData = async () => {
      try {
        // Simula caricamento dati dal server
        await new Promise(resolve => setTimeout(resolve, 1000));
        setLoading(false);
      } catch (error) {
        console.error('Errore nel caricamento dei dati CMS:', error);
        setLoading(false);
      }
    };

    if (canView) {
      loadData();
    }
  }, [canView]);

  // Salvataggio
  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateAll()) {
      console.error('Errori di validazione nel form');
      return;
    }

    setSaving(true);
    try {
      // Simula salvataggio
      await new Promise(resolve => setTimeout(resolve, 1500));
      setIsDirty(false);
      console.log('Dati CMS salvati:', formData);
    } catch (error) {
      console.error('Errore nel salvataggio:', error);
    } finally {
      setSaving(false);
    }
  };

  // Anteprima
  const handlePreview = () => {
    window.open('/', '_blank');
  };

  if (!canView) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">Non hai i permessi per visualizzare questa pagina.</p>
      </div>
    );
  }

  if (loading) {
    return <LoadingFallback />;
  }

  // Configurazione tab con icone
  const tabsConfig = [
    { id: 'homepage', label: 'Homepage', icon: <Globe className="w-4 h-4" /> },
    { id: 'services', label: 'Servizi', icon: <Settings className="w-4 h-4" /> },
    { id: 'contacts', label: 'Contatti', icon: <Phone className="w-4 h-4" /> },
    { id: 'careers', label: 'Carriere', icon: <Briefcase className="w-4 h-4" /> },
    { id: 'company', label: 'Azienda', icon: <Building className="w-4 h-4" /> }
  ];

  return (
    <div className="space-y-6">
      {/* Header ottimizzato */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestione Frontend Pubblico</h1>
          <p className="text-gray-600">Modifica i contenuti del sito web pubblico</p>
        </div>
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={handlePreview}
          >
            Anteprima Sito
          </Button>
          <Button
            onClick={onSubmit}
            disabled={!canEdit || !isDirty || saving}
          >
            {saving ? 'Salvataggio...' : 'Salva Modifiche'}
          </Button>
        </div>
      </div>

      {/* Alert per modifiche non salvate */}
      {isDirty && (
        <Alert>
          <AlertDescription>
            Hai delle modifiche non salvate. Ricordati di salvare prima di uscire dalla pagina.
          </AlertDescription>
        </Alert>
      )}

      {/* Contenuto principale con componenti riutilizzabili */}
      <form onSubmit={onSubmit}>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList>
            {tabsConfig.map(tab => (
              <TabsTrigger key={tab.id} value={tab.id} className="flex items-center gap-2">
                {tab.icon}
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>

          {/* Homepage Tab */}
          <TabsContent value="homepage" className="space-y-6">
            <FormSection title="Sezione Hero" subtitle="Contenuto principale della homepage" icon={<Globe className="w-5 h-5 text-blue-600" />}>
              <FieldGroup fields={[
                {
                  name: 'homepage.heroTitle',
                  label: 'Titolo Principale',
                  type: 'text',
                  value: formData.homepage.heroTitle,
                  onChange: handleGenericChange('homepage.heroTitle'),
                  disabled: !canEdit,
                  error: errors['homepage.heroTitle'],
                  required: true
                },
                {
                  name: 'homepage.heroSubtitle',
                  label: 'Sottotitolo',
                  type: 'text',
                  value: formData.homepage.heroSubtitle,
                  onChange: handleGenericChange('homepage.heroSubtitle'),
                  disabled: !canEdit,
                  error: errors['homepage.heroSubtitle'],
                  required: true
                },
                {
                  name: 'homepage.heroDescription',
                  label: 'Descrizione',
                  type: 'textarea',
                  value: formData.homepage.heroDescription,
                  onChange: handleGenericChange('homepage.heroDescription'),
                  disabled: !canEdit,
                  error: errors['homepage.heroDescription'],
                  rows: 3
                }
              ]} />

              {canEdit && (
                <ImageUpload
                  label="Immagine Hero"
                  value={formData.homepage.heroImage}
                  onChange={(url) => handleFieldChange('homepage.heroImage', url)}
                />
              )}
            </FormSection>

            <FormSection title="Sezione Servizi" subtitle="Presentazione dei servizi">
              <FieldGroup fields={[
                {
                  name: 'homepage.servicesTitle',
                  label: 'Titolo Servizi',
                  type: 'text',
                  value: formData.homepage.servicesTitle,
                  onChange: handleGenericChange('homepage.servicesTitle'),
                  disabled: !canEdit,
                  error: errors['homepage.servicesTitle']
                },
                {
                  name: 'homepage.servicesDescription',
                  label: 'Descrizione Servizi',
                  type: 'textarea',
                  value: formData.homepage.servicesDescription,
                  onChange: handleGenericChange('homepage.servicesDescription'),
                  disabled: !canEdit,
                  error: errors['homepage.servicesDescription'],
                  rows: 2
                }
              ]} />
            </FormSection>

            <FormSection title="Sezione Chi Siamo" subtitle="Presentazione dell'azienda">
              <FieldGroup fields={[
                {
                  name: 'homepage.aboutTitle',
                  label: 'Titolo Chi Siamo',
                  type: 'text',
                  value: formData.homepage.aboutTitle,
                  onChange: handleGenericChange('homepage.aboutTitle'),
                  disabled: !canEdit,
                  error: errors['homepage.aboutTitle']
                },
                {
                  name: 'homepage.aboutDescription',
                  label: 'Descrizione Chi Siamo',
                  type: 'textarea',
                  value: formData.homepage.aboutDescription,
                  onChange: handleGenericChange('homepage.aboutDescription'),
                  disabled: !canEdit,
                  error: errors['homepage.aboutDescription'],
                  rows: 3
                }
              ]} />

              {canEdit && (
                <ImageUpload
                  label="Immagine Chi Siamo"
                  value={formData.homepage.aboutImage}
                  onChange={(url) => handleFieldChange('homepage.aboutImage', url)}
                />
              )}
            </FormSection>
          </TabsContent>

          {/* Services Tab */}
          <TabsContent value="services" className="space-y-6">
            <FormSection title="Pagina Servizi" subtitle="Contenuti della pagina servizi" icon={<Settings className="w-5 h-5 text-green-600" />}>
              <FieldGroup fields={[
                {
                  name: 'services.heroTitle',
                  label: 'Titolo Principale',
                  type: 'text',
                  value: formData.services.heroTitle,
                  onChange: handleGenericChange('services.heroTitle'),
                  disabled: !canEdit,
                  error: errors['services.heroTitle'],
                  required: true
                },
                {
                  name: 'services.heroSubtitle',
                  label: 'Sottotitolo',
                  type: 'text',
                  value: formData.services.heroSubtitle,
                  onChange: handleGenericChange('services.heroSubtitle'),
                  disabled: !canEdit,
                  error: errors['services.heroSubtitle']
                },
                {
                  name: 'services.description',
                  label: 'Descrizione',
                  type: 'textarea',
                  value: formData.services.description,
                  onChange: handleGenericChange('services.description'),
                  disabled: !canEdit,
                  error: errors['services.description'],
                  rows: 3
                },
                {
                  name: 'services.whyChooseTitle',
                  label: 'Titolo Perché Sceglierci',
                  type: 'text',
                  value: formData.services.whyChooseTitle,
                  onChange: handleGenericChange('services.whyChooseTitle'),
                  disabled: !canEdit,
                  error: errors['services.whyChooseTitle']
                },
                {
                  name: 'services.whyChooseDescription',
                  label: 'Descrizione Perché Sceglierci',
                  type: 'textarea',
                  value: formData.services.whyChooseDescription,
                  onChange: handleGenericChange('services.whyChooseDescription'),
                  disabled: !canEdit,
                  error: errors['services.whyChooseDescription'],
                  rows: 3
                }
              ]} />
            </FormSection>
          </TabsContent>

          {/* Contacts Tab */}
          <TabsContent value="contacts" className="space-y-6">
            <FormSection title="Pagina Contatti" subtitle="Informazioni di contatto" icon={<Phone className="w-5 h-5 text-purple-600" />}>
              <FieldGroup fields={[
                {
                  name: 'contacts.heroTitle',
                  label: 'Titolo Principale',
                  type: 'text',
                  value: formData.contacts.heroTitle,
                  onChange: handleGenericChange('contacts.heroTitle'),
                  disabled: !canEdit,
                  error: errors['contacts.heroTitle'],
                  required: true
                },
                {
                  name: 'contacts.heroSubtitle',
                  label: 'Sottotitolo',
                  type: 'text',
                  value: formData.contacts.heroSubtitle,
                  onChange: handleGenericChange('contacts.heroSubtitle'),
                  disabled: !canEdit,
                  error: errors['contacts.heroSubtitle']
                },
                {
                  name: 'contacts.description',
                  label: 'Descrizione',
                  type: 'textarea',
                  value: formData.contacts.description,
                  onChange: handleGenericChange('contacts.description'),
                  disabled: !canEdit,
                  error: errors['contacts.description'],
                  rows: 3
                },
                {
                  name: 'contacts.address',
                  label: 'Indirizzo',
                  type: 'text',
                  value: formData.contacts.address,
                  onChange: handleGenericChange('contacts.address'),
                  disabled: !canEdit,
                  error: errors['contacts.address']
                },
                {
                  name: 'contacts.phone',
                  label: 'Telefono',
                  type: 'text',
                  value: formData.contacts.phone,
                  onChange: handleGenericChange('contacts.phone'),
                  disabled: !canEdit,
                  error: errors['contacts.phone']
                },
                {
                  name: 'contacts.email',
                  label: 'Email',
                  type: 'email',
                  value: formData.contacts.email,
                  onChange: handleGenericChange('contacts.email'),
                  disabled: !canEdit,
                  error: errors['contacts.email']
                },
                {
                  name: 'contacts.hours',
                  label: 'Orari',
                  type: 'text',
                  value: formData.contacts.hours,
                  onChange: handleGenericChange('contacts.hours'),
                  disabled: !canEdit,
                  error: errors['contacts.hours']
                }
              ]} />
            </FormSection>
          </TabsContent>

          {/* Careers Tab */}
          <TabsContent value="careers" className="space-y-6">
            <FormSection title="Pagina Carriere" subtitle="Contenuti per le opportunità di lavoro" icon={<Briefcase className="w-5 h-5 text-orange-600" />}>
              <FieldGroup fields={[
                {
                  name: 'careers.heroTitle',
                  label: 'Titolo Principale',
                  type: 'text',
                  value: formData.careers.heroTitle,
                  onChange: handleGenericChange('careers.heroTitle'),
                  disabled: !canEdit,
                  error: errors['careers.heroTitle'],
                  required: true
                },
                {
                  name: 'careers.heroSubtitle',
                  label: 'Sottotitolo',
                  type: 'text',
                  value: formData.careers.heroSubtitle,
                  onChange: handleGenericChange('careers.heroSubtitle'),
                  disabled: !canEdit,
                  error: errors['careers.heroSubtitle']
                },
                {
                  name: 'careers.description',
                  label: 'Descrizione',
                  type: 'textarea',
                  value: formData.careers.description,
                  onChange: handleGenericChange('careers.description'),
                  disabled: !canEdit,
                  error: errors['careers.description'],
                  rows: 3
                },
                {
                  name: 'careers.benefitsTitle',
                  label: 'Titolo Benefit',
                  type: 'text',
                  value: formData.careers.benefitsTitle,
                  onChange: handleGenericChange('careers.benefitsTitle'),
                  disabled: !canEdit,
                  error: errors['careers.benefitsTitle']
                },
                {
                  name: 'careers.benefitsDescription',
                  label: 'Descrizione Benefit',
                  type: 'textarea',
                  value: formData.careers.benefitsDescription,
                  onChange: handleGenericChange('careers.benefitsDescription'),
                  disabled: !canEdit,
                  error: errors['careers.benefitsDescription'],
                  rows: 3
                }
              ]} />
            </FormSection>
          </TabsContent>

          {/* Company Tab */}
          <TabsContent value="company" className="space-y-6">
            <FormSection title="Pagina Azienda" subtitle="Informazioni sull'azienda" icon={<Building className="w-5 h-5 text-indigo-600" />}>
              <FieldGroup fields={[
                {
                  name: 'company.heroTitle',
                  label: 'Titolo Principale',
                  type: 'text',
                  value: formData.company.heroTitle,
                  onChange: handleGenericChange('company.heroTitle'),
                  disabled: !canEdit,
                  error: errors['company.heroTitle'],
                  required: true
                },
                {
                  name: 'company.heroSubtitle',
                  label: 'Sottotitolo',
                  type: 'text',
                  value: formData.company.heroSubtitle,
                  onChange: handleGenericChange('company.heroSubtitle'),
                  disabled: !canEdit,
                  error: errors['company.heroSubtitle']
                },
                {
                  name: 'company.description',
                  label: 'Descrizione',
                  type: 'textarea',
                  value: formData.company.description,
                  onChange: handleGenericChange('company.description'),
                  disabled: !canEdit,
                  error: errors['company.description'],
                  rows: 3
                },
                {
                  name: 'company.missionTitle',
                  label: 'Titolo Missione',
                  type: 'text',
                  value: formData.company.missionTitle,
                  onChange: handleGenericChange('company.missionTitle'),
                  disabled: !canEdit,
                  error: errors['company.missionTitle']
                },
                {
                  name: 'company.missionDescription',
                  label: 'Descrizione Missione',
                  type: 'textarea',
                  value: formData.company.missionDescription,
                  onChange: handleGenericChange('company.missionDescription'),
                  disabled: !canEdit,
                  error: errors['company.missionDescription'],
                  rows: 3
                },
                {
                  name: 'company.visionTitle',
                  label: 'Titolo Visione',
                  type: 'text',
                  value: formData.company.visionTitle,
                  onChange: handleGenericChange('company.visionTitle'),
                  disabled: !canEdit,
                  error: errors['company.visionTitle']
                },
                {
                  name: 'company.visionDescription',
                  label: 'Descrizione Visione',
                  type: 'textarea',
                  value: formData.company.visionDescription,
                  onChange: handleGenericChange('company.visionDescription'),
                  disabled: !canEdit,
                  error: errors['company.visionDescription'],
                  rows: 3
                },
                {
                  name: 'company.valuesTitle',
                  label: 'Titolo Valori',
                  type: 'text',
                  value: formData.company.valuesTitle,
                  onChange: handleGenericChange('company.valuesTitle'),
                  disabled: !canEdit,
                  error: errors['company.valuesTitle']
                },
                {
                  name: 'company.valuesDescription',
                  label: 'Descrizione Valori',
                  type: 'textarea',
                  value: formData.company.valuesDescription,
                  onChange: handleGenericChange('company.valuesDescription'),
                  disabled: !canEdit,
                  error: errors['company.valuesDescription'],
                  rows: 3
                }
              ]} />
            </FormSection>
          </TabsContent>
        </Tabs>
      </form>
    </div>
  );
};

export default PublicCMSPage;