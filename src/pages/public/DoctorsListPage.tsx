/**
 * DoctorsListPage
 * 
 * Public page showing all doctors with filtering capabilities.
 * Users can filter by specialty, search by name, and click through
 * to individual doctor profile pages.
 * 
 * Route: /medici
 * API: GET /api/public/doctors
 * 
 * @module pages/public/DoctorsListPage
 */

import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Search, Stethoscope, Calendar, ChevronRight,
  Loader2, Filter, Users, AlertCircle
} from 'lucide-react';
import PublicLayout from '../../components/public/PublicLayout';
import SEOHead from '../../components/seo/SEOHead';
import { getCurrentBrand } from '@/config/brands.config';

const BRAND_ID = import.meta.env.VITE_BRAND_ID || 'element-medica';

interface PublicDoctor {
  id: string;
  nome: string;
  firstName: string;
  lastName: string;
  gender: string;
  profileImage: string | null;
  title: string | null;
  shortDescription: string | null;
  specialties: string[];
  certifications: string[];
  slotDisponibili: number;
}

export const DoctorsListPage: React.FC = () => {
  const [doctors, setDoctors] = useState<PublicDoctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSpecialty, setSelectedSpecialty] = useState<string>('');

  useEffect(() => {
    const fetchDoctors = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/public/doctors?limit=100`, {
          headers: { 'X-Frontend-Id': BRAND_ID }
        });
        if (!res.ok) throw new Error('Errore di rete');
        const data = await res.json();
        if (data.success) {
          setDoctors(data.data);
        }
      } catch {
        setError('Errore nel caricamento dei medici.');
      } finally {
        setLoading(false);
      }
    };
    fetchDoctors();
  }, []);

  // Extract unique specialties for filter
  const allSpecialties = useMemo(() => {
    const specs = new Set<string>();
    doctors.forEach(d => d.specialties?.forEach(s => specs.add(s)));
    return Array.from(specs).sort();
  }, [doctors]);

  // Filter doctors
  const filteredDoctors = useMemo(() => {
    return doctors.filter(d => {
      const matchesSearch = !searchQuery ||
        d.nome.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.lastName.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesSpecialty = !selectedSpecialty ||
        d.specialties?.includes(selectedSpecialty);
      return matchesSearch && matchesSpecialty;
    });
  }, [doctors, searchQuery, selectedSpecialty]);

  const brand = getCurrentBrand();

  return (
    <PublicLayout>
      <SEOHead
        title={`Medici Specialisti | Equipe Medica - ${brand.displayName} Padova`}
        description={`Scopri il nostro team di ${doctors.length || ''} medici specialisti a Selvazzano Dentro (Padova). ${allSpecialties.slice(0, 3).join(', ')}${allSpecialties.length > 3 ? ' e altre specialità' : ''}. Prenota la tua visita online.`}
        keywords={['medici specialisti', 'equipe medica', 'poliambulatorio Padova', 'visite specialistiche Padova', 'Selvazzano Dentro', ...allSpecialties.map(s => `${s} Padova`)]}
        canonicalUrl={`${brand.contacts.website}/medici`}
        ogType="website"
        structuredData={{
          '@context': 'https://schema.org',
          '@type': 'MedicalClinic',
          name: brand.displayName,
          description: `Equipe medica di ${brand.displayName}`,
          address: {
            '@type': 'PostalAddress',
            streetAddress: 'Via Bracciano 34',
            addressLocality: 'Selvazzano Dentro',
            addressRegion: 'PD',
            postalCode: '35030',
            addressCountry: 'IT',
          },
          medicalSpecialty: allSpecialties,
        }}
      />

      {/* Hero */}
      <section className="text-white py-16 lg:py-20" style={{ backgroundImage: 'linear-gradient(135deg, var(--color-primary-800) 0%, var(--color-primary-700) 40%, var(--color-primary-600) 100%)' }}>
        <div className="container mx-auto px-4 text-center">
          <span className="inline-block px-4 py-2 bg-primary-500/20 text-primary-300 rounded-full text-sm font-semibold mb-4 border border-primary-400/20">
            <Users className="w-4 h-4 inline mr-1.5" />
            Equipe Medica
          </span>
          <h1 className="text-4xl lg:text-5xl font-bold mb-4">I Nostri Specialisti</h1>
          <p className="text-white/70 text-lg max-w-2xl mx-auto">
            Un team di professionisti qualificati pronti a prendersi cura della tua salute.
            Consulta i profili e prenota la tua visita online.
          </p>
        </div>
      </section>

      {/* Filters */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-20">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Cerca per nome..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm"
              />
            </div>

            {/* Specialty filter */}
            <div className="relative">
              <Filter className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <select
                value={selectedSpecialty}
                onChange={(e) => setSelectedSpecialty(e.target.value)}
                className="pl-10 pr-8 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm appearance-none bg-white min-w-[200px]"
              >
                <option value="">Tutte le specialità</option>
                {allSpecialties.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Doctor Grid */}
      <section className="py-12 lg:py-16">
        <div className="container mx-auto px-4">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-10 h-10 text-primary-500 animate-spin" />
            </div>
          ) : error ? (
            <div className="text-center py-20">
              <AlertCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">{error}</p>
            </div>
          ) : filteredDoctors.length === 0 ? (
            <div className="text-center py-20">
              <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-gray-700 mb-2">Nessun medico trovato</h3>
              <p className="text-gray-500">
                {searchQuery || selectedSpecialty
                  ? 'Prova a modificare i filtri di ricerca.'
                  : 'I profili medici saranno disponibili a breve.'}
              </p>
            </div>
          ) : (
            <>
              <p className="text-sm text-gray-500 mb-6">
                {filteredDoctors.length} {filteredDoctors.length === 1 ? 'medico trovato' : 'medici trovati'}
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {filteredDoctors.map((doctor) => (
                  <Link
                    key={doctor.id}
                    to={`/medici/${doctor.id}`}
                    className="group bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl border border-gray-200 hover:border-primary-300 transition-all duration-300"
                  >
                    {/* Photo / Avatar — aspect-ratio 4:3, cropped top for face */}
                    <div className="aspect-[4/3] relative overflow-hidden" style={{ backgroundImage: 'linear-gradient(to bottom right, var(--color-primary-400), var(--color-primary-700))' }}>
                      {doctor.profileImage ? (
                        <img
                          src={doctor.profileImage}
                          alt={doctor.nome}
                          className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-500"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <div className="w-28 h-28 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center text-white text-5xl font-bold border-4 border-white/30">
                            {doctor.firstName?.[0]}{doctor.lastName?.[0]}
                          </div>
                        </div>
                      )}
                      {/* Gradient overlay per leggibilità testo */}
                      <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/40 to-transparent" />
                      {/* Slot count badge */}
                      {doctor.slotDisponibili > 0 && (
                        <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-semibold text-primary-700 flex items-center shadow-sm">
                          <Calendar className="w-3 h-3 mr-1" />
                          {doctor.slotDisponibili} slot disponibili
                        </div>
                      )}
                      {/* Nome in overlay */}
                      <div className="absolute bottom-3 left-4 right-4">
                        <h3 className="text-lg font-bold text-white drop-shadow-sm">
                          {doctor.nome}
                        </h3>
                        {doctor.title && (
                          <p className="text-white/80 text-sm font-medium drop-shadow-sm">{doctor.title}</p>
                        )}
                      </div>
                    </div>

                    {/* Content */}
                    <div className="p-5">
                      {/* Specialties */}
                      {doctor.specialties.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mb-3">
                          {doctor.specialties.slice(0, 3).map((spec, i) => (
                            <span key={i} className="inline-flex items-center px-2.5 py-1 bg-primary-50 text-primary-700 rounded-full text-xs font-medium">
                              <Stethoscope className="w-3 h-3 mr-1" />
                              {spec}
                            </span>
                          ))}
                          {doctor.specialties.length > 3 && (
                            <span className="text-xs text-gray-400 self-center">+{doctor.specialties.length - 3}</span>
                          )}
                        </div>
                      )}

                      {doctor.shortDescription && (
                        <p className="text-gray-500 text-sm line-clamp-3 mb-4">{doctor.shortDescription}</p>
                      )}

                      {/* CTA */}
                      <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                        <span className="text-sm font-semibold text-primary-600 group-hover:text-primary-700 transition-colors">
                          Vedi profilo e prenota
                        </span>
                        <ChevronRight className="w-5 h-5 text-primary-400 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </>
          )}
        </div>
      </section>
    </PublicLayout>
  );
};

export default DoctorsListPage;
