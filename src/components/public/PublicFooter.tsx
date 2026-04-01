import React from 'react';
import { Link } from 'react-router-dom';
import { Phone, Mail, MapPin, Clock, Facebook, Linkedin, Instagram } from 'lucide-react';
import { useBrandConfig } from '../../hooks/useBrandConfig';

/**
 * Footer pubblico multi-brand
 * Include informazioni aziendali, contatti e link utili
 * Supporta Element Sicurezza e Element Medica
 */
export const PublicFooter: React.FC = () => {
  const currentYear = new Date().getFullYear();
  const brandConfig = useBrandConfig();

  // Build brand-aware service links from navigation config
  const serviceLinks = brandConfig.navigation
    .filter(nav => nav.href !== '/' && nav.href !== '/chi-siamo' && nav.href !== '/contatti')
    .slice(0, 5);

  return (
    <footer className="text-white relative" style={{ backgroundImage: 'linear-gradient(180deg, var(--color-secondary-900) 0%, var(--color-secondary-800) 100%)' }}>
      {/* Top gradient divider */}
      <div className="divider-gradient" />
      {/* Main footer content */}
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Company Info */}
          <div className="space-y-4">
            {/* Logo bianco/negativo per sfondo scuro */}
            <img
              src={brandConfig.logoWhite}
              alt={brandConfig.logoAlt}
              className="h-10 w-auto object-contain brightness-0 invert"
              loading="lazy"
            />
            <p className="text-gray-300 text-sm leading-relaxed">
              {brandConfig.description}
            </p>
            {/* Social Links */}
            <div className="flex space-x-4">
              {brandConfig.social.facebook && (
                <a
                  href={brandConfig.social.facebook}
                  className="text-gray-400 hover:text-primary-400 hover:bg-white/10 rounded-full p-2 hover:scale-110 transition-all duration-300"
                  aria-label="Facebook"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Facebook className="w-5 h-5" />
                </a>
              )}
              {brandConfig.social.linkedin && (
                <a
                  href={brandConfig.social.linkedin}
                  className="text-gray-400 hover:text-primary-400 hover:bg-white/10 rounded-full p-2 hover:scale-110 transition-all duration-300"
                  aria-label="LinkedIn"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Linkedin className="w-5 h-5" />
                </a>
              )}
              {brandConfig.social.instagram && (
                <a
                  href={brandConfig.social.instagram}
                  className="text-gray-400 hover:text-primary-400 hover:bg-white/10 rounded-full p-2 hover:scale-110 transition-all duration-300"
                  aria-label="Instagram"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Instagram className="w-5 h-5" />
                </a>
              )}
            </div>
          </div>

          {/* Services */}
          <div className="space-y-4">
            <h4 className="text-lg font-semibold">I Nostri Servizi</h4>
            <ul className="space-y-2 text-sm">
              {serviceLinks.map((link, index) => (
                <li key={index}>
                  <Link to={link.href} className="text-gray-300 hover:text-primary-400 hover:translate-x-1 transition-all duration-200 inline-block">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Quick Links */}
          <div className="space-y-4">
            <h4 className="text-lg font-semibold">Link Utili</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/corsi" className="text-gray-300 hover:text-white hover:translate-x-1 transition-all duration-200 inline-block">
                  Catalogo Corsi
                </Link>
              </li>
              <li>
                <Link to="/lavora-con-noi" className="text-gray-300 hover:text-white hover:translate-x-1 transition-all duration-200 inline-block">
                  Lavora con Noi
                </Link>
              </li>
              <li>
                <Link to="/contatti" className="text-gray-300 hover:text-white hover:translate-x-1 transition-all duration-200 inline-block">
                  Contatti
                </Link>
              </li>
              <li>
                <Link to="/privacy-policy" className="text-gray-300 hover:text-white hover:translate-x-1 transition-all duration-200 inline-block">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link to="/cookie-policy" className="text-gray-300 hover:text-white hover:translate-x-1 transition-all duration-200 inline-block">
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
                    {brandConfig.contacts.address.split(',').map((line, i) => (
                      <React.Fragment key={i}>
                        {line.trim()}{i < brandConfig.contacts.address.split(',').length - 1 && <br />}
                      </React.Fragment>
                    ))}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <Phone className="w-5 h-5 text-primary-400 flex-shrink-0" />
                <a
                  href={`tel:${brandConfig.contacts.phone.replace(/\s/g, '')}`}
                  className="text-gray-300 hover:text-white transition-colors"
                >
                  {brandConfig.contacts.phone}
                </a>
              </div>
              <div className="flex items-center space-x-3">
                <Mail className="w-5 h-5 text-primary-400 flex-shrink-0" />
                <a
                  href={`mailto:${brandConfig.contacts.email}`}
                  className="text-gray-300 hover:text-white transition-colors"
                >
                  {brandConfig.contacts.email}
                </a>
              </div>
              <div className="flex items-start space-x-3">
                <Clock className="w-5 h-5 text-primary-400 mt-0.5 flex-shrink-0" />
                <div className="text-gray-300">
                  <p>Lun - Ven: 8:00 - 19:00</p>
                  <p>Sab: 8:00 - 13:00</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-white/10">
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <div className="text-sm text-gray-400">
              © {currentYear} {brandConfig.contacts.companyName} ({brandConfig.displayName}). Tutti i diritti riservati. | P.IVA {brandConfig.contacts.vat}
            </div>
            <div className="flex space-x-6 text-sm">
              <Link to="/privacy-policy" className="text-gray-400 hover:text-white transition-colors">
                Privacy
              </Link>
              <Link to="/cookie-policy" className="text-gray-400 hover:text-white transition-colors">
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