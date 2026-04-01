import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { PublicLayout } from '../../components/public/PublicLayout';
import { PublicButton } from '../../components/public/PublicButton';
import { useToast } from '../../hooks/useToast';
import { apiGet } from '../../services/api';
import { getCurrentBrand } from '@/config/brands.config';
import SEOHead from '../../components/seo/SEOHead';
import { generateEducationalOrganizationSchema } from '../../components/seo/MedicalSchemas';

interface Course {
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
  image1Url?: string;
  image2Url?: string;
  slug: string;
  price?: number;
  certification: string;
  program: string[];
  requirements: string[];
  objectives: string[];
}

const CourseDetailPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const { showToast } = useToast();
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [requestForm, setRequestForm] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    message: '',
    requestType: 'info'
  });

  // Carica il corso dal backend usando lo slug
  useEffect(() => {
    const loadCourse = async () => {
      if (!slug) {
        setError('Corso non specificato');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        // Tenta di caricare il corso dall'API pubblica
        const response = await apiGet<Course>(`/api/public/courses/${slug}`, { _skipGdprCheck: true });
        setCourse(response);
      } catch (err: unknown) {
        setError('Corso non trovato');
        setCourse(null);
      } finally {
        setLoading(false);
      }
    };

    loadCourse();
  }, [slug]);

  const getRiskLevelLabel = (riskLevel: string) => {
    const levels = {
      'ALTO': 'Rischio Alto',
      'MEDIO': 'Rischio Medio',
      'BASSO': 'Rischio Basso',
      'A': 'Rischio A',
      'B': 'Rischio B',
      'C': 'Rischio C'
    };
    return levels[riskLevel as keyof typeof levels] || riskLevel;
  };

  const getCourseTypeLabel = (courseType: string) => {
    return courseType === 'PRIMO_CORSO' ? 'Primo Corso' : 'Aggiornamento';
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setRequestForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { submitContactForm } = await import('../../services/contactSubmissions');
      await submitContactForm({
        name: requestForm.name,
        email: requestForm.email,
        phone: requestForm.phone,
        company: requestForm.company,
        subject: `Richiesta ${requestForm.requestType === 'info' ? 'Informazioni' : requestForm.requestType === 'preventivo' ? 'Preventivo' : 'Iscrizione'} - ${course?.title || 'Corso'}`,
        message: requestForm.message || `Richiesta per il corso: ${course?.title}`,
        privacyAccepted: true,
      });
      showToast({ type: 'success', message: 'Richiesta inviata con successo! Ti contatteremo presto.' });
      setRequestForm({ name: '', email: '', phone: '', company: '', message: '', requestType: 'info' });
    } catch (error) {
      showToast({ type: 'error', message: 'Errore durante l\'invio. Riprova più tardi.' });
    }
  };

  // Mostra loading
  if (loading) {
    return (
      <PublicLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      </PublicLayout>
    );
  }

  // Mostra errore se corso non trovato
  if (error || !course) {
    return (
      <PublicLayout>
        <div className="flex flex-col items-center justify-center min-h-[400px] text-center px-4">
          <svg className="w-16 h-16 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Corso non trovato</h2>
          <p className="text-gray-600 mb-4">{error || 'Il corso richiesto non esiste o non è più disponibile.'}</p>
          <Link to="/corsi" className="text-primary-600 hover:text-primary-800 font-medium">
            ← Torna ai corsi
          </Link>
        </div>
      </PublicLayout>
    );
  }

  const brand = getCurrentBrand();

  return (
    <PublicLayout>
      <SEOHead
        title={`${course.title} - ${getCourseTypeLabel(course.courseType)} | ${brand.displayName}`}
        description={course.shortDescription || `Corso ${course.title}: ${getRiskLevelLabel(course.riskLevel)}, durata ${course.duration}h. Formazione sicurezza sul lavoro D.Lgs. 81/08 a Selvazzano Dentro (PD).`}
        keywords={['corso sicurezza lavoro', course.title, course.category, getRiskLevelLabel(course.riskLevel), 'formazione D.Lgs. 81/08', 'Padova', 'Selvazzano Dentro'].filter(Boolean)}
        canonicalUrl={`${brand.contacts.website}/corsi/${course.slug}`}
        ogType="article"
        ogImage={course.image1Url || undefined}
        structuredData={{
          '@context': 'https://schema.org',
          '@type': 'Course',
          name: course.title,
          description: course.shortDescription || course.fullDescription,
          provider: { '@type': 'Organization', name: brand.displayName, url: brand.contacts.website },
          hasCourseInstance: {
            '@type': 'CourseInstance',
            courseMode: 'Blended',
            duration: `PT${course.duration}H`,
          },
          occupationalCategory: course.category,
          educationalLevel: getRiskLevelLabel(course.riskLevel),
        }}
      />
      {/* Breadcrumb */}
      <section className="bg-gray-50 py-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex" aria-label="Breadcrumb">
            <ol className="flex items-center space-x-4">
              <li>
                <Link to="/" className="text-gray-500 hover:text-gray-700">
                  Home
                </Link>
              </li>
              <li>
                <svg className="flex-shrink-0 h-5 w-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                </svg>
              </li>
              <li>
                <Link to="/corsi" className="text-gray-500 hover:text-gray-700">
                  Corsi
                </Link>
              </li>
              <li>
                <svg className="flex-shrink-0 h-5 w-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                </svg>
              </li>
              <li className="text-gray-900 font-medium">
                {course.title}
              </li>
            </ol>
          </nav>
        </div>
      </section>

      {/* Course Header */}
      <section className="py-12 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* Course Image */}
            <div>
              <div className="aspect-w-16 aspect-h-9 rounded-2xl overflow-hidden bg-gray-200">
                {course.image1Url ? (
                  <img
                    src={course.image1Url}
                    alt={course.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="flex items-center justify-center h-96">
                    <svg className="w-24 h-24 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                  </div>
                )}
              </div>
            </div>

            {/* Course Info */}
            <div>
              <div className="flex flex-wrap gap-2 mb-4">
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-primary-600 text-white">
                  {course.category}
                </span>
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-primary-600 text-white">
                  {getRiskLevelLabel(course.riskLevel)}
                </span>
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-primary-600 text-white">
                  {getCourseTypeLabel(course.courseType)}
                </span>
              </div>

              <h1 className="text-3xl font-bold text-gray-900 mb-4">
                {course.title}
              </h1>

              <p className="text-xl text-gray-600 mb-6">
                {course.shortDescription}
              </p>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center">
                    <svg className="w-5 h-5 text-primary-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-sm text-gray-600">Durata</span>
                  </div>
                  <p className="text-lg font-semibold text-gray-900">{course.duration} ore</p>
                </div>

                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center">
                    <svg className="w-5 h-5 text-primary-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    <span className="text-sm text-gray-600">Max Partecipanti</span>
                  </div>
                  <p className="text-lg font-semibold text-gray-900">{course.maxParticipants}</p>
                </div>
              </div>

              {course.price && (
                <div className="bg-primary-50 rounded-lg p-4 mb-6">
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-medium text-gray-900">Prezzo per partecipante</span>
                    <span className="text-2xl font-bold text-primary-600">€{course.price}</span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">IVA esclusa</p>
                </div>
              )}

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
                  {course.fullDescription}
                </p>
              </div>

              {/* Objectives */}
              <div className="bg-white rounded-2xl shadow-lg p-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Obiettivi Formativi</h2>
                <ul className="space-y-3">
                  {course.objectives.map((objective, index) => (
                    <li key={index} className="flex items-start">
                      <svg className="w-5 h-5 text-primary-500 mr-3 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      <span className="text-gray-600">{objective}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Program */}
              <div className="bg-white rounded-2xl shadow-lg p-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Programma del Corso</h2>
                <div className="space-y-3">
                  {course.program.map((item, index) => (
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
                  {course.requirements.map((requirement, index) => (
                    <li key={index} className="flex items-start">
                      <svg className="w-5 h-5 text-primary-500 mr-3 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      <span className="text-gray-600">{requirement}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Certification */}
              <div className="bg-white rounded-2xl shadow-lg p-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Certificazione</h2>
                <div className="flex items-start">
                  <svg className="w-8 h-8 text-yellow-500 mr-4 mt-1 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Attestato di Frequenza</h3>
                    <p className="text-gray-600">{course.certification}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">

              {/* Request Form */}
              <div className="bg-white rounded-2xl shadow-lg p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-4">Richiedi Informazioni</h3>
                <form onSubmit={handleSubmit} className="space-y-4" noValidate>
                  <div>
                    <label htmlFor="requestType" className="block text-sm font-medium text-gray-700 mb-1">
                      Tipo di Richiesta
                    </label>
                    <select
                      id="requestType"
                      name="requestType"
                      value={requestForm.requestType}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
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
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
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
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
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
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
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
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
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
                      rows={3}
                      value={requestForm.message}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
                      placeholder="Descrivi la tua richiesta..."
                    />
                  </div>

                  <PublicButton type="submit" size="sm" className="w-full">
                    Invia Richiesta
                  </PublicButton>
                </form>
              </div>

              {/* Contact Info */}
              <div className="bg-primary-50 rounded-2xl p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Hai bisogno di aiuto?</h3>
                <div className="space-y-3">
                  <div className="flex items-center">
                    <svg className="w-5 h-5 text-primary-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                    <span className="text-sm text-gray-700">{getCurrentBrand().contacts.phone}</span>
                  </div>
                  <div className="flex items-center">
                    <svg className="w-5 h-5 text-primary-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    <span className="text-sm text-gray-700">{getCurrentBrand().contacts.email}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
};

export default CourseDetailPage;