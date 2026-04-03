import React, { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import DesktopLicensesTab from './DesktopLicensesTab';
import { Monitor } from 'lucide-react';

const Settings: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  // Redirect /settings → /settings/desktop
  // Redirect /settings/general e /settings/users → /settings/desktop (pagine rimosse)
  useEffect(() => {
    const path = location.pathname;
    if (
      path === '/settings' ||
      path === '/settings/' ||
      path.endsWith('/general') ||
      path.endsWith('/users') ||
      path.endsWith('/logs')
    ) {
      navigate('/settings/desktop', { replace: true });
    }
  }, [location.pathname, navigate]);

  return (
    <div className="container px-4 mx-auto py-6">
      <h1 className="text-2xl font-bold mb-6 flex items-center gap-2">
        <Monitor className="h-6 w-6" />
        App Desktop
      </h1>

      <DesktopLicensesTab />
    </div>
  );
};

export default Settings;