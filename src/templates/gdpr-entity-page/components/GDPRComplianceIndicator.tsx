/**
 * GDPRComplianceIndicator - Indicatore di conformità GDPR
 * 
 * Componente che visualizza lo stato di conformità GDPR di un'entità,
 * mostrando indicatori visivi per vari aspetti della compliance.
 * 
 * @version 1.0
 * @date 30 Gennaio 2025
 */

import React from 'react';
import { Shield, CheckCircle, AlertTriangle, XCircle, Clock, Info } from 'lucide-react';
import { GDPRComplianceStatus, GDPRComplianceCheck } from '../types/gdpr.types';
import { Card } from '../../../design-system/molecules/Card';
import { cn } from '../../../design-system/utils';

export interface GDPRComplianceIndicatorProps {
  /** Stato generale di conformità */
  overallStatus: GDPRComplianceStatus;
  
  /** Lista dei controlli di conformità */
  complianceChecks: GDPRComplianceCheck[];
  
  /** Mostra i dettagli dei controlli */
  showDetails?: boolean;
  
  /** Callback quando si clicca su un controllo */
  onCheckClick?: (check: GDPRComplianceCheck) => void;
  
  /** Classi CSS personalizzate */
  className?: string;
  
  /** Variante di visualizzazione */
  variant?: 'default' | 'compact' | 'detailed';
}

export const GDPRComplianceIndicator: React.FC<GDPRComplianceIndicatorProps> = ({
  overallStatus,
  complianceChecks,
  showDetails = false,
  onCheckClick,
  className = '',
  variant = 'default'
}) => {
  // Ottieni l'icona e il colore per lo stato di conformità
  const getStatusConfig = (status: GDPRComplianceStatus) => {
    switch (status) {
      case 'COMPLIANT':
        return {
          icon: CheckCircle,
          color: 'text-green-600',
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200',
          label: 'Conforme'
        };
      case 'PARTIAL':
        return {
          icon: AlertTriangle,
          color: 'text-yellow-600',
          bgColor: 'bg-yellow-50',
          borderColor: 'border-yellow-200',
          label: 'Parzialmente conforme'
        };
      case 'NON_COMPLIANT':
        return {
          icon: XCircle,
          color: 'text-red-600',
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200',
          label: 'Non conforme'
        };
      case 'PENDING':
        return {
          icon: Clock,
          color: 'text-blue-600',
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-200',
          label: 'In verifica'
        };
      default:
        return {
          icon: Info,
          color: 'text-gray-600',
          bgColor: 'bg-gray-50',
          borderColor: 'border-gray-200',
          label: 'Sconosciuto'
        };
    }
  };

  // Ottieni la configurazione per un singolo controllo
  const getCheckConfig = (status: GDPRComplianceStatus) => {
    const config = getStatusConfig(status);
    return {
      ...config,
      size: 'h-4 w-4'
    };
  };

  // Calcola le statistiche dei controlli
  const stats = complianceChecks.reduce(
    (acc, check) => {
      acc[check.status] = (acc[check.status] || 0) + 1;
      return acc;
    },
    {} as Record<GDPRComplianceStatus, number>
  );

  const overallConfig = getStatusConfig(overallStatus);
  const OverallIcon = overallConfig.icon;

  // Rendering compatto
  if (variant === 'compact') {
    return (
      <div className={cn('flex items-center space-x-2', className)}>
        <OverallIcon className={cn('h-5 w-5', overallConfig.color)} />
        <span className={cn('text-sm font-medium', overallConfig.color)}>
          {overallConfig.label}
        </span>
        <span className="text-xs text-gray-500">
          ({complianceChecks.filter(c => c.status === 'COMPLIANT').length}/{complianceChecks.length})
        </span>
      </div>
    );
  }

  return (
    <Card className={cn(
      'p-4',
      overallConfig.bgColor,
      overallConfig.borderColor,
      'border-2',
      className
    )}>
      {/* Header principale */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className={cn(
            'p-2 rounded-full',
            overallConfig.bgColor
          )}>
            <Shield className={cn('h-6 w-6', overallConfig.color)} />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              Conformità GDPR
            </h3>
            <div className="flex items-center space-x-2">
              <OverallIcon className={cn('h-4 w-4', overallConfig.color)} />
              <span className={cn('text-sm font-medium', overallConfig.color)}>
                {overallConfig.label}
              </span>
            </div>
          </div>
        </div>
        
        {/* Statistiche rapide */}
        <div className="text-right">
          <div className="text-2xl font-bold text-gray-900">
            {Math.round(
              ((stats.COMPLIANT || 0) / complianceChecks.length) * 100
            )}%
          </div>
          <div className="text-xs text-gray-500">
            {stats.COMPLIANT || 0} di {complianceChecks.length} controlli
          </div>
        </div>
      </div>

      {/* Barra di progresso */}
      <div className="mb-4">
        <div className="flex justify-between text-xs text-gray-600 mb-1">
          <span>Progresso conformità</span>
          <span>
            {Math.round(((stats.COMPLIANT || 0) / complianceChecks.length) * 100)}%
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-green-600 h-2 rounded-full transition-all duration-300"
            style={{
              width: `${((stats.COMPLIANT || 0) / complianceChecks.length) * 100}%`
            }}
          />
        </div>
      </div>

      {/* Statistiche dettagliate */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <div className="text-center p-2 bg-green-50 rounded-lg">
          <div className="text-lg font-semibold text-green-600">
            {stats.COMPLIANT || 0}
          </div>
          <div className="text-xs text-green-700">Conformi</div>
        </div>
        
        <div className="text-center p-2 bg-yellow-50 rounded-lg">
          <div className="text-lg font-semibold text-yellow-600">
            {stats.PARTIAL || 0}
          </div>
          <div className="text-xs text-yellow-700">Parziali</div>
        </div>
        
        <div className="text-center p-2 bg-red-50 rounded-lg">
          <div className="text-lg font-semibold text-red-600">
            {stats.NON_COMPLIANT || 0}
          </div>
          <div className="text-xs text-red-700">Non conformi</div>
        </div>
        
        <div className="text-center p-2 bg-blue-50 rounded-lg">
          <div className="text-lg font-semibold text-blue-600">
            {stats.PENDING || 0}
          </div>
          <div className="text-xs text-blue-700">In verifica</div>
        </div>
      </div>

      {/* Lista dettagliata dei controlli */}
      {(showDetails || variant === 'detailed') && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-900 mb-3">
            Dettaglio controlli ({complianceChecks.length})
          </h4>
          
          {complianceChecks.map((check) => {
            const checkConfig = getCheckConfig(check.status);
            const CheckIcon = checkConfig.icon;
            
            return (
              <div
                key={check.id}
                className={cn(
                  'flex items-center justify-between p-3 rounded-lg border',
                  'hover:bg-gray-50 transition-colors',
                  onCheckClick && 'cursor-pointer'
                )}
                onClick={() => onCheckClick?.(check)}
              >
                <div className="flex items-center space-x-3">
                  <CheckIcon className={cn(checkConfig.size, checkConfig.color)} />
                  <div>
                    <div className="text-sm font-medium text-gray-900">
                      {check.name}
                    </div>
                    {check.description && (
                      <div className="text-xs text-gray-500">
                        {check.description}
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="text-right">
                  <span className={cn(
                    'px-2 py-1 rounded-full text-xs font-medium',
                    checkConfig.bgColor,
                    checkConfig.color
                  )}>
                    {checkConfig.label}
                  </span>
                  {check.lastChecked && (
                    <div className="text-xs text-gray-500 mt-1">
                      {new Intl.DateTimeFormat('it-IT', {
                        day: '2-digit',
                        month: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit'
                      }).format(new Date(check.lastChecked))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
};

export default GDPRComplianceIndicator;