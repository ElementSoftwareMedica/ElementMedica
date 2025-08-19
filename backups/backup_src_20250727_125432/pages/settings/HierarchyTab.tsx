import React from 'react';
import { Layers, Info, Settings, Users, Shield } from 'lucide-react';
import RoleHierarchy from '../../components/roles/RoleHierarchy';

/**
 * HierarchyTab Component
 * Pagina dedicata alla gestione della gerarchia dei ruoli
 * Utilizza il componente RoleHierarchy esistente con un wrapper dedicato
 */
const HierarchyTab: React.FC = () => {
  return (
    <div className="max-w-7xl mx-auto">
      {/* Header della sezione */}
      <div className="mb-8">
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
            <Layers className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Gerarchia dei Ruoli</h1>
            <p className="text-gray-600">Gestisci la struttura gerarchica e i permessi dei ruoli</p>
          </div>
        </div>
      </div>

      {/* Pannelli informativi */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Pannello Struttura */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
              <Shield className="w-4 h-4 text-blue-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">Struttura Gerarchica</h3>
          </div>
          <p className="text-gray-600 text-sm mb-4">
            Visualizza e modifica la struttura ad albero dei ruoli del sistema.
          </p>
          <ul className="space-y-2 text-sm text-gray-600">
            <li className="flex items-center space-x-2">
              <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
              <span>Livelli gerarchici definiti</span>
            </li>
            <li className="flex items-center space-x-2">
              <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
              <span>Relazioni parent-child</span>
            </li>
            <li className="flex items-center space-x-2">
              <div className="w-1.5 h-1.5 bg-purple-500 rounded-full"></div>
              <span>Permessi ereditati</span>
            </li>
          </ul>
        </div>

        {/* Pannello Gestione */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
              <Settings className="w-4 h-4 text-green-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">Gestione Ruoli</h3>
          </div>
          <p className="text-gray-600 text-sm mb-4">
            Crea, modifica ed elimina ruoli secondo la tua autorizzazione.
          </p>
          <ul className="space-y-2 text-sm text-gray-600">
            <li className="flex items-center space-x-2">
              <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
              <span>Creazione nuovi ruoli</span>
            </li>
            <li className="flex items-center space-x-2">
              <div className="w-1.5 h-1.5 bg-orange-500 rounded-full"></div>
              <span>Modifica ruoli esistenti</span>
            </li>
            <li className="flex items-center space-x-2">
              <div className="w-1.5 h-1.5 bg-red-500 rounded-full"></div>
              <span>Riordino gerarchico</span>
            </li>
          </ul>
        </div>

        {/* Pannello Permessi */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
              <Users className="w-4 h-4 text-purple-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">Controllo Accessi</h3>
          </div>
          <p className="text-gray-600 text-sm mb-4">
            Gestisci i permessi e le autorizzazioni per ogni livello.
          </p>
          <ul className="space-y-2 text-sm text-gray-600">
            <li className="flex items-center space-x-2">
              <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
              <span>Assegnazione permessi</span>
            </li>
            <li className="flex items-center space-x-2">
              <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
              <span>Controllo ereditarietà</span>
            </li>
            <li className="flex items-center space-x-2">
              <div className="w-1.5 h-1.5 bg-purple-500 rounded-full"></div>
              <span>Sicurezza multi-livello</span>
            </li>
          </ul>
        </div>
      </div>

      {/* Pannello informativo */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
        <div className="flex items-start space-x-3">
          <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-medium text-blue-900 mb-2">Come funziona la gerarchia</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-blue-800">
              <ul className="space-y-1">
                <li>• I ruoli di livello superiore possono gestire quelli inferiori</li>
                <li>• Ogni ruolo può assegnare solo i ruoli che ha il permesso di gestire</li>
              </ul>
              <ul className="space-y-1">
                <li>• I permessi vengono ereditati in base al livello gerarchico</li>
                <li>• La struttura garantisce la sicurezza e il controllo degli accessi</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Componente RoleHierarchy principale */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
        <RoleHierarchy />
      </div>
    </div>
  );
};

export default HierarchyTab;