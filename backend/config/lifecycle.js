/**
 * Service Lifecycle Manager
 * Gestione centralizzata del ciclo di vita dei servizi (inizializzazione e shutdown)
 */

import { logger } from '../utils/logger.js';
import { EventEmitter } from 'events';

/**
 * Stati del lifecycle
 */
export const LIFECYCLE_STATES = {
  IDLE: 'idle',
  INITIALIZING: 'initializing',
  RUNNING: 'running',
  SHUTTING_DOWN: 'shutting_down',
  STOPPED: 'stopped',
  ERROR: 'error'
};

/**
 * Priorità di inizializzazione/shutdown
 */
export const PRIORITY = {
  CRITICAL: 1,    // Database, Redis
  HIGH: 2,        // Auth, Security
  MEDIUM: 3,      // API Services
  LOW: 4,         // Monitoring, Logging
  CLEANUP: 5      // Temporary files, caches
};

/**
 * Classe per gestire il lifecycle dei servizi
 */
export class ServiceLifecycleManager extends EventEmitter {
  constructor(options = {}) {
    super();
    
    this.services = new Map();
    this.state = LIFECYCLE_STATES.IDLE;
    this.startTime = null;
    this.shutdownTimeout = options.shutdownTimeout || 30000; // 30 secondi
    this.initializationTimeout = options.initializationTimeout || 60000; // 60 secondi
    this.gracefulShutdown = options.gracefulShutdown !== false;
    
    // Bind dei metodi per i signal handlers
    this.handleShutdown = this.handleShutdown.bind(this);
    this.handleForceShutdown = this.handleForceShutdown.bind(this);
    
    // Setup signal handlers
    this.setupSignalHandlers();
    
    logger.info('Service Lifecycle Manager initialized', {
      service: 'lifecycle',
      shutdownTimeout: this.shutdownTimeout,
      initializationTimeout: this.initializationTimeout,
      gracefulShutdown: this.gracefulShutdown
    });
  }
  
  /**
   * Registra un servizio
   */
  registerService(name, service) {
    if (this.services.has(name)) {
      throw new Error(`Service '${name}' is already registered`);
    }
    
    const serviceConfig = {
      name,
      service,
      priority: service.priority || PRIORITY.MEDIUM,
      state: LIFECYCLE_STATES.IDLE,
      dependencies: service.dependencies || [],
      healthCheck: service.healthCheck || null,
      timeout: service.timeout || 10000,
      retries: service.retries || 3,
      currentRetry: 0,
      startTime: null,
      error: null
    };
    
    // Validazione del servizio
    this.validateService(serviceConfig);
    
    this.services.set(name, serviceConfig);
    
    logger.info('Service registered', {
      service: 'lifecycle',
      serviceName: name,
      priority: serviceConfig.priority,
      dependencies: serviceConfig.dependencies
    });
    
    this.emit('serviceRegistered', { name, service: serviceConfig });
    
    return this;
  }
  
  /**
   * Valida la configurazione del servizio
   */
  validateService(serviceConfig) {
    const { service } = serviceConfig;
    
    if (!service.initialize || typeof service.initialize !== 'function') {
      throw new Error(`Service '${serviceConfig.name}' must have an 'initialize' method`);
    }
    
    if (!service.shutdown || typeof service.shutdown !== 'function') {
      throw new Error(`Service '${serviceConfig.name}' must have a 'shutdown' method`);
    }
    
    if (service.healthCheck && typeof service.healthCheck !== 'function') {
      throw new Error(`Service '${serviceConfig.name}' healthCheck must be a function`);
    }
  }
  
  /**
   * Inizializza tutti i servizi
   */
  async initializeServices() {
    if (this.state !== LIFECYCLE_STATES.IDLE) {
      throw new Error(`Cannot initialize services in state: ${this.state}`);
    }
    
    this.state = LIFECYCLE_STATES.INITIALIZING;
    this.startTime = Date.now();
    
    console.log('DEBUG: Lifecycle manager - services registered:', this.services.size);
    console.log('DEBUG: Lifecycle manager - service names:', Array.from(this.services.keys()));
    
    logger.info('Starting service initialization', {
      service: 'lifecycle',
      totalServices: this.services.size
    });
    
    this.emit('initializationStarted');
    
    try {
      // Ordina i servizi per priorità e dipendenze
      const sortedServices = this.sortServicesByPriority();
      
      // Inizializza i servizi in ordine
      for (const serviceName of sortedServices) {
        await this.initializeService(serviceName);
      }
      
      this.state = LIFECYCLE_STATES.RUNNING;
      const duration = Date.now() - this.startTime;
      
      logger.info('All services initialized successfully', {
        service: 'lifecycle',
        duration,
        totalServices: this.services.size
      });
      
      this.emit('initializationCompleted', { duration });
      
    } catch (error) {
      this.state = LIFECYCLE_STATES.ERROR;
      
      logger.error('Service initialization failed', {
        service: 'lifecycle',
        error: error.message,
        stack: error.stack
      });
      
      this.emit('initializationFailed', { error });
      
      // Cleanup dei servizi già inizializzati
      await this.shutdownServices();
      
      throw error;
    }
  }
  
  /**
   * Inizializza un singolo servizio
   */
  async initializeService(serviceName) {
    const serviceConfig = this.services.get(serviceName);
    
    if (!serviceConfig) {
      throw new Error(`Service '${serviceName}' not found`);
    }
    
    if (serviceConfig.state === LIFECYCLE_STATES.RUNNING) {
      return; // Già inizializzato
    }
    
    // Verifica dipendenze
    await this.checkDependencies(serviceName);
    
    serviceConfig.state = LIFECYCLE_STATES.INITIALIZING;
    serviceConfig.startTime = Date.now();
    serviceConfig.currentRetry = 0;
    
    logger.info('Initializing service', {
      service: 'lifecycle',
      serviceName,
      priority: serviceConfig.priority
    });
    
    this.emit('serviceInitializing', { name: serviceName, service: serviceConfig });
    
    while (serviceConfig.currentRetry < serviceConfig.retries) {
      try {
        // Timeout per l'inizializzazione
        await Promise.race([
          serviceConfig.service.initialize(),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Initialization timeout')), serviceConfig.timeout)
          )
        ]);
        
        serviceConfig.state = LIFECYCLE_STATES.RUNNING;
        serviceConfig.error = null;
        
        const duration = Date.now() - serviceConfig.startTime;
        
        logger.info('Service initialized successfully', {
          service: 'lifecycle',
          serviceName,
          duration,
          retries: serviceConfig.currentRetry
        });
        
        this.emit('serviceInitialized', { name: serviceName, service: serviceConfig, duration });
        
        return;
        
      } catch (error) {
        serviceConfig.currentRetry++;
        serviceConfig.error = error;
        
        logger.warn('Service initialization attempt failed', {
          service: 'lifecycle',
          serviceName,
          attempt: serviceConfig.currentRetry,
          maxRetries: serviceConfig.retries,
          error: error.message
        });
        
        if (serviceConfig.currentRetry >= serviceConfig.retries) {
          serviceConfig.state = LIFECYCLE_STATES.ERROR;
          
          logger.error('Service initialization failed after all retries', {
            service: 'lifecycle',
            serviceName,
            retries: serviceConfig.retries,
            error: error.message
          });
          
          this.emit('serviceInitializationFailed', { name: serviceName, service: serviceConfig, error });
          
          throw new Error(`Failed to initialize service '${serviceName}': ${error.message}`);
        }
        
        // Attesa prima del retry
        await new Promise(resolve => setTimeout(resolve, 1000 * serviceConfig.currentRetry));
      }
    }
  }
  
  /**
   * Verifica le dipendenze di un servizio
   */
  async checkDependencies(serviceName) {
    const serviceConfig = this.services.get(serviceName);
    
    for (const dependency of serviceConfig.dependencies) {
      const depService = this.services.get(dependency);
      
      if (!depService) {
        throw new Error(`Dependency '${dependency}' for service '${serviceName}' not found`);
      }
      
      if (depService.state !== LIFECYCLE_STATES.RUNNING) {
        // Inizializza la dipendenza se necessario
        await this.initializeService(dependency);
      }
    }
  }
  
  /**
   * Ordina i servizi per priorità e dipendenze
   */
  sortServicesByPriority() {
    const services = Array.from(this.services.entries());
    const sorted = [];
    const visited = new Set();
    const visiting = new Set();
    
    const visit = (serviceName) => {
      if (visited.has(serviceName)) return;
      if (visiting.has(serviceName)) {
        throw new Error(`Circular dependency detected involving service '${serviceName}'`);
      }
      
      visiting.add(serviceName);
      
      const serviceConfig = this.services.get(serviceName);
      
      // Visita le dipendenze prima
      for (const dependency of serviceConfig.dependencies) {
        visit(dependency);
      }
      
      visiting.delete(serviceName);
      visited.add(serviceName);
      sorted.push(serviceName);
    };
    
    // Ordina per priorità
    services.sort(([, a], [, b]) => a.priority - b.priority);
    
    // Visita tutti i servizi
    for (const [serviceName] of services) {
      visit(serviceName);
    }
    
    return sorted;
  }
  
  /**
   * Shutdown di tutti i servizi
   */
  async shutdownServices() {
    if (this.state === LIFECYCLE_STATES.STOPPED || this.state === LIFECYCLE_STATES.SHUTTING_DOWN) {
      return;
    }
    
    this.state = LIFECYCLE_STATES.SHUTTING_DOWN;
    
    logger.info('Starting service shutdown', {
      service: 'lifecycle',
      totalServices: this.services.size
    });
    
    this.emit('shutdownStarted');
    
    try {
      // Ordina i servizi per priorità inversa
      const sortedServices = this.sortServicesByPriority().reverse();
      
      // Shutdown parallelo con timeout
      const shutdownPromises = sortedServices.map(serviceName => 
        this.shutdownService(serviceName)
      );
      
      if (this.gracefulShutdown) {
        await Promise.race([
          Promise.all(shutdownPromises),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Shutdown timeout')), this.shutdownTimeout)
          )
        ]);
      } else {
        await Promise.all(shutdownPromises);
      }
      
      this.state = LIFECYCLE_STATES.STOPPED;
      
      logger.info('All services shut down successfully', {
        service: 'lifecycle'
      });
      
      this.emit('shutdownCompleted');
      
    } catch (error) {
      logger.error('Service shutdown failed', {
        service: 'lifecycle',
        error: error.message
      });
      
      this.emit('shutdownFailed', { error });
      
      // Force shutdown se graceful fallisce
      if (this.gracefulShutdown) {
        logger.warn('Forcing immediate shutdown', { service: 'lifecycle' });
        process.exit(1);
      }
    }
  }
  
  /**
   * Shutdown di un singolo servizio
   */
  async shutdownService(serviceName) {
    const serviceConfig = this.services.get(serviceName);
    
    if (!serviceConfig || serviceConfig.state !== LIFECYCLE_STATES.RUNNING) {
      return;
    }
    
    serviceConfig.state = LIFECYCLE_STATES.SHUTTING_DOWN;
    
    logger.info('Shutting down service', {
      service: 'lifecycle',
      serviceName
    });
    
    this.emit('serviceShuttingDown', { name: serviceName, service: serviceConfig });
    
    try {
      await Promise.race([
        serviceConfig.service.shutdown(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Service shutdown timeout')), 5000)
        )
      ]);
      
      serviceConfig.state = LIFECYCLE_STATES.STOPPED;
      
      logger.info('Service shut down successfully', {
        service: 'lifecycle',
        serviceName
      });
      
      this.emit('serviceShutDown', { name: serviceName, service: serviceConfig });
      
    } catch (error) {
      serviceConfig.state = LIFECYCLE_STATES.ERROR;
      serviceConfig.error = error;
      
      logger.error('Service shutdown failed', {
        service: 'lifecycle',
        serviceName,
        error: error.message
      });
      
      this.emit('serviceShutdownFailed', { name: serviceName, service: serviceConfig, error });
    }
  }
  
  /**
   * Health check di tutti i servizi
   */
  async healthCheck() {
    const results = {};
    
    for (const [serviceName, serviceConfig] of this.services) {
      try {
        if (serviceConfig.healthCheck && serviceConfig.state === LIFECYCLE_STATES.RUNNING) {
          const health = await Promise.race([
            serviceConfig.healthCheck(),
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Health check timeout')), 5000)
            )
          ]);
          
          results[serviceName] = {
            status: 'healthy',
            ...health
          };
        } else {
          results[serviceName] = {
            status: serviceConfig.state === LIFECYCLE_STATES.RUNNING ? 'healthy' : 'unhealthy',
            state: serviceConfig.state
          };
        }
      } catch (error) {
        results[serviceName] = {
          status: 'unhealthy',
          error: error.message,
          state: serviceConfig.state
        };
      }
    }
    
    return results;
  }
  
  /**
   * Setup signal handlers
   */
  setupSignalHandlers() {
    if (process.env.NODE_ENV === 'production') {
      process.on('SIGTERM', this.handleShutdown);
      process.on('SIGINT', this.handleShutdown);
      process.on('SIGUSR2', this.handleForceShutdown); // Per debugging
    }
    
    process.on('uncaughtException', (error) => {
      logger.error('Uncaught exception', {
        service: 'lifecycle',
        error: error.message,
        stack: error.stack
      });
      
      console.error('DETAILED UNCAUGHT EXCEPTION:', {
        message: error.message,
        stack: error.stack,
        name: error.name,
        code: error.code,
        errno: error.errno,
        syscall: error.syscall,
        address: error.address,
        port: error.port
      });
      
      this.handleForceShutdown();
    });
    
    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled rejection', {
        service: 'lifecycle',
        reason: reason?.message || reason,
        promise: promise.toString()
      });
    });
  }
  
  /**
   * Handler per shutdown graceful
   */
  async handleShutdown(signal) {
    logger.info('Received shutdown signal', {
      service: 'lifecycle',
      signal
    });
    
    try {
      await this.shutdownServices();
      process.exit(0);
    } catch (error) {
      logger.error('Graceful shutdown failed', {
        service: 'lifecycle',
        error: error.message
      });
      process.exit(1);
    }
  }
  
  /**
   * Handler per shutdown forzato
   */
  handleForceShutdown() {
    logger.warn('Force shutdown initiated', {
      service: 'lifecycle'
    });
    
    process.exit(1);
  }
  
  /**
   * Ottieni stato del lifecycle
   */
  getState() {
    return {
      state: this.state,
      startTime: this.startTime,
      services: Array.from(this.services.entries()).map(([name, config]) => ({
        name,
        state: config.state,
        priority: config.priority,
        dependencies: config.dependencies,
        error: config.error?.message
      }))
    };
  }
}

/**
 * Istanza singleton del lifecycle manager
 */
export const lifecycleManager = new ServiceLifecycleManager();

/**
 * Factory per creare servizi compatibili
 */
export const createService = (name, options = {}) => {
  return {
    name,
    priority: options.priority || PRIORITY.MEDIUM,
    dependencies: options.dependencies || [],
    timeout: options.timeout || 10000,
    retries: options.retries || 3,
    
    initialize: options.initialize || (() => Promise.resolve()),
    shutdown: options.shutdown || (() => Promise.resolve()),
    healthCheck: options.healthCheck || null
  };
};

export default {
  ServiceLifecycleManager,
  lifecycleManager,
  createService,
  LIFECYCLE_STATES,
  PRIORITY
};