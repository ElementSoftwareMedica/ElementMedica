import React from 'react';
import { PublicLayout } from '../../components/public/PublicLayout';
import { HeroSection } from '../../components/public/HeroSection';
import { PublicButton } from '../../components/public/PublicButton';
import { HeartPulse, Stethoscope, ClipboardCheck, Shield, CheckCircle, Calendar, FileText, Users, Award } from 'lucide-react';
import { trackCtaEvent } from '../../services/logs';

const MedicinaDelLavoroPage: React.FC = () => {
  const features = [
    'Sorveglianza sanitaria completa',
    'Visite preventive e periodiche',
    'Giudizi di idoneità',
    'Protocolli sanitari personalizzati',
    'Gestione scadenze e richiami',
    'Report conformi alla normativa vigente'
  ];

  return (
    <PublicLayout>
      <HeroSection
        variant="medical"
        backgroundPattern="medical-grid"
        title={<>Medicina del Lavoro</>}
        subtitle="Tutela la salute dei tuoi collaboratori"
        description="Sorveglianza sanitaria professionale con medici specializzati. Protocolli personalizzati, gestione scadenze e piena conformità normativa D.Lgs. 81/08."
        primaryButton={{ 
          text: 'Richiedi Consulenza Gratuita', 
          href: '/contatti',
          variant: 'medical',
          icon: <Calendar className="w-5 h-5" />
        }}
        secondaryButton={{ 
          text: 'Scopri i Servizi', 
          href: '#servizi',
          variant: 'outline'
        }}
        stats={[
          { 
            value: '1200+', 
            label: 'Visite/anno',
            icon: <Stethoscope className="w-5 h-5" />,
            highlight: true,
            color: 'medical'
          },
          { 
            value: '80+', 
            label: 'Aziende assistite',
            icon: <Users className="w-5 h-5" />,
            color: 'default'
          },
          { 
            value: '100%', 
            label: 'Conformità',
            icon: <Shield className="w-5 h-5" />,
            highlight: true,
            color: 'health'
          },
          { 
            value: '15+', 
            label: 'Anni esperienza',
            icon: <Award className="w-5 h-5" />,
            color: 'default'
          }
        ]}
        showTrustBadges={true}
        showContactForm={false}
      />

      {/* Servizi Medicina del Lavoro - Medical themed */}
      <section id="servizi" className="py-20 bg-gradient-to-b from-white to-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header Section */}
          <div className="text-center max-w-3xl mx-auto mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-teal-100 text-teal-800 rounded-full text-sm font-medium mb-4">
              <HeartPulse className="w-4 h-4" />
              Servizi Specializzati
            </div>
            <h2 className="text-4xl font-bold text-gray-900 mb-6">
              Sorveglianza Sanitaria Completa
            </h2>
            <p className="text-xl text-gray-600">
              Una gestione strutturata e puntuale della salute dei lavoratori, integrata con i processi aziendali e conforme al D.Lgs. 81/08.
            </p>
          </div>

          {/* Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
            <div className="group p-8 bg-white rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 border border-gray-100 hover:border-teal-200">
              <div className="w-14 h-14 bg-gradient-to-r from-teal-600 to-teal-700 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Stethoscope className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Visite Mediche</h3>
              <p className="text-gray-600 mb-4">
                Programmazione e gestione completa di visite preventive, periodiche e su richiesta del lavoratore.
              </p>
              <ul className="space-y-2">
                {['Visita preassuntiva', 'Visita periodica', 'Visita straordinaria'].map((item, i) => (
                  <li key={i} className="flex items-center text-sm text-gray-700">
                    <CheckCircle className="w-4 h-4 text-health-500 mr-2 flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div className="group p-8 bg-white rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 border border-gray-100 hover:border-teal-200">
              <div className="w-14 h-14 bg-gradient-to-r from-teal-600 to-teal-700 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <ClipboardCheck className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Giudizi di Idoneità</h3>
              <p className="text-gray-600 mb-4">
                Emissione tempestiva di giudizi di idoneità conformi ai protocolli sanitari definiti.
              </p>
              <ul className="space-y-2">
                {['Idoneità completa', 'Idoneità parziale', 'Inidoneità temporanea'].map((item, i) => (
                  <li key={i} className="flex items-center text-sm text-gray-700">
                    <CheckCircle className="w-4 h-4 text-health-500 mr-2 flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div className="group p-8 bg-white rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 border border-gray-100 hover:border-teal-200">
              <div className="w-14 h-14 bg-gradient-to-r from-teal-600 to-teal-700 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Shield className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Protocolli Sanitari</h3>
              <p className="text-gray-600 mb-4">
                Definizione personalizzata di protocolli sanitari per mansione e fattore di rischio specifico.
              </p>
              <ul className="space-y-2">
                {['Analisi DVR', 'Protocollo su misura', 'Aggiornamento continuo'].map((item, i) => (
                  <li key={i} className="flex items-center text-sm text-gray-700">
                    <CheckCircle className="w-4 h-4 text-health-500 mr-2 flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div className="group p-8 bg-white rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 border border-gray-100 hover:border-teal-200">
              <div className="w-14 h-14 bg-gradient-to-r from-teal-600 to-teal-700 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <HeartPulse className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Screening & Prevenzione</h3>
              <p className="text-gray-600 mb-4">
                Programmi di controllo periodico e prevenzione per tutelare la salute nel lungo periodo.
              </p>
              <ul className="space-y-2">
                {['Esami clinici', 'Monitoraggio biologico', 'Campagne prevenzione'].map((item, i) => (
                  <li key={i} className="flex items-center text-sm text-gray-700">
                    <CheckCircle className="w-4 h-4 text-health-500 mr-2 flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div className="group p-8 bg-white rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 border border-gray-100 hover:border-teal-200">
              <div className="w-14 h-14 bg-gradient-to-r from-teal-600 to-teal-700 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Calendar className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Gestione Scadenze</h3>
              <p className="text-gray-600 mb-4">
                Sistema automatico di promemoria e gestione scadenze per garantire piena conformità normativa.
              </p>
              <ul className="space-y-2">
                {['Alert automatici', 'Calendario visite', 'Report periodici'].map((item, i) => (
                  <li key={i} className="flex items-center text-sm text-gray-700">
                    <CheckCircle className="w-4 h-4 text-health-500 mr-2 flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div className="group p-8 bg-white rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 border border-gray-100 hover:border-teal-200">
              <div className="w-14 h-14 bg-gradient-to-r from-teal-600 to-teal-700 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <FileText className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Documentazione</h3>
              <p className="text-gray-600 mb-4">
                Gestione completa della documentazione sanitaria con report conformi alla normativa vigente.
              </p>
              <ul className="space-y-2">
                {['Cartelle sanitarie', 'Report ASL', 'Archivio digitale'].map((item, i) => (
                  <li key={i} className="flex items-center text-sm text-gray-700">
                    <CheckCircle className="w-4 h-4 text-health-500 mr-2 flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Additional Features List */}
          <div className="bg-gradient-to-r from-teal-50 to-emerald-50 rounded-2xl p-8 lg:p-12 border border-teal-100">
            <h3 className="text-2xl font-bold text-gray-900 mb-6">Tutto quello che ti serve</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {features.map((f, i) => (
                <div key={i} className="flex items-start">
                  <CheckCircle className="w-6 h-6 text-health-600 mr-3 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-800 font-medium">{f}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section - Medical themed */}
      <section className="py-20 bg-gradient-medical relative overflow-hidden">
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
          }}></div>
        </div>

        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/20 backdrop-blur-sm text-white rounded-full text-sm font-medium mb-6">
            <Shield className="w-4 h-4" />
            Consulenza Personalizzata
          </div>
          <h2 className="text-3xl lg:text-4xl font-bold text-white mb-6">
            Parliamo delle tue esigenze
          </h2>
          <p className="text-xl text-white/95 mb-10 max-w-2xl mx-auto">
            Ti proponiamo un piano di sorveglianza sanitaria personalizzato, in linea con la normativa D.Lgs. 81/08 e le mansioni specifiche del tuo personale.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <PublicButton 
              variant="medical"
              size="lg"
              to="/contatti"
              className="bg-white text-teal-700 hover:bg-teal-50 shadow-2xl"
              onClick={() => trackCtaEvent({ resource: 'public', action: 'cta_click', details: { label: 'Richiedi Consulenza', href: '/contatti', section: 'MedicinaDelLavoroPage-CTA' } })}
            >
              <Calendar className="w-5 h-5 mr-2" />
              Richiedi Consulenza Gratuita
            </PublicButton>
            <PublicButton 
              variant="outline" 
              size="lg"
              to="/corsi"
              className="border-2 border-white text-white hover:bg-white hover:text-teal-700"
              onClick={() => trackCtaEvent({ resource: 'public', action: 'cta_click', details: { label: 'Scopri corsi formazione', href: '/corsi', section: 'MedicinaDelLavoroPage-CTA' } })}
            >
              Scopri i Corsi di Formazione
            </PublicButton>
          </div>

          {/* Trust indicators */}
          <div className="mt-12 pt-8 border-t border-white/20">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-white">
              <div>
                <div className="text-3xl font-bold mb-1">100%</div>
                <div className="text-sm text-white/80">Conformità Normativa</div>
              </div>
              <div>
                <div className="text-3xl font-bold mb-1">24h</div>
                <div className="text-sm text-white/80">Tempo Risposta</div>
              </div>
              <div>
                <div className="text-3xl font-bold mb-1">15+</div>
                <div className="text-sm text-white/80">Anni Esperienza</div>
              </div>
              <div>
                <div className="text-3xl font-bold mb-1">80+</div>
                <div className="text-sm text-white/80">Aziende Assistite</div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
};

export default MedicinaDelLavoroPage;