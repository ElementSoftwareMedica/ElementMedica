/**
 * DoctorProfilePage
 * 
 * Public page showing individual doctor profile with:
 * - Hero section with photo, name, specialties
 * - Full bio and certifications
 * - List of available services (prestazioni)
 * - Booking widget (BookingCalendarIsland) pre-populated for this doctor
 * - SEO: Physician JSON-LD schema
 * 
 * Route: /medici/:medicoId
 * API: GET /api/v1/public/doctors/:id
 * 
 * @module pages/public/DoctorProfilePage
 */

import React, { useState, useEffect, lazy, Suspense } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft, Stethoscope, Award, Clock, MapPin,
  Calendar, Phone, Loader2, AlertCircle
} from 'lucide-react';
import PublicLayout from '../../components/public/PublicLayout';
import SEOHead from '../../components/seo/SEOHead';
import { generatePhysicianSchema } from '../../components/seo/MedicalSchemas';
import { getCurrentBrand } from '../../config/brands.config';

const BookingCalendarIsland = lazy(() => import('../../components/public/BookingCalendarIsland'));

const BRAND_ID = import.meta.env.VITE_BRAND_ID || 'element-medica';

interface DoctorProfile {
  id: string;
  nome: string;
  firstName: string;
  lastName: string;
  gender: string;
  profileImage: string | null;
  title: string | null;
  shortDescription: string | null;
  fullDescription: string | null;
  specialties: string[];
  certifications: string[];
  prestazioni: Array<{
    id: string;
    nome: string;
    descrizione: string | null;
    tipo: string;
    durataPrevista: number;
    prezzoBase: number;
  }>;
  prossimiSlot: Array<{
    id: string;
    data: string;
    oraInizio: string;
    oraFine: string;
    prestazione: string | null;
  }>;
}

export const DoctorProfilePage: React.FC = () => {
  const { medicoId } = useParams<{ medicoId: string }>();
  const [doctor, setDoctor] = useState<DoctorProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPrestazioneId, setSelectedPrestazioneId] = useState<string | null>(null);

  useEffect(() => {
    if (!medicoId) return;
    const fetchDoctor = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/v1/public/doctors/${medicoId}`, {
          headers: { 'X-Frontend-Id': BRAND_ID }
        });
        if (!res.ok) {
          setError(res.status === 404 ? 'Medico non trovato.' : 'Errore nel caricamento.');
          return;
        }
        const data = await res.json();
        if (data.success) {
          setDoctor(data.data);
        }
      } catch {
        setError('Errore di connessione.');
      } finally {
        setLoading(false);
      }
    };
    fetchDoctor();
  }, [medicoId]);

  if (loading) {
    return (
      <PublicLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-10 h-10 text-primary-500 animate-spin" />
        </div>
      </PublicLayout>
    );
  }

  if (error || !doctor) {
    return (
      <PublicLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
          <AlertCircle className="w-16 h-16 text-gray-300 mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Medico non trovato</h1>
          <p className="text-gray-500 mb-6">{error || 'Il profilo richiesto non è disponibile.'}</p>
          <Link
            to="/medici"
            className="px-6 py-3 bg-primary-600 text-white rounded-xl font-semibold hover:bg-primary-700 transition-colors"
          >
            Vedi tutti i medici
          </Link>
        </div>
      </PublicLayout>
    );
  }

  const formatDate = (dateStr: string) => {
    return new Date(String(dateStr).split('T')[0] + 'T12:00:00').toLocaleDateString('it-IT', {
      weekday: 'short', day: 'numeric', month: 'short'
    });
  };

  const brand = getCurrentBrand();

  return (
    <PublicLayout>
      <SEOHead
        title={`${doctor.nome} - ${doctor.specialties?.join(', ') || 'Medico'} | ${brand.displayName}`}
        description={doctor.shortDescription || `${doctor.nome} - ${doctor.specialties?.join(', ') || 'Medico specialista'} a Selvazzano Dentro (Padova). Prenota una visita online.`}
        keywords={[doctor.nome, ...(doctor.specialties || []), 'medico Padova', 'Selvazzano Dentro', ...(doctor.specialties || []).map((s: string) => `${s} Padova`)].filter(Boolean)}
        canonicalUrl={`${brand.contacts.website}/medici/${doctor.id}`}
        ogType="profile"
        ogImage={doctor.profileImage || undefined}
        structuredData={generatePhysicianSchema({
          name: `${doctor.lastName} ${doctor.firstName}`,
          gender: (doctor.gender as 'MALE' | 'FEMALE' | 'OTHER') || 'MALE',
          specialties: doctor.specialties,
          description: doctor.shortDescription || undefined,
          url: `/medici/${doctor.id}`,
          image: doctor.profileImage || undefined
        })}
      />

      {/* Back navigation */}
      <div className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-4 py-3">
          <Link
            to="/medici"
            className="inline-flex items-center text-sm text-gray-500 hover:text-primary-600 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Tutti i medici
          </Link>
        </div>
      </div>

      {/* Hero Section */}
      <section className="text-white py-16 lg:py-20" style={{ backgroundImage: 'linear-gradient(135deg, var(--color-primary-800) 0%, var(--color-primary-700) 40%, var(--color-primary-600) 100%)' }}>
        <div className="container mx-auto px-4">
          <div className="flex flex-col lg:flex-row items-center lg:items-start gap-8 lg:gap-12">
            {/* Photo */}
            <div className="flex-shrink-0">
              {doctor.profileImage ? (
                <img
                  src={doctor.profileImage}
                  alt={doctor.nome}
                  className="w-40 h-40 lg:w-52 lg:h-52 rounded-2xl object-cover border-4 border-white/20 shadow-2xl"
                />
              ) : (
                <div className="w-40 h-40 lg:w-52 lg:h-52 rounded-2xl bg-primary-500/30 border-4 border-white/20 flex items-center justify-center text-6xl font-bold text-white/60">
                  {doctor.firstName?.[0]}{doctor.lastName?.[0]}
                </div>
              )}
            </div>

            {/* Info */}
            <div className="text-center lg:text-left flex-1">
              <h1 className="text-3xl lg:text-4xl font-bold mb-3">{doctor.nome}</h1>
              {doctor.title && (
                <p className="text-primary-300 text-lg font-medium mb-4">{doctor.title}</p>
              )}

              {/* Specialties badges */}
              {doctor.specialties.length > 0 && (
                <div className="flex flex-wrap gap-2 justify-center lg:justify-start mb-6">
                  {doctor.specialties.map((spec, i) => (
                    <span key={i} className="inline-flex items-center px-3 py-1.5 bg-primary-500/20 text-primary-200 rounded-full text-sm font-medium border border-primary-400/20">
                      <Stethoscope className="w-3.5 h-3.5 mr-1.5" />
                      {spec}
                    </span>
                  ))}
                </div>
              )}

              {doctor.shortDescription && (
                <p className="text-white/70 text-lg max-w-2xl">{doctor.shortDescription}</p>
              )}

              {/* Quick stats */}
              <div className="flex flex-wrap gap-6 mt-6 justify-center lg:justify-start text-sm">
                <div className="flex items-center text-white/60">
                  <Stethoscope className="w-4 h-4 mr-2 text-primary-400" />
                  {doctor.prestazioni.length} prestazioni
                </div>
                <div className="flex items-center text-white/60">
                  <Calendar className="w-4 h-4 mr-2 text-primary-400" />
                  {doctor.prossimiSlot.length} slot disponibili
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="container mx-auto px-4 py-12 lg:py-16">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-12">
          {/* Left column - Bio & Prestazioni */}
          <div className="lg:col-span-2 space-y-10">
            {/* Full description */}
            {doctor.fullDescription && (
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Profilo Professionale</h2>
                <div className="prose prose-gray max-w-none">
                  <p className="text-gray-600 leading-relaxed whitespace-pre-line">{doctor.fullDescription}</p>
                </div>
              </div>
            )}

            {/* Certifications */}
            {doctor.certifications.length > 0 && (
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Formazione e Certificazioni</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {doctor.certifications.map((cert, i) => (
                    <div key={i} className="flex items-center p-3 bg-accent-50 rounded-xl border border-accent-200">
                      <Award className="w-5 h-5 text-primary-600 mr-3 flex-shrink-0" />
                      <span className="text-gray-700 text-sm">{cert}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Prestazioni */}
            {doctor.prestazioni.length > 0 && (
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Prestazioni Disponibili</h2>
                <div className="space-y-3">
                  {doctor.prestazioni.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => {
                        setSelectedPrestazioneId(p.id);
                        setTimeout(() => {
                          document.getElementById('prenota')?.scrollIntoView({ behavior: 'smooth' });
                        }, 100);
                      }}
                      className="w-full flex items-center justify-between p-4 bg-white rounded-xl border border-gray-200 hover:border-primary-300 hover:shadow-md transition-all group text-left"
                    >
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 group-hover:text-primary-700 transition-colors">{p.nome}</h3>
                        {p.descrizione && (
                          <p className="text-gray-500 text-sm mt-0.5 line-clamp-1">{p.descrizione}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-4 ml-4">
                        <div className="flex items-center text-gray-400 text-sm">
                          <Clock className="w-4 h-4 mr-1" />
                          {p.durataPrevista} min
                        </div>
                        {Number(p.prezzoBase) > 0 && (
                          <span className="font-bold text-primary-700">€{Number(p.prezzoBase).toFixed(0)}</span>
                        )}
                        <span className="text-xs bg-primary-50 text-primary-700 px-2.5 py-1 rounded-full font-medium group-hover:bg-primary-100 transition-colors whitespace-nowrap">
                          Prenota
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right column - Booking widget + Next slots */}
          <div className="space-y-8">
            {/* Next available slots card */}
            {doctor.prossimiSlot.length > 0 && (
              <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
                <div className="bg-primary-50 px-6 py-4 border-b border-primary-100">
                  <h3 className="font-bold text-primary-900 flex items-center">
                    <Calendar className="w-5 h-5 mr-2" />
                    Prossime Disponibilità
                  </h3>
                </div>
                <div className="divide-y divide-gray-100">
                  {doctor.prossimiSlot.slice(0, 5).map((slot) => (
                    <div key={slot.id} className="px-6 py-3 flex items-center justify-between">
                      <div>
                        <span className="font-medium text-gray-900">{formatDate(slot.data)}</span>
                        <span className="mx-2 text-gray-300">·</span>
                        <span className="text-gray-600">{slot.oraInizio} - {slot.oraFine}</span>
                      </div>
                      {slot.prestazione && (
                        <span className="text-xs bg-primary-50 text-primary-700 px-2 py-0.5 rounded-full">{slot.prestazione}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Booking CTA */}
            <div className="rounded-2xl p-6 border border-primary-200 text-center" style={{ backgroundImage: 'linear-gradient(to bottom right, var(--color-primary-50), var(--color-accent-50))' }}>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Prenota una Visita</h3>
              <p className="text-gray-600 text-sm mb-4">
                Seleziona una prestazione e un orario per prenotare il tuo appuntamento.
              </p>
              <button
                onClick={() => {
                  setSelectedPrestazioneId(null);
                  setTimeout(() => {
                    document.getElementById('prenota')?.scrollIntoView({ behavior: 'smooth' });
                  }, 100);
                }}
                className="inline-flex items-center px-6 py-3 bg-primary-600 text-white rounded-xl font-semibold hover:bg-primary-700 transition-colors"
              >
                <Calendar className="w-5 h-5 mr-2" />
                Prenota Ora
              </button>
            </div>

            {/* Contact fallback */}
            <div className="bg-white rounded-2xl p-6 border border-gray-200 text-center">
              <p className="text-gray-500 text-sm mb-3">
                Preferisci prenotare telefonicamente?
              </p>
              <a
                href={`tel:${getCurrentBrand().contacts.phone.replace(/\s/g, '')}`}
                className="inline-flex items-center text-primary-600 font-semibold hover:text-primary-700"
              >
                <Phone className="w-4 h-4 mr-2" />
                {getCurrentBrand().contacts.phone}
              </a>
            </div>
          </div>
        </div>

        {/* Full Booking Widget */}
        <div id="prenota" className="mt-16 scroll-mt-8">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Prenota con {doctor.nome}</h2>
            <p className="text-gray-500">Seleziona la prestazione e l'orario che preferisci</p>
          </div>
          <div className="max-w-3xl mx-auto">
            <Suspense fallback={
              <div className="bg-white rounded-2xl shadow-lg p-12 text-center border border-gray-200">
                <Loader2 className="w-10 h-10 text-primary-500 animate-spin mx-auto mb-4" />
                <p className="text-gray-500">Caricamento calendario...</p>
              </div>
            }>
              <BookingCalendarIsland
                key={selectedPrestazioneId || 'doctor-booking'}
                initialMedicoId={doctor.id}
                initialPrestazioneId={selectedPrestazioneId || undefined}
              />
            </Suspense>
          </div>
        </div>
      </div>
    </PublicLayout>
  );
};

export default DoctorProfilePage;
