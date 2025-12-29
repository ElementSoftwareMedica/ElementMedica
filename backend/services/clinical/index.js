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

// Template & Dynamic forms services
export { default as TemplateCampoVisitaService } from './TemplateCampoVisitaService.js';

// Document management services
export { default as DocumentoClinicoService } from './DocumentoClinicoService.js';

// Invoice & billing services
export { default as FatturaSanitariaService, STATI_FATTURA, METODI_PAGAMENTO } from './FatturaSanitariaService.js';

// Location & facilities services
export { default as SedePoliambulatorioService } from './SedePoliambulatorioService.js';

// Maintenance & equipment services
export { default as ManutenzioneStrumentoService } from './ManutenzioneStrumentoService.js';
