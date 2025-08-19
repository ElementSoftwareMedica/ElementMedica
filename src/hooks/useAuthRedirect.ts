import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from './auth/useAuth';

/**
 * Hook per gestire il redirect intelligente tra frontend pubblico e privato
 * Gestisce la navigazione basata sullo stato di autenticazione
 */
export const useAuthRedirect = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  /**
   * Redirect intelligente per "Area Riservata"
   * Se l'utente è già autenticato, va alla dashboard
   * Altrimenti va al login
   */
  const handleAreaRiservataClick = () => {
    if (isAuthenticated) {
      navigate('/dashboard');
    } else {
      // Salva la pagina corrente per eventuale redirect post-login
      const currentPath = location.pathname;
      if (currentPath !== '/login') {
        sessionStorage.setItem('redirectAfterLogin', currentPath);
      }
      navigate('/login');
    }
  };

  /**
   * Redirect alla dashboard dopo login se l'utente è autenticato
   * Controlla se c'è un redirect salvato o va alla dashboard
   */
  const handlePostLoginRedirect = () => {
    if (isAuthenticated && !isLoading) {
      const savedRedirect = sessionStorage.getItem('redirectAfterLogin');
      
      // Se siamo nella pagina di login e l'utente è autenticato
      if (location.pathname === '/login') {
        if (savedRedirect && savedRedirect !== '/login') {
          sessionStorage.removeItem('redirectAfterLogin');
          navigate(savedRedirect);
        } else {
          navigate('/dashboard');
        }
      }
    }
  };

  /**
   * Naviga al frontend pubblico dalla dashboard
   */
  const goToPublicFrontend = () => {
    navigate('/');
  };

  /**
   * Controlla se l'utente corrente può accedere al frontend privato
   */
  const canAccessPrivateArea = () => {
    return isAuthenticated && !isLoading;
  };

  /**
   * Controlla se siamo in una pagina pubblica
   */
  const isPublicPage = () => {
    const publicPaths = ['/', '/corsi', '/servizi', '/contatti', '/lavora-con-noi', '/login'];
    return publicPaths.some(path => 
      path === '/' 
        ? location.pathname === path 
        : location.pathname.startsWith(path)
    );
  };

  /**
   * Controlla se siamo in una pagina privata
   */
  const isPrivatePage = () => {
    const privatePaths = ['/dashboard', '/companies', '/courses', '/persons', '/employees', '/settings'];
    return privatePaths.some(path => location.pathname.startsWith(path));
  };

  // Auto-redirect dopo login
  useEffect(() => {
    handlePostLoginRedirect();
  }, [isAuthenticated, isLoading, location.pathname]);

  return {
    handleAreaRiservataClick,
    handlePostLoginRedirect,
    goToPublicFrontend,
    canAccessPrivateArea,
    isPublicPage: isPublicPage(),
    isPrivatePage: isPrivatePage(),
    isAuthenticated,
    isLoading
  };
};