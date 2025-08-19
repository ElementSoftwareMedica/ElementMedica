/**
 * GDPR Entity Header - Header della pagina con indicatori GDPR
 * 
 * Componente header che replica la struttura della pagina Courses
 * con l'aggiunta di indicatori e controlli GDPR.
 * 
 * @version 1.0
 * @date 30 Dicembre 2024
 */

import React from 'react';
import { BreadcrumbItem, HeaderAction } from '../types/template.types';
import { Button, Badge, Card } from '../../../design-system';
import { 
  Breadcrumb, 
  BreadcrumbList, 
  BreadcrumbItem as BreadcrumbItemComponent, 
  BreadcrumbLink, 
  BreadcrumbPage, 
  BreadcrumbSeparator,
  DropdownMenu, 
  DropdownMenuTrigger, 
  DropdownMenuContent, 
  DropdownMenuItem 
} from '../../../design-system';
import { 
  Download,
  FileText,
  MoreVertical,
  Settings,
  Shield
} from 'lucide-react';

/**
 * Props del componente GDPREntityHeader
 */
export interface GDPREntityHeaderProps {
  /** Titolo principale della pagina */
  title: string;
  
  /** Sottotitolo della pagina */
  subtitle?: string;
  
  /** Numero totale di entità */
  entityCount: number;
  
  /** Numero di entità selezionate */
  selectedCount: number;
  
  /** Mostra indicatori GDPR */
  showGDPRIndicators: boolean;
  
  /** Breadcrumb personalizzato */
  breadcrumb?: BreadcrumbItem[];
  
  /** Azioni header personalizzate */
  customActions?: HeaderAction[];
  
  /** Callback per click su audit */
  onAuditClick?: () => void;
  
  /** Callback per click su export */
  onExportClick?: () => void;
  
  /** Callback per click su consensi */
  onConsentClick?: () => void;
  
  /** Callback per click su impostazioni GDPR */
  onGDPRSettingsClick?: () => void;
  
  /** Classi CSS personalizzate */
  className?: string;
}

/**
 * Header della pagina con supporto GDPR
 * Replica la struttura della pagina Courses con titolo, sottotitolo e pulsanti
 */
export function GDPREntityHeader({
  title,
  subtitle,
  entityCount,
  selectedCount,
  showGDPRIndicators,
  breadcrumb,
  customActions,
  onAuditClick,
  onExportClick,
  onConsentClick,
  onGDPRSettingsClick,
  className
}: GDPREntityHeaderProps) {
  
  // Breadcrumb di default se non fornito
  const defaultBreadcrumb: BreadcrumbItem[] = [
    { label: 'Dashboard', href: '/dashboard' },
    { label: title, isActive: true }
  ];
  
  const activeBreadcrumb = breadcrumb || defaultBreadcrumb;
  
  return (
    <div className={`gdpr-entity-header space-y-4 ${className || ''}`}>
      {/* Breadcrumb */}
      <Breadcrumb>
        <BreadcrumbList>
          {activeBreadcrumb.map((item, index) => (
            <React.Fragment key={index}>
              <BreadcrumbItemComponent>
                {item.isActive ? (
                  <BreadcrumbPage className="flex items-center gap-2">
                    {item.icon && <span>{item.icon}</span>}
                    {item.label}
                  </BreadcrumbPage>
                ) : (
                  <BreadcrumbLink href={item.href} className="flex items-center gap-2">
                    {item.icon && <span>{item.icon}</span>}
                    {item.label}
                  </BreadcrumbLink>
                )}
              </BreadcrumbItemComponent>
              {index < activeBreadcrumb.length - 1 && <BreadcrumbSeparator />}
            </React.Fragment>
          ))}
        </BreadcrumbList>
      </Breadcrumb>
      
      {/* Header principale */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        {/* Sezione titolo e contatori */}
        <div className="space-y-2">
          {/* Titolo principale */}
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
            
            {/* Badge contatori */}
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-sm">
                {entityCount} {entityCount === 1 ? 'elemento' : 'elementi'}
              </Badge>
              
              {selectedCount > 0 && (
                <Badge variant="default" className="text-sm">
                  {selectedCount} selezionati
                </Badge>
              )}
            </div>
          </div>
          
          {/* Sottotitolo */}
          {subtitle && (
            <p className="text-lg text-muted-foreground">
              {subtitle}
            </p>
          )}
          
          {/* Indicatori GDPR */}
          {showGDPRIndicators && (
            <div className="flex items-center gap-2 mt-2">
              <Badge variant="outline" className="text-xs flex items-center gap-1">
                <Shield className="h-3 w-3" />
                GDPR Compliant
              </Badge>
              <Badge variant="secondary" className="text-xs">
                Audit Attivo
              </Badge>
              <Badge variant="default" className="text-xs">
                Consensi Gestiti
              </Badge>
            </div>
          )}
        </div>
        
        {/* Sezione azioni */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          {/* Azioni GDPR principali */}
          {showGDPRIndicators && (
            <div className="flex items-center gap-2">
              {/* Pulsante Audit */}
              {onAuditClick && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onAuditClick}
                  className="flex items-center gap-2"
                >
                  <FileText className="h-4 w-4" />
                  Audit Log
                </Button>
              )}
              
              {/* Pulsante Export */}
              {onExportClick && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onExportClick}
                  className="flex items-center gap-2"
                >
                  <Download className="h-4 w-4" />
                  Export Dati
                </Button>
              )}
              
              {/* Pulsante Consensi */}
              {onConsentClick && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onConsentClick}
                  className="flex items-center gap-2"
                >
                  <Shield className="h-4 w-4" />
                  Consensi
                </Button>
              )}
            </div>
          )}
          
          {/* Azioni personalizzate */}
          {customActions && customActions.length > 0 && (
            <div className="flex items-center gap-2">
              {customActions.slice(0, 3).map((action) => (
                <Button
                  key={action.id}
                  variant={action.variant || 'outline'}
                  size="sm"
                  onClick={action.onClick}
                  disabled={action.disabled}
                  title={action.tooltip}
                  className="flex items-center gap-2"
                >
                  {action.icon && <span>{action.icon}</span>}
                  {action.label}
                </Button>
              ))}
              
              {/* Menu overflow per azioni aggiuntive */}
              {customActions.length > 3 && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {customActions.slice(3).map((action) => (
                      <DropdownMenuItem
                        key={action.id}
                        onClick={action.onClick}
                        disabled={action.disabled}
                        className="flex items-center gap-2"
                      >
                        {action.icon && <span>{action.icon}</span>}
                        {action.label}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          )}
          
          {/* Pulsante impostazioni GDPR */}
          {showGDPRIndicators && onGDPRSettingsClick && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onGDPRSettingsClick}
              title="Impostazioni GDPR"
            >
              <Settings className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
      
      {/* Card informazioni GDPR (opzionale) */}
      {showGDPRIndicators && (
        <Card className="p-4 bg-muted/50">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="space-y-1">
              <h3 className="text-sm font-medium flex items-center gap-2">
                <Shield className="h-4 w-4 text-green-600" />
                Conformità GDPR Attiva
              </h3>
              <p className="text-xs text-muted-foreground">
                Tutti i dati sono gestiti in conformità al Regolamento Generale sulla Protezione dei Dati (GDPR).
                Le operazioni sono registrate e i consensi sono tracciati.
              </p>
            </div>
            
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-green-500 rounded-full" />
                <span>Audit Attivo</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-blue-500 rounded-full" />
                <span>Consensi OK</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-orange-500 rounded-full" />
                <span>Retention Gestita</span>
              </div>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}

export default GDPREntityHeader;