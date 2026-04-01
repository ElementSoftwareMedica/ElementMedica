/**
 * CMSFormTemplates - Gestione form pubblici nell'area CMS
 *
 * Mostra e gestisce i form templates con isPublic=true.
 * I form pubblici sono quelli esposti sul frontend pubblico del sito.
 * La navigazione al dettaglio usa basePath="/management/cms/forms".
 */

import React from 'react';
import { Globe, Code2, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import FormTemplatesPage from '../forms/FormTemplatesPage';

const CMSFormTemplates: React.FC = () => {
    const navigate = useNavigate();

    return (
        <div className="space-y-4">
            {/* CMS-specific header */}
            <div className="flex items-center gap-3 pb-2 border-b border-gray-200">
                <div className="p-2 rounded-xl bg-blue-50 flex-shrink-0">
                    <Globe className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                    <h2 className="text-lg font-bold text-gray-900">Form Pubblici</h2>
                    <p className="text-sm text-gray-500">
                        Crea e gestisci i form visibili sul sito pubblico. Le risposte ricevute sono consultabili nella tab "Risposte Form".
                    </p>
                </div>
            </div>

            {/* Info: integrazione API */}
            <div className="bg-teal-50 border border-teal-200 rounded-xl p-4 flex gap-3 text-sm text-teal-800">
                <Code2 className="h-5 w-5 shrink-0 mt-0.5 text-teal-600" />
                <div className="space-y-1">
                    <p className="font-semibold">Integrazione via API Embed</p>
                    <p className="text-xs text-teal-700">
                        I form pubblici possono essere embeddati su qualsiasi sito esterno tramite il widget <code className="bg-white px-1 rounded font-mono">forms</code>.
                        Per configurarlo, crea una <strong>Chiave API</strong> nella sezione{' '}
                        <button
                            onClick={() => navigate('/management/api-pubbliche')}
                            className="font-semibold underline hover:text-teal-900 inline-flex items-center gap-1"
                            type="button"
                        >
                            API Pubbliche <ExternalLink className="h-3 w-3" />
                        </button>{' '}
                        e seleziona il widget "Form CMS".
                    </p>
                </div>
            </div>

            {/* FormTemplatesPage con filtro isPublicOnly e navigazione verso /forms */}
            <FormTemplatesPage
                hideHeader
                isPublicOnly
                basePath="/management/cms/forms"
            />
        </div>
    );
};

export default CMSFormTemplates;
