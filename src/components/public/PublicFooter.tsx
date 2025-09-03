import React from 'react';
import { Link } from 'react-router-dom';
import { Phone, Mail, MapPin, Clock, Facebook, Linkedin, Instagram } from 'lucide-react';

/**
 * Footer pubblico per Element Formazione
 * Include informazioni aziendali, contatti e link utili
 */
export const PublicFooter: React.FC = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-gray-900 text-white">
      {/* Main footer content */}
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Company Info */}
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-primary-600 rounded-full flex items-center justify-center">
              <span className="text-white font-bold text-lg">E</span>
            </div>
              <div>
                <h3 className="text-xl font-bold">Element Formazione</h3>
                <p className="text-gray-400 text-sm">
                  Sicurezza e Formazione Professionale
                </p>
              </div>
            </div>
            <p className="text-gray-300 text-sm leading-relaxed">
              Leader nella formazione sulla sicurezza sul lavoro e servizi di consulenza. 
              Offriamo soluzioni complete per la conformità normativa e la sicurezza aziendale.
            </p>
            {/* Social Links */}
            <div className="flex space-x-4">
                <a 
                  href="#" 
                  className="text-gray-400 hover:text-primary-400 transition-colors"
                  aria-label="Facebook"
                >
                  <Facebook className="w-5 h-5" />
                </a>
                <a 
                  href="#" 
                  className="text-gray-400 hover:text-primary-400 transition-colors"
                  aria-label="LinkedIn"
                >
                  <Linkedin className="w-5 h-5" />
                </a>
                <a 
                  href="#" 
                  className="text-gray-400 hover:text-primary-400 transition-colors"
                  aria-label="Instagram"
                >
                  <Instagram className="w-5 h-5" />
                </a>
              </div>
          </div>

          {/* Services */}
          <div className="space-y-4">
            <h4 className="text-lg font-semibold">I Nostri Servizi</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/corsi" className="text-gray-300 hover:text-primary-400 transition-colors">
                  Corsi di Formazione
                </Link>
              </li>
              <li>
                <Link to="/rspp" className="text-gray-300 hover:text-primary-400 transition-colors">
                  Nomina RSPP
                </Link>
              </li>
              <li>
                <Link to="/medicina-del-lavoro" className="text-gray-300 hover:text-primary-400 transition-colors">
                  Medico del Lavoro
                </Link>
              </li>
              <li>
                <Link to="/servizi#dvr" className="text-gray-300 hover:text-primary-400 transition-colors">
                  Documento di Valutazione Rischi
                </Link>
              </li>
              <li>
                <Link to="/servizi#consulenza" className="text-gray-300 hover:text-primary-400 transition-colors">
                  Consulenza Sicurezza
                </Link>
              </li>
            </ul>
          </div>

          {/* Quick Links */}
          <div className="space-y-4">
            <h4 className="text-lg font-semibold">Link Utili</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/corsi" className="text-gray-300 hover:text-white transition-colors">
                  Catalogo Corsi
                </Link>
              </li>
              <li>
                <Link to="/lavora-con-noi" className="text-gray-300 hover:text-white transition-colors">
                  Lavora con Noi
                </Link>
              </li>
              <li>
                <Link to="/contatti" className="text-gray-300 hover:text-white transition-colors">
                  Contatti
                </Link>
              </li>
              <li>
                <Link to="/privacy" className="text-gray-300 hover:text-white transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link to="/cookie" className="text-gray-300 hover:text-white transition-colors">
                  Cookie Policy
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact Info */}
          <div className="space-y-4">
            <h4 className="text-lg font-semibold">Contatti</h4>
            <div className="space-y-3 text-sm">
              <div className="flex items-start space-x-3">
                <MapPin className="w-5 h-5 text-primary-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-gray-300">
                    Via Roma 123<br />
                    20100 Milano (MI)<br />
                    Italia
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <Phone className="w-5 h-5 text-primary-400 flex-shrink-0" />
                <a 
                  href="tel:+391234567890" 
                  className="text-gray-300 hover:text-white transition-colors"
                >
                  +39 123 456 7890
                </a>
              </div>
              <div className="flex items-center space-x-3">
                <Mail className="w-5 h-5 text-primary-400 flex-shrink-0" />
                <a 
                  href="mailto:info@elementformazione.it" 
                  className="text-gray-300 hover:text-white transition-colors"
                >
                  info@elementformazione.it
                </a>
              </div>
              <div className="flex items-start space-x-3">
                <Clock className="w-5 h-5 text-primary-400 mt-0.5 flex-shrink-0" />
                <div className="text-gray-300">
                  <p>Lun - Ven: 9:00 - 18:00</p>
                  <p>Sab: 9:00 - 13:00</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-gray-800">
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <div className="text-sm text-gray-400">
              © {currentYear} Element Formazione. Tutti i diritti riservati.
            </div>
            <div className="flex space-x-6 text-sm">
              <Link to="/privacy" className="text-gray-400 hover:text-white transition-colors">
                Privacy
              </Link>
              <Link to="/cookie" className="text-gray-400 hover:text-white transition-colors">
                Cookie
              </Link>
              <Link to="/termini" className="text-gray-400 hover:text-white transition-colors">
                Termini di Servizio
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default PublicFooter;