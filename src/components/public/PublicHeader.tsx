import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, Phone, Mail } from 'lucide-react';
import { PublicButton } from './PublicButton';
import { useAuthRedirect } from '../../hooks/useAuthRedirect';
import { trackCtaEvent } from '../../services/logs';

/**
 * Header pubblico per Element Formazione
 * Menu sempre visibile con navigazione responsive
 */
export const PublicHeader: React.FC = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const location = useLocation();
  const { handleAreaRiservataClick, isAuthenticated } = useAuthRedirect();

  const navigationItems = [
    { label: 'Home', href: '/', exact: true },
    { label: 'Corsi', href: '/corsi' },
    { label: 'Servizi', href: '/servizi' },
    { label: 'Lavora con noi', href: '/lavora-con-noi' },
    { label: 'Contatti', href: '/contatti' }
  ];

  const isActiveRoute = (href: string, exact = false) => {
    if (exact) {
      return location.pathname === href;
    }
    return location.pathname.startsWith(href);
  };

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const trackContatti = (label: string) => {
    trackCtaEvent({
      resource: 'public',
      action: 'cta_click',
      details: { label, href: '/contatti', section: 'PublicHeader' }
    });
  };

  return (
    <header className="bg-white shadow-md sticky top-0 z-50">
      {/* Top bar con contatti */}
      <div className="bg-primary-600 text-white py-2">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center text-sm">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-1">
                <Phone className="w-4 h-4" />
                <span>+39 123 456 7890</span>
              </div>
              <div className="flex items-center space-x-1">
                <Mail className="w-4 h-4" />
                <span>info@elementformazione.it</span>
              </div>
            </div>
            <div className="hidden md:block">
              <button 
                onClick={handleAreaRiservataClick}
                className="hover:text-primary-200 transition-colors"
              >
                {isAuthenticated ? 'Dashboard' : 'Area Riservata'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main header */}
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center py-4">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-primary-600 rounded-full flex items-center justify-center">
              <span className="text-white font-bold text-lg">E</span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">
                Element Formazione
              </h1>
              <p className="text-sm text-gray-600">
                Sicurezza e Formazione Professionale
              </p>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center space-x-8">
            {navigationItems.map((item) => (
              <Link
                key={item.href}
                to={item.href}
                className={`font-medium transition-colors hover:text-primary-600 ${
                  isActiveRoute(item.href, item.exact)
                    ? 'text-primary-600 border-b-2 border-primary-600 pb-1'
                    : 'text-gray-700'
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          {/* CTA Button Desktop */}
          <div className="hidden lg:block">
            <PublicButton 
              variant="primary" 
              size="md"
              to="/contatti"
              onClick={() => trackContatti('Richiedi Preventivo (header desktop)')}
            >
              Richiedi Preventivo
            </PublicButton>
          </div>

          {/* Mobile menu button */}
          <button
            onClick={toggleMenu}
            className="lg:hidden p-2 rounded-md text-gray-700 hover:text-primary-600 hover:bg-gray-100 transition-colors"
            aria-label="Toggle menu"
          >
            {isMenuOpen ? (
              <X className="w-6 h-6" />
            ) : (
              <Menu className="w-6 h-6" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Navigation */}
      {isMenuOpen && (
        <div className="lg:hidden bg-white border-t border-gray-200">
          <nav className="container mx-auto px-4 py-4">
            <div className="flex flex-col space-y-4">
              {navigationItems.map((item) => (
                <Link
                  key={item.href}
                  to={item.href}
                  onClick={() => setIsMenuOpen(false)}
                  className={`font-medium py-2 transition-colors hover:text-primary-600 ${
                    isActiveRoute(item.href, item.exact)
                      ? 'text-primary-600'
                      : 'text-gray-700'
                  }`}
                >
                  {item.label}
                </Link>
              ))}
              <div className="pt-4 border-t border-gray-200">
                <PublicButton 
                  variant="primary" 
                  size="md" 
                  className="w-full"
                  to="/contatti"
                  onClick={() => {
                    setIsMenuOpen(false);
                    trackContatti('Richiedi Preventivo (header mobile)');
                  }}
                >
                  Richiedi Preventivo
                </PublicButton>
              </div>
              <button
                onClick={() => {
                  setIsMenuOpen(false);
                  handleAreaRiservataClick();
                }}
                className="text-sm text-gray-600 hover:text-primary-600 transition-colors text-left"
              >
                {isAuthenticated ? 'Dashboard' : 'Area Riservata'}
              </button>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
};

export default PublicHeader;