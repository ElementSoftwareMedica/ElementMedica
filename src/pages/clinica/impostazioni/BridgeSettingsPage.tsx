/**
 * BridgeSettingsPage
 *
 * Redirects to the unified Desktop + Bridge settings page.
 * The bridge section is now integrated into /poliambulatorio/impostazioni/desktop.
 *
 * @module pages/clinica/impostazioni/BridgeSettingsPage
 */

import { Navigate } from 'react-router-dom';

export default function BridgeSettingsPage() {
    return <Navigate to="/poliambulatorio/impostazioni/desktop" replace />;
}
