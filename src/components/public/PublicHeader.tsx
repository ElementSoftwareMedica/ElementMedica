import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, Phone, Mail } from 'lucide-react';
import { PublicButton } from './PublicButton';
import { useAuthRedirect } from '../../hooks/useAuthRedirect';
import { trackCtaEvent } from '../../services/logs';
import { useBrandConfig } from '../../hooks/useBrandConfig';

/**
 * Header pubblico multi-brand
 * Menu sempre visibile con navigazione responsive
 * Supporta Element Sicurezza e Element Medica
 */
export const PublicHeader: React.FC = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const location = useLocation();
  const { handleAreaRiservataClick, isAuthenticated } = useAuthRedirect();
  const brandConfig = useBrandConfig();

  // Track scroll position for shadow behavior
  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 10);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navigationItems = brandConfig.navigation.map(item => ({
    ...item,
    exact: item.href === '/'
  }));

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

  // Gestione Area Riservata con redirect per Element Medica
  const handleAreaRiservata = () => {
    if (brandConfig.adminUrl) {
      // Element Medica → redirect a Element Sicurezza admin
      window.location.href = brandConfig.adminUrl;
    } else {
      // Element Sicurezza → comportamento standard
      handleAreaRiservataClick();
    }
  };

  return (
    <header className={`bg-white sticky top-0 z-50 transition-shadow duration-300 ${isScrolled ? 'shadow-lg' : 'shadow-none'}`}>
      {/* Top bar con contatti */}
      <div className="text-white py-2" style={{ backgroundImage: 'linear-gradient(to right, var(--color-primary-800), var(--color-primary-700), var(--color-primary-800))' }}>
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center text-sm">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-1">
                <Phone className="w-4 h-4" />
                <span>{brandConfig.contacts.phone}</span>
              </div>
              <div className="flex items-center space-x-1">
                <Mail className="w-4 h-4" />
                <span>{brandConfig.contacts.email}</span>
              </div>
            </div>
            <div className="hidden md:block">
              <button
                onClick={handleAreaRiservata}
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
          {/* Logo — usa PNG reale dall'archivio loghi ufficiale */}
          <Link to="/" className="flex items-center">
            <img
              src={brandConfig.logo}
              alt={brandConfig.logoAlt}
              className="h-10 w-auto object-contain"
              loading="eager"
            />
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center space-x-4 xl:space-x-6">
            {navigationItems.map((item) => (
              <Link
                key={item.href}
                to={item.href}
                className={`font-medium transition-all duration-200 hover:text-primary-600 whitespace-nowrap text-sm xl:text-base pb-1 border-b-2 ${isActiveRoute(item.href, item.exact)
                  ? 'text-primary-600 border-primary-600'
                  : 'text-gray-700 border-transparent hover:border-primary-300'
                  }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          {/* CTA Button Desktop */}
          <div className="hidden lg:block ml-4 xl:ml-6 flex-shrink-0">
            <PublicButton
              variant={brandConfig.cta.primary.variant}
              size="md"
              to={brandConfig.cta.primary.href}
              onClick={() => trackContatti(`${brandConfig.cta.primary.text} (header desktop)`)}
            >
              {brandConfig.cta.primary.text}
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
      <div className={`lg:hidden bg-white border-t border-gray-200 overflow-hidden transition-all duration-300 ease-in-out ${isMenuOpen ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'}`}>
        <nav className="container mx-auto px-4 py-4">
          <div className="flex flex-col space-y-4">
            {navigationItems.map((item) => (
              <Link
                key={item.href}
                to={item.href}
                onClick={() => setIsMenuOpen(false)}
                className={`font-medium py-2 transition-colors hover:text-primary-600 ${isActiveRoute(item.href, item.exact)
                  ? 'text-primary-600'
                  : 'text-gray-700'
                  }`}
              >
                {item.label}
              </Link>
            ))}
            <div className="pt-4 border-t border-gray-200">
              <PublicButton
                variant={brandConfig.cta.primary.variant}
                size="md"
                className="w-full"
                to={brandConfig.cta.primary.href}
                onClick={() => {
                  setIsMenuOpen(false);
                  trackContatti(`${brandConfig.cta.primary.text} (header mobile)`);
                }}
              >
                {brandConfig.cta.primary.text}
              </PublicButton>
            </div>
            <button
              onClick={() => {
                setIsMenuOpen(false);
                handleAreaRiservata();
              }}
              className="text-sm text-gray-600 hover:text-primary-600 transition-colors text-left"
            >
              {isAuthenticated ? 'Dashboard' : 'Area Riservata'}
            </button>
          </div>
        </nav>
      </div>
    </header>
  );
};

export default PublicHeader;