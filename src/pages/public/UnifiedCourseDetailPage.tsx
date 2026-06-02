import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  ArrowRight,
  Award,
  CheckCircle,
  Clock,
  Users,
  Shield,
  RefreshCw,
  GraduationCap
} from 'lucide-react';
import { PublicButton } from '../../components/public/PublicButton';
import { PublicHeader } from '../../components/public/PublicHeader';
import { PublicFooter } from '../../components/public/PublicFooter';
import { useToast } from '../../hooks/useToast';
import { apiService } from '../../services/api';
import {
  getRiskLevelLabel as getLabel,
  getRiskLevelColor as getColor,
  getCourseTypeLabel,
  getCourseTypeColor
} from '../../utils/courseLabels';
import { getCurrentBrand } from '@/config/brands.config';
import SEOHead from '../../components/seo/SEOHead';

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
  image2Url?: string;
  fullDescription?: string;
  shortDescription?: string;
}

/**
 * Pagina unificata per corsi con lo stesso titolo ma diverso rischio/tipo
 * Mostra le informazioni comuni e le varianti specifiche
 */
export const UnifiedCourseDetailPage: React.FC = () => {
  const { title } = useParams<{ title: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();
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
      const data = await apiService.get<UnifiedCourse>(`/api/v1/public/courses/unified/${encodeURIComponent(title)}`);
      setUnifiedCourse(data);

      // Seleziona la prima variante di default
      if (data.variants && data.variants.length > 0) {
        setSelectedVariant(data.variants[0]);
        setRequestForm(prev => ({ ...prev, selectedVariant: data.variants[0].id }));
      }
    } catch (err) {
      setError('Errore nel caricamento del corso');
    } finally {
      setLoading(false);
    }
  };

  // Wrapper per le etichette che passa il titolo del corso per supportare etichette speciali (RLS)
  const getRiskLevelLabel = (riskLevel: string) => getLabel(riskLevel, unifiedCourse?.baseTitle);
  const getRiskLevelColor = (riskLevel: string, isSelected?: boolean) => getColor(riskLevel, isSelected);

  // State per i filtri delle varianti
  const [filterRiskLevel, setFilterRiskLevel] = useState<string | null>(null);
  const [filterCourseType, setFilterCourseType] = useState<string | null>(null);

  // Estrai valori unici per i filtri
  const availableRiskLevels = useMemo(() => {
    if (!unifiedCourse?.variants) return [];
    return [...new Set(unifiedCourse.variants.map(v => v.riskLevel))].sort();
  }, [unifiedCourse]);

  const availableCourseTypes = useMemo(() => {
    if (!unifiedCourse?.variants) return [];
    return [...new Set(unifiedCourse.variants.map(v => v.courseType))];
  }, [unifiedCourse]);

  // Filtra le varianti in base ai filtri selezionati
  const filteredVariants = useMemo(() => {
    if (!unifiedCourse?.variants) return [];
    return unifiedCourse.variants.filter(v => {
      if (filterRiskLevel && v.riskLevel !== filterRiskLevel) return false;
      if (filterCourseType && v.courseType !== filterCourseType) return false;
      return true;
    });
  }, [unifiedCourse, filterRiskLevel, filterCourseType]);

  // Raggruppa varianti per tipo corso
  const groupedByType = useMemo(() => {
    const groups: Record<string, CourseVariant[]> = {};
    filteredVariants.forEach(v => {
      if (!groups[v.courseType]) groups[v.courseType] = [];
      groups[v.courseType].push(v);
    });
    return groups;
  }, [filteredVariants]);

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

    // Validazione client-side
    if (!requestForm.name.trim()) {
      showToast({ type: 'warning', message: 'Il campo Nome e Cognome è obbligatorio' });
      return;
    }
    if (!requestForm.email.trim()) {
      showToast({ type: 'warning', message: 'Il campo Email è obbligatorio' });
      return;
    }
    // Validazione formato email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(requestForm.email)) {
      showToast({ type: 'warning', message: 'Inserisci un indirizzo email valido' });
      return;
    }

    try {
      await apiService.post('/api/v1/public/contact-submissions', {
        ...requestForm,
        courseTitle: unifiedCourse?.baseTitle,
        courseVariant: selectedVariant?.slug
      });

      showToast({ type: 'success', message: 'Richiesta inviata con successo!' });
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
      showToast({ type: 'error', message: 'Errore nell\'invio della richiesta. Riprova più tardi.' });
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

  const brand = getCurrentBrand();

  return (
    <div className="min-h-screen bg-gray-50">
      <SEOHead
        title={`${unifiedCourse.baseTitle} - Tutti i Livelli di Rischio | ${brand.displayName}`}
        description={`Corso ${unifiedCourse.baseTitle}: ${unifiedCourse.variants.length} varianti per diversi livelli di rischio. Formazione sicurezza sul lavoro D.Lgs. 81/08 a Selvazzano Dentro (PD).`}
        keywords={['corso sicurezza lavoro', unifiedCourse.baseTitle, unifiedCourse.category, 'formazione D.Lgs. 81/08', 'rischio alto', 'rischio medio', 'rischio basso', 'Padova']}
        canonicalUrl={`${brand.contacts.website}/corsi/unified/${encodeURIComponent(unifiedCourse.baseTitle)}`}
        ogType="article"
        ogImage={unifiedCourse.image1Url || undefined}
        structuredData={{
          '@context': 'https://schema.org',
          '@type': 'ItemList',
          name: unifiedCourse.baseTitle,
          description: `Varianti del corso ${unifiedCourse.baseTitle}`,
          numberOfItems: unifiedCourse.variants.length,
          itemListElement: unifiedCourse.variants.map((v, i) => ({
            '@type': 'ListItem',
            position: i + 1,
            item: {
              '@type': 'Course',
              name: `${v.title} - ${getLabel(v.riskLevel)}`,
              description: v.shortDescription,
              provider: { '@type': 'Organization', name: brand.displayName },
              hasCourseInstance: { '@type': 'CourseInstance', duration: `PT${v.duration}H` },
            }
          }))
        }}
      />
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
                  <div className="w-full h-full flex items-center justify-center" style={{ backgroundImage: 'linear-gradient(to bottom right, var(--color-primary-700), var(--color-primary-600))' }}>
                    <Award className="w-24 h-24 text-white/80" />
                  </div>
                )}
              </div>
              {/* Second image if available */}
              {unifiedCourse.image2Url && (
                <div className="mt-4 aspect-w-16 aspect-h-9 rounded-2xl overflow-hidden bg-gray-200">
                  <img
                    src={unifiedCourse.image2Url}
                    alt={`${unifiedCourse.baseTitle} - Seconda immagine`}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
            </div>

            {/* Course Info */}
            <div>
              <div className="flex flex-wrap gap-2 mb-4">
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-primary-700 text-white">
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
                {unifiedCourse.fullDescription || unifiedCourse.shortDescription || selectedVariant?.shortDescription}
              </p>

              {/* Pricing and CTA */}
              <div className="mb-8">
                <div className="flex items-center gap-4">
                  {selectedVariant?.price ? (
                    <div>
                      <span className="text-sm text-gray-500">A partire da</span>
                      <div className="text-2xl font-bold text-gray-900">
                        {selectedVariant.price.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })}
                      </div>
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

      {/* Variants Section - Enhanced with Filters */}
      <section className="py-12 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4 md:mb-0">Varianti Disponibili</h2>

            {/* Filter Pills */}
            <div className="flex flex-wrap gap-4">
              {/* Risk Level Filter */}
              {availableRiskLevels.length > 1 && (
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-gray-500" />
                  <span className="text-sm text-gray-600 font-medium">Rischio:</span>
                  <div className="flex gap-1">
                    <button
                      onClick={() => setFilterRiskLevel(null)}
                      className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${filterRiskLevel === null
                        ? 'bg-gray-800 text-white'
                        : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                        }`}
                    >
                      Tutti
                    </button>
                    {availableRiskLevels.map(level => (
                      <button
                        key={level}
                        onClick={() => setFilterRiskLevel(filterRiskLevel === level ? null : level)}
                        className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${getRiskLevelColor(level, filterRiskLevel === level)}`}
                      >
                        {getRiskLevelLabel(level)}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Course Type Filter */}
              {availableCourseTypes.length > 1 && (
                <div className="flex items-center gap-2">
                  <GraduationCap className="w-4 h-4 text-gray-500" />
                  <span className="text-sm text-gray-600 font-medium">Tipo:</span>
                  <div className="flex gap-1">
                    <button
                      onClick={() => setFilterCourseType(null)}
                      className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${filterCourseType === null
                        ? 'bg-gray-800 text-white'
                        : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                        }`}
                    >
                      Tutti
                    </button>
                    {availableCourseTypes.map(type => (
                      <button
                        key={type}
                        onClick={() => setFilterCourseType(filterCourseType === type ? null : type)}
                        className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${getCourseTypeColor(type, filterCourseType === type)}`}
                      >
                        {getCourseTypeLabel(type)}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Results count */}
          <p className="text-sm text-gray-500 mb-6">
            {filteredVariants.length === unifiedCourse.variants.length
              ? `${filteredVariants.length} varianti disponibili`
              : `${filteredVariants.length} di ${unifiedCourse.variants.length} varianti`
            }
          </p>

          {/* Grouped Variants Display */}
          {Object.entries(groupedByType).length > 0 ? (
            <div className="space-y-8">
              {Object.entries(groupedByType).map(([courseType, variants]) => (
                <div key={courseType}>
                  {/* Group Header */}
                  <div className="flex items-center gap-3 mb-4">
                    {courseType === 'PRIMO_CORSO' ? (
                      <GraduationCap className="w-5 h-5 text-primary-600" />
                    ) : (
                      <RefreshCw className="w-5 h-5 text-primary-600" />
                    )}
                    <h3 className="text-lg font-semibold text-gray-800">
                      {getCourseTypeLabel(courseType)}
                    </h3>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getCourseTypeColor(courseType, true)}`}>
                      {variants.length} {variants.length === 1 ? 'opzione' : 'opzioni'}
                    </span>
                  </div>

                  {/* Variants Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {variants.map((variant) => (
                      <div
                        key={variant.id}
                        onClick={() => {
                          setSelectedVariant(variant);
                          setRequestForm(prev => ({ ...prev, selectedVariant: variant.id }));
                          document.getElementById('contact-form')?.scrollIntoView({ behavior: 'smooth' });
                        }}
                        className={`bg-white rounded-xl shadow-sm border-2 overflow-hidden cursor-pointer transition-all hover:shadow-md ${selectedVariant?.id === variant.id
                          ? 'border-primary-500 ring-2 ring-primary-200'
                          : 'border-gray-200 hover:border-gray-300'
                          }`}
                      >
                        {/* Risk Level Header Band */}
                        <div className={`px-4 py-2 ${getRiskLevelColor(variant.riskLevel, true)}`}>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Shield className="w-4 h-4" />
                              <span className="text-sm font-medium">{getRiskLevelLabel(variant.riskLevel)}</span>
                            </div>
                            {selectedVariant?.id === variant.id && (
                              <CheckCircle className="w-4 h-4" />
                            )}
                          </div>
                        </div>

                        <div className="p-4">
                          <div className="mb-3">
                            <h4 className="font-semibold text-gray-900 text-sm mb-1">{variant.title}</h4>
                            {variant.shortDescription && (
                              <p className="text-xs text-gray-500 line-clamp-2">{variant.shortDescription}</p>
                            )}
                          </div>

                          {/* Key Info Pills */}
                          <div className="flex flex-wrap gap-2 mb-3">
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-gray-100 text-gray-700 text-xs">
                              <Clock className="w-3 h-3" />
                              {variant.duration}h
                            </span>
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-gray-100 text-gray-700 text-xs">
                              <Users className="w-3 h-3" />
                              Max {variant.maxParticipants}
                            </span>
                          </div>

                          {/* Price */}
                          {variant.price ? (
                            <div>
                              <span className="text-xs text-gray-500">A partire da</span>
                              <div className="text-lg font-bold text-gray-900">
                                {variant.price.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })}
                              </div>
                            </div>
                          ) : (
                            <div className="text-sm text-gray-500 italic">Prezzo su richiesta</div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
              <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">Nessuna variante corrisponde ai filtri selezionati.</p>
              <button
                onClick={() => { setFilterRiskLevel(null); setFilterCourseType(null); }}
                className="mt-4 text-primary-600 hover:text-primary-700 text-sm font-medium"
              >
                Rimuovi filtri
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Contact Form */}
      <section id="contact-form" className="py-12" style={{ backgroundImage: 'linear-gradient(to bottom right, var(--color-accent-50), var(--color-accent-100))' }}>
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Richiedi Informazioni</h2>
            <p className="text-gray-600 mb-6">Compila il form e ti ricontatteremo al più presto</p>
            <form onSubmit={handleSubmit} className="space-y-6" noValidate>
              <div>
                <label htmlFor="requestType" className="block text-sm font-medium text-gray-700 mb-1">Tipo di richiesta</label>
                <select
                  id="requestType"
                  name="requestType"
                  value={requestForm.requestType}
                  onChange={handleInputChange}
                  className="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-4 py-3 shadow-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-500 focus:ring-opacity-20"
                >
                  <option value="info">Richiesta Informazioni</option>
                  <option value="preventivo">Richiesta Preventivo</option>
                  <option value="iscrizione">Richiesta Iscrizione</option>
                </select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">Nome e Cognome *</label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={requestForm.name}
                    onChange={handleInputChange}
                    required
                    placeholder="Mario Rossi"
                    className="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-4 py-3 shadow-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-500 focus:ring-opacity-20"
                  />
                </div>
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={requestForm.email}
                    onChange={handleInputChange}
                    required
                    placeholder="mario.rossi@email.com"
                    className="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-4 py-3 shadow-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-500 focus:ring-opacity-20"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">Telefono</label>
                  <input
                    type="tel"
                    id="phone"
                    name="phone"
                    value={requestForm.phone}
                    onChange={handleInputChange}
                    placeholder="+39 333 1234567"
                    className="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-4 py-3 shadow-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-500 focus:ring-opacity-20"
                  />
                </div>
                <div>
                  <label htmlFor="company" className="block text-sm font-medium text-gray-700 mb-1">Azienda</label>
                  <input
                    type="text"
                    id="company"
                    name="company"
                    value={requestForm.company}
                    onChange={handleInputChange}
                    placeholder="Nome Azienda S.r.l."
                    className="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-4 py-3 shadow-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-500 focus:ring-opacity-20"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-1">Messaggio</label>
                <textarea
                  id="message"
                  name="message"
                  rows={4}
                  value={requestForm.message}
                  onChange={handleInputChange}
                  placeholder="Scrivi qui la tua richiesta..."
                  className="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-4 py-3 shadow-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-500 focus:ring-opacity-20 resize-none"
                />
              </div>

              <div>
                <label htmlFor="selectedVariant" className="block text-sm font-medium text-gray-700 mb-1">Variante del corso</label>
                <select
                  id="selectedVariant"
                  name="selectedVariant"
                  value={requestForm.selectedVariant}
                  onChange={handleInputChange}
                  className="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-4 py-3 shadow-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-500 focus:ring-opacity-20"
                >
                  {unifiedCourse.variants.map((variant) => (
                    <option key={variant.id} value={variant.id}>
                      {variant.title} - {getRiskLevelLabel(variant.riskLevel)} - {getCourseTypeLabel(variant.courseType)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end pt-4">
                <PublicButton type="submit">
                  Invia Richiesta
                </PublicButton>
              </div>
            </form>
          </div>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
};

export default UnifiedCourseDetailPage;