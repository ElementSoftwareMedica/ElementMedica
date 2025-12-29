/**
 * Monitor Page - F6.6.1
 * 
 * Pagina standalone per il display sala attesa.
 * Può essere aperta in fullscreen su un monitor dedicato.
 * 
 * Route: /poliambulatorio/monitor
 * 
 * @module MonitorPage
 */

import React from 'react';
import MonitorSalaAttesa from './components/MonitorSalaAttesa';

const MonitorPage: React.FC = () => {
    return (
        <MonitorSalaAttesa
            fullscreen={true}
            maxCodaVisibile={6}
            accentColor="#0d9488"
        />
    );
};

export default MonitorPage;
