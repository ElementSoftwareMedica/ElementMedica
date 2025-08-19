import React, { useState, useEffect } from 'react';
import { 
  Activity,
  Building,
  HardDrive,
  TrendingUp,
  Users,
  Xs
} from 'lucide-react';
import { getTenantUsage, TenantUsage } from '../../services/tenants';

interface TenantUsageModalProps {
  isOpen: boolean;
  onClose: () => void;
  tenantId: string;
}

const TenantUsageModal: React.FC<TenantUsageModalProps> = ({
  isOpen,
  onClose,
  tenantId
}) => {
  const [usage, setUsage] = useState<TenantUsage | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && tenantId) {
      fetchUsage();
    }
  }, [isOpen, tenantId]);

  const fetchUsage = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await getTenantUsage(tenantId);
      setUsage(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('it-IT').format(num);
  };

  const getUsagePercentage = (current: number, max: number) => {
    if (max === 0) return 0;
    return Math.min((current / max) * 100, 100);
  };

  const getUsageColor = (percentage: number) => {
    if (percentage >= 90) return 'bg-red-500';
    if (percentage >= 75) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">
            Utilizzo Tenant
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {isLoading && (
            <div className="flex justify-center items-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          {usage && (
            <div className="space-y-6">
              {/* Usage Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Users */}
                <div className="bg-blue-50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Users className="h-5 w-5 text-blue-600" />
                      <span className="font-medium text-blue-900">Utenti</span>
                    </div>
                    <span className="text-2xl font-bold text-blue-900">
                      {formatNumber(usage.userCount)}
                    </span>
                  </div>
                  <div className="w-full bg-blue-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${getUsagePercentage(usage.userCount, 1000)}%` }}
                    ></div>
                  </div>
                  <p className="text-sm text-blue-700 mt-1">
                    {getUsagePercentage(usage.userCount, 1000).toFixed(1)}% del limite (1,000)
                  </p>
                </div>

                {/* Companies */}
                <div className="bg-green-50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Building className="h-5 w-5 text-green-600" />
                      <span className="font-medium text-green-900">Aziende</span>
                    </div>
                    <span className="text-2xl font-bold text-green-900">
                      {formatNumber(usage.companyCount)}
                    </span>
                  </div>
                  <div className="w-full bg-green-200 rounded-full h-2">
                    <div 
                      className="bg-green-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${getUsagePercentage(usage.companyCount, 100)}%` }}
                    ></div>
                  </div>
                  <p className="text-sm text-green-700 mt-1">
                    {getUsagePercentage(usage.companyCount, 100).toFixed(1)}% del limite (100)
                  </p>
                </div>

                {/* Storage */}
                <div className="bg-purple-50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <HardDrive className="h-5 w-5 text-purple-600" />
                      <span className="font-medium text-purple-900">Storage</span>
                    </div>
                    <span className="text-2xl font-bold text-purple-900">
                      {formatBytes(usage.storageUsed)}
                    </span>
                  </div>
                  <div className="w-full bg-purple-200 rounded-full h-2">
                    <div 
                      className="bg-purple-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${getUsagePercentage(usage.storageUsed, 10 * 1024 * 1024 * 1024)}%` }}
                    ></div>
                  </div>
                  <p className="text-sm text-purple-700 mt-1">
                    {getUsagePercentage(usage.storageUsed, 10 * 1024 * 1024 * 1024).toFixed(1)}% del limite (10 GB)
                  </p>
                </div>

                {/* API Calls */}
                <div className="bg-orange-50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Activity className="h-5 w-5 text-orange-600" />
                      <span className="font-medium text-orange-900">Chiamate API</span>
                    </div>
                    <span className="text-2xl font-bold text-orange-900">
                      {formatNumber(usage.apiCallsCount)}
                    </span>
                  </div>
                  <div className="w-full bg-orange-200 rounded-full h-2">
                    <div 
                      className="bg-orange-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${getUsagePercentage(usage.apiCallsCount, 100000)}%` }}
                    ></div>
                  </div>
                  <p className="text-sm text-orange-700 mt-1">
                    {getUsagePercentage(usage.apiCallsCount, 100000).toFixed(1)}% del limite (100,000/mese)
                  </p>
                </div>
              </div>

              {/* Usage Summary */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Riepilogo Utilizzo
                </h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Utenti attivi:</span>
                    <span className="ml-2 font-medium">{formatNumber(usage.userCount)}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Aziende registrate:</span>
                    <span className="ml-2 font-medium">{formatNumber(usage.companyCount)}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Spazio utilizzato:</span>
                    <span className="ml-2 font-medium">{formatBytes(usage.storageUsed)}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">API calls questo mese:</span>
                    <span className="ml-2 font-medium">{formatNumber(usage.apiCallsCount)}</span>
                  </div>
                </div>
              </div>

              {/* Alerts */}
              {(getUsagePercentage(usage.userCount, 1000) >= 80 || 
                getUsagePercentage(usage.companyCount, 100) >= 80 || 
                getUsagePercentage(usage.storageUsed, 10 * 1024 * 1024 * 1024) >= 80 || 
                getUsagePercentage(usage.apiCallsCount, 100000) >= 80) && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <h4 className="font-medium text-yellow-800 mb-2">⚠️ Avvisi di Utilizzo</h4>
                  <ul className="text-sm text-yellow-700 space-y-1">
                    {getUsagePercentage(usage.userCount, 1000) >= 80 && (
                      <li>• Limite utenti quasi raggiunto ({getUsagePercentage(usage.userCount, 1000).toFixed(1)}%)</li>
                    )}
                    {getUsagePercentage(usage.companyCount, 100) >= 80 && (
                      <li>• Limite aziende quasi raggiunto ({getUsagePercentage(usage.companyCount, 100).toFixed(1)}%)</li>
                    )}
                    {getUsagePercentage(usage.storageUsed, 10 * 1024 * 1024 * 1024) >= 80 && (
                      <li>• Limite storage quasi raggiunto ({getUsagePercentage(usage.storageUsed, 10 * 1024 * 1024 * 1024).toFixed(1)}%)</li>
                    )}
                    {getUsagePercentage(usage.apiCallsCount, 100000) >= 80 && (
                      <li>• Limite API calls quasi raggiunto ({getUsagePercentage(usage.apiCallsCount, 100000).toFixed(1)}%)</li>
                    )}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end p-6 border-t">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
          >
            Chiudi
          </button>
        </div>
      </div>
    </div>
  );
};

export default TenantUsageModal;