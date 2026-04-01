/**
 * Clinical Services Index
 * Exports all clinical services for ElementMedica module
 * 
 * @module services/clinical
 */

// Core structure services
export { PoliambulatorioService } from './PoliambulatorioService.js';
export { AmbulatorioService } from './AmbulatorioService.js';
export { OrarioAmbulatorioService } from './OrarioAmbulatorioService.js';

// Catalog & pricing services
export { PrestazioneService } from './PrestazioneService.js';
export { StrumentoService } from './StrumentoService.js';
export { ListinoPrezzoService } from './ListinoPrezzoService.js';
export { ConvenzioneService } from './ConvenzioneService.js';
export { ScontoClinicoService } from './ScontoClinicoService.js';

// Advanced Tariff services (Progetto 44)
export { TariffarioService } from './TariffarioService.js';
export { OffertaBundleService } from './OffertaBundleService.js';
export { TariffarioMedicoService } from './TariffarioMedicoService.js';

// Scheduling & appointments services
export { SlotDisponibilitaService } from './SlotDisponibilitaService.js';
export { AppuntamentoService } from './AppuntamentoService.js';

// Clinical visit services
export { VisitaService } from './VisitaService.js';
export { RefertoService } from './RefertoService.js';

// Template & Dynamic forms services (Progetto 52)
// P65.7: TemplateCampoVisitaService RIMOSSO - consolidato in VisitTemplateService con scope=CATALOGO
export { VisitTemplateService } from './VisitTemplateService.js';

// Document management services
export { default as DocumentoClinicoService } from './DocumentoClinicoService.js';

// Location & facilities services
export { default as SedePoliambulatorioService } from './SedePoliambulatorioService.js';

// Maintenance & equipment services
export { default as ManutenzioneStrumentoService } from './ManutenzioneStrumentoService.js';
// Holidays & absences services (Progetto 54)
export { FerieAssenzaService } from './FerieAssenzaService.js';

// === PROGETTO 56: MEDICINA DEL LAVORO COMPLETO ===
export { default as MansioneService } from './MansioneService.js';
export { default as GiudizioIdoneitaService } from './GiudizioIdoneitaService.js';
export { default as RischioPrestazioneService, DEFAULT_RISCHIO_PRESTAZIONI } from './RischioPrestazioneService.js';