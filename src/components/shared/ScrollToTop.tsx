import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Scroll to top component that resets scroll position on route change
 * Usage: Add <ScrollToTop /> inside <BrowserRouter> or after <Routes>
 */
export const ScrollToTop = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    // Reset scroll position to top on route change
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
};

export default ScrollToTop;
