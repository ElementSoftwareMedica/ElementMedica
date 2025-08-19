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
      const response = await fetch(`/api/public/courses/unified/${encodeURIComponent(title)}`);
      
      if (!response.ok) {
        throw new Error('Corso non trovato');
      }

      const data = await response.json();
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
      const response = await fetch('/api/public/contact-submissions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...requestForm,
          courseTitle: unifiedCourse?.baseTitle,
          courseVariant: selectedVariant?.slug
        }),
      });

      if (response.ok) {
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
      } else {
        throw new Error('Errore nell\'invio della richiesta');
      }
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
                          <span className="flex items-center">
                            <Clock className="w-4 h-4 mr-1" />
                            {variant.duration}h
                          </span>
                          <span className="flex items-center">
                            <Users className="w-4 h-4 mr-1" />
                            Max {variant.maxParticipants}
                          </span>
                        </div>
                        {variant.price && (
                          <div className="mt-2 font-semibold text-blue-600">
                            €{variant.price}
                          </div>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-4">
                <PublicButton size="lg" className="flex-1">
                  Richiedi Informazioni
                </PublicButton>
                <PublicButton variant="outline" size="lg" className="flex-1">
                  Scarica Programma
                </PublicButton>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Course Details */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-8">
              
              {/* Description */}
              <div className="bg-white rounded-2xl shadow-lg p-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Descrizione del Corso</h2>
                <p className="text-gray-600 leading-relaxed">
                  {selectedVariant?.fullDescription}
                </p>
              </div>

              {/* Objectives */}
              <div className="bg-white rounded-2xl shadow-lg p-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Obiettivi Formativi</h2>
                <ul className="space-y-3">
                  {(selectedVariant?.objectives || unifiedCourse.commonObjectives).map((objective, index) => (
                    <li key={index} className="flex items-start">
                      <CheckCircle className="w-5 h-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
                      <span className="text-gray-600">{objective}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Program */}
              <div className="bg-white rounded-2xl shadow-lg p-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Programma del Corso</h2>
                <div className="space-y-3">
                  {(selectedVariant?.program || unifiedCourse.commonProgram).map((item, index) => (
                    <div key={index} className="flex items-start">
                      <span className="inline-flex items-center justify-center w-6 h-6 bg-primary-600 text-white text-sm font-medium rounded-full mr-3 mt-0.5 flex-shrink-0">
                        {index + 1}
                      </span>
                      <span className="text-gray-600">{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Requirements */}
              <div className="bg-white rounded-2xl shadow-lg p-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Requisiti di Accesso</h2>
                <ul className="space-y-3">
                  {(selectedVariant?.requirements || unifiedCourse.commonRequirements).map((requirement, index) => (
                    <li key={index} className="flex items-start">
                      <CheckCircle className="w-5 h-5 text-blue-500 mr-3 mt-0.5 flex-shrink-0" />
                      <span className="text-gray-600">{requirement}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Certification */}
              <div className="bg-white rounded-2xl shadow-lg p-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Certificazione</h2>
                <div className="flex items-start">
                  <Award className="w-8 h-8 text-yellow-500 mr-4 mt-1 flex-shrink-0" />
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Attestato di Frequenza</h3>
                    <p className="text-gray-600">{selectedVariant?.certification || unifiedCourse.commonCertification}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              
              {/* Request Form */}
              <div className="bg-white rounded-2xl shadow-lg p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-4">Richiedi Informazioni</h3>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label htmlFor="selectedVariant" className="block text-sm font-medium text-gray-700 mb-1">
                      Variante del Corso
                    </label>
                    <select
                      id="selectedVariant"
                      name="selectedVariant"
                      value={requestForm.selectedVariant}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    >
                      {unifiedCourse.variants.map((variant) => (
                        <option key={variant.id} value={variant.id}>
                          {getRiskLevelLabel(variant.riskLevel)} - {getCourseTypeLabel(variant.courseType)}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label htmlFor="requestType" className="block text-sm font-medium text-gray-700 mb-1">
                      Tipo di Richiesta
                    </label>
                    <select
                      id="requestType"
                      name="requestType"
                      value={requestForm.requestType}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    >
                      <option value="info">Informazioni generali</option>
                      <option value="quote">Richiesta preventivo</option>
                      <option value="schedule">Date disponibili</option>
                      <option value="custom">Corso personalizzato</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                      Nome e Cognome *
                    </label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      required
                      value={requestForm.name}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                      placeholder="Il tuo nome"
                    />
                  </div>

                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                      Email *
                    </label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      required
                      value={requestForm.email}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                      placeholder="la-tua-email@esempio.com"
                    />
                  </div>

                  <div>
                    <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                      Telefono
                    </label>
                    <input
                      type="tel"
                      id="phone"
                      name="phone"
                      value={requestForm.phone}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                      placeholder="+39 123 456 7890"
                    />
                  </div>

                  <div>
                    <label htmlFor="company" className="block text-sm font-medium text-gray-700 mb-1">
                      Azienda
                    </label>
                    <input
                      type="text"
                      id="company"
                      name="company"
                      value={requestForm.company}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                      placeholder="Nome azienda"
                    />
                  </div>

                  <div>
                    <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-1">
                      Messaggio
                    </label>
                    <textarea
                      id="message"
                      name="message"
                      rows={4}
                      value={requestForm.message}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                      placeholder="Descrivi la tua richiesta..."
                    />
                  </div>

                  <PublicButton type="submit" className="w-full">
                    Invia Richiesta
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </PublicButton>
                </form>
              </div>
            </div>
          </div>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
};

export default UnifiedCourseDetailPage;