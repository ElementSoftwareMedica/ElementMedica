import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  AlertCircle,
  ArrowRight,
  Award,
  CheckCircle,
  Clock,
  Users
} from 'lucide-react';
import { PublicButton } from '../../components/public/PublicButton';
import { PublicHeader } from '../../components/public/PublicHeader';
import { PublicFooter } from '../../components/public/PublicFooter';
import { apiService } from '../../services/api';

interface CourseVariant {
  id: string;
  title: string;
  shortDescription: string;
  fullDescription: string;
  category: string;
  subcategory?: string;
  riskLevel: 'ALTO' | 'MEDIO' | 'BASSO' | 'A' | 'B' | 'C';
  courseType: 'PRIMO_CORSO' | 'AGGIORNAMENTO';
  duration: number;
  maxParticipants: number;
  price?: number;
  image1Url?: string;
  slug: string;
  objectives: string[];
  program: string[];
  requirements: string[];
  certification: string;
}

interface UnifiedCourse {
  baseTitle: string;
  category: string;
  subcategory?: string;
  variants: CourseVariant[];
  commonObjectives: string[];
  commonProgram: string[];
  commonRequirements: string[];
  commonCertification: string;
  image1Url?: string;
}

/**
 * Pagina unificata per corsi con lo stesso titolo ma diverso rischio/tipo
 * Mostra le informazioni comuni e le varianti specifiche
 */
export const UnifiedCourseDetailPage: React.FC = () => {
  const { title } = useParams<{ title: string }>();
  const navigate = useNavigate();
  const [unifiedCourse, setUnifiedCourse] = useState<UnifiedCourse | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<CourseVariant | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [requestForm, setRequestForm] = useState({
    requestType: 'info',
    name: '',
    email: '',
    phone: '',
    company: '',
    message: '',
    selectedVariant: ''
  });

  useEffect(() => {
    if (title) {
      fetchUnifiedCourse(title);
    }
  }, [title]);

  const fetchUnifiedCourse = async (title: string) => {
    try {
      setLoading(true);
      // Usa client centralizzato: il baseURL gestisce il prefisso /api automaticamente
      const data = await apiService.get<UnifiedCourse>(`/public/courses/unified/${encodeURIComponent(title)}`);
      setUnifiedCourse(data);
      
      // Seleziona la prima variante di default
      if (data.variants && data.variants.length > 0) {
        setSelectedVariant(data.variants[0]);
        setRequestForm(prev => ({ ...prev, selectedVariant: data.variants[0].id }));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore nel caricamento del corso');
    } finally {
      setLoading(false);
    }
  };

  const getRiskLevelLabel = (riskLevel: string) => {
    const labels = {
      'ALTO': 'Rischio Alto',
      'MEDIO': 'Rischio Medio', 
      'BASSO': 'Rischio Basso',
      'A': 'Categoria A',
      'B': 'Categoria B',
      'C': 'Categoria C'
    };
    return labels[riskLevel as keyof typeof labels] || riskLevel;
  };

  const getCourseTypeLabel = (courseType: string) => {
    const labels = {
      'PRIMO_CORSO': 'Primo Corso',
      'AGGIORNAMENTO': 'Aggiornamento'
    };
    return labels[courseType as keyof typeof labels] || courseType;
  };

  const getRiskLevelColor = (riskLevel: string) => {
    switch (riskLevel) {
      case 'ALTO':
      case 'A':
        return 'bg-red-600 text-white';
      case 'MEDIO':
      case 'B':
        return 'bg-yellow-600 text-white';
      case 'BASSO':
      case 'C':
        return 'bg-green-600 text-white';
      default:
        return 'bg-gray-600 text-white';
    }
  };

  const getCourseTypeColor = (courseType: string) => {
    switch (courseType) {
      case 'PRIMO_CORSO':
        return 'bg-blue-600 text-white';
      case 'AGGIORNAMENTO':
        return 'bg-purple-600 text-white';
      default:
        return 'bg-gray-600 text-white';
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setRequestForm(prev => ({ ...prev, [name]: value }));
    
    // Se cambia la variante selezionata, aggiorna anche il componente
    if (name === 'selectedVariant') {
      const variant = unifiedCourse?.variants.find(v => v.id === value);
      if (variant) {
        setSelectedVariant(variant);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      await apiService.post('/public/contact-submissions', {
        ...requestForm,
        courseTitle: unifiedCourse?.baseTitle,
        courseVariant: selectedVariant?.slug
      });

      alert('Richiesta inviata con successo!');
      setRequestForm({
        requestType: 'info',
        name: '',
        email: '',
        phone: '',
        company: '',
        message: '',
        selectedVariant: selectedVariant?.id || ''
      });
    } catch (error) {
      alert('Errore nell\'invio della richiesta. Riprova più tardi.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <PublicHeader />
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Caricamento corso...</p>
          </div>
        </div>
        <PublicFooter />
      </div>
    );
  }

  if (error || !unifiedCourse) {
    return (
      <div className="min-h-screen bg-gray-50">
        <PublicHeader />
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Corso non trovato</h1>
            <p className="text-gray-600 mb-6">{error || 'Il corso richiesto non esiste.'}</p>
            <PublicButton onClick={() => navigate('/corsi')}>
              Torna ai Corsi
            </PublicButton>
          </div>
        </div>
        <PublicFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <PublicHeader />

      {/* Course Header */}
      <section className="py-12 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* Course Image */}
            <div>
              <div className="aspect-w-16 aspect-h-9 rounded-2xl overflow-hidden bg-gray-200">
                {unifiedCourse.image1Url ? (
                  <img
                    src={unifiedCourse.image1Url}
                    alt={unifiedCourse.baseTitle}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-500 to-blue-600">
                    <Award className="w-24 h-24 text-white/80" />
                  </div>
                )}
              </div>
            </div>

            {/* Course Info */}
            <div>
              <div className="flex flex-wrap gap-2 mb-4">
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-600 text-white">
                  {unifiedCourse.category}
                </span>
                {unifiedCourse.subcategory && (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-600 text-white">
                    {unifiedCourse.subcategory}
                  </span>
                )}
              </div>

              <h1 className="text-3xl font-bold text-gray-900 mb-4">
                {unifiedCourse.baseTitle}
              </h1>

              <p className="text-xl text-gray-600 mb-6">
                {selectedVariant?.shortDescription}
              </p>

              {/* Variant Selector */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Seleziona Variante:</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {unifiedCourse.variants.map((variant) => (
                    <button
                      key={variant.id}
                      onClick={() => {
                        setSelectedVariant(variant);
                        setRequestForm(prev => ({ ...prev, selectedVariant: variant.id }));
                      }}
                      className={`p-4 rounded-lg border-2 transition-all text-left ${
                        selectedVariant?.id === variant.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex flex-wrap gap-2 mb-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRiskLevelColor(variant.riskLevel)}`}>
                          {getRiskLevelLabel(variant.riskLevel)}
                        </span>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getCourseTypeColor(variant.courseType)}`}>
                          {getCourseTypeLabel(variant.courseType)}
                        </span>
                      </div>
                      <div className="text-sm text-gray-600">
                        <div className="flex items-center gap-4">
                          <Clock className="w-4 h-4" />
                          <span>{variant.duration} ore</span>
                          <Users className="w-4 h-4" />
                          <span>Max {variant.maxParticipants} partecipanti</span>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Pricing and CTA */}
              <div className="mb-8">
                <div className="flex items-center gap-4">
                  {selectedVariant?.price ? (
                    <div className="text-2xl font-bold text-gray-900">
                      {selectedVariant.price.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })}
                    </div>
                  ) : (
                    <div className="text-gray-600">Contattaci per un preventivo personalizzato</div>
                  )}
                  <PublicButton onClick={() => document.getElementById('contact-form')?.scrollIntoView({ behavior: 'smooth' })}>
                    Richiedi Informazioni <ArrowRight className="ml-2 w-4 h-4" />
                  </PublicButton>
                </div>
              </div>

              {/* Common Features */}
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span>Attestato riconosciuto a livello nazionale</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span>Docenti qualificati con esperienza</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span>Materiale didattico incluso</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Variants Section */}
      <section className="py-12 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Varianti Disponibili</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {unifiedCourse.variants.map((variant) => (
              <div key={variant.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-semibold text-gray-900">{variant.title}</h3>
                    <div className="flex gap-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRiskLevelColor(variant.riskLevel)}`}>
                        {getRiskLevelLabel(variant.riskLevel)}
                      </span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getCourseTypeColor(variant.courseType)}`}>
                        {getCourseTypeLabel(variant.courseType)}
                      </span>
                    </div>
                  </div>
                  <p className="text-gray-600 mb-4">{variant.shortDescription}</p>
                  <div className="flex items-center gap-6 text-sm text-gray-600">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      <span>{variant.duration} ore</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      <span>Max {variant.maxParticipants} partecipanti</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact Form */}
      <section id="contact-form" className="py-12 bg-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Richiedi Informazioni</h2>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="requestType" className="block text-sm font-medium text-gray-700">Tipo di richiesta</label>
              <select
                id="requestType"
                name="requestType"
                value={requestForm.requestType}
                onChange={handleInputChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              >
                <option value="info">Richiesta Informazioni</option>
                <option value="preventivo">Richiesta Preventivo</option>
                <option value="iscrizione">Richiesta Iscrizione</option>
              </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700">Nome e Cognome</label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={requestForm.name}
                  onChange={handleInputChange}
                  required
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email</label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={requestForm.email}
                  onChange={handleInputChange}
                  required
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700">Telefono</label>
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  value={requestForm.phone}
                  onChange={handleInputChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
              <div>
                <label htmlFor="company" className="block text-sm font-medium text-gray-700">Azienda</label>
                <input
                  type="text"
                  id="company"
                  name="company"
                  value={requestForm.company}
                  onChange={handleInputChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label htmlFor="message" className="block text-sm font-medium text-gray-700">Messaggio</label>
              <textarea
                id="message"
                name="message"
                rows={4}
                value={requestForm.message}
                onChange={handleInputChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>

            <div>
              <label htmlFor="selectedVariant" className="block text-sm font-medium text-gray-700">Variante del corso</label>
              <select
                id="selectedVariant"
                name="selectedVariant"
                value={requestForm.selectedVariant}
                onChange={handleInputChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              >
                {unifiedCourse.variants.map((variant) => (
                  <option key={variant.id} value={variant.id}>
                    {variant.title} - {getRiskLevelLabel(variant.riskLevel)} - {getCourseTypeLabel(variant.courseType)}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex justify-end">
              <PublicButton type="submit">
                Invia Richiesta
              </PublicButton>
            </div>
          </form>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
};

export default UnifiedCourseDetailPage;