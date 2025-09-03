/**
 * Servizio di throttling per gestire le richieste API
 * Previene ERR_INSUFFICIENT_RESOURCES limitando le richieste simultanee
 */

interface PendingRequest {
  url: string;
  resolve: () => Promise<void>;
  reject: (error: unknown) => void;
  timestamp: number;
  priority: number;
}

class RequestThrottler {
  private maxConcurrentRequests = 3; // Massimo 3 richieste simultanee
  private activeRequests = new Set<string>();
  private pendingQueue: PendingRequest[] = [];
  private requestCounts = new Map<string, number>();
  private lastRequestTime = new Map<string, number>();
  private readonly minInterval = 100; // Minimo 100ms tra richieste dello stesso tipo

  /**
   * Aggiunge una richiesta alla coda con throttling
   */
  async throttleRequest<T>(
    url: string, 
    requestFn: () => Promise<T>,
    priority: number = 1
  ): Promise<T> {
    const requestKey = this.getRequestKey(url);
    
    // Le richieste di autenticazione hanno priorità massima e non vengono mai throttled
    if (requestKey.startsWith('auth-')) {
      console.log(`🔐 RequestThrottler: Auth request detected for ${url}, executing immediately`);
      return this.executeRequest(url, requestFn);
    }
    
    // Le richieste di permessi e ruoli sono critiche e non devono essere throttled
    if (requestKey.startsWith('roles-') || requestKey.startsWith('permissions-') || requestKey.includes('permissions')) {
      console.log(`🔑 RequestThrottler: Critical permissions request detected for ${url}, executing immediately`);
      return this.executeRequest(url, requestFn);
    }
    
    // Controlla se c'è già una richiesta identica in corso
    if (this.activeRequests.has(requestKey)) {
      console.log(`🔄 RequestThrottler: Duplicate request detected for ${url}, waiting...`);
      await this.waitForRequest(requestKey);
    }

    // Controlla rate limiting per tipo di richiesta
    if (this.shouldThrottle(requestKey)) {
      console.log(`⏳ RequestThrottler: Rate limiting ${url}, queuing...`);
      return this.queueRequest(url, requestFn, priority);
    }

    return this.executeRequest(url, requestFn);
  }

  /**
   * Esegue una richiesta immediatamente
   */
  private async executeRequest<T>(url: string, requestFn: () => Promise<T>): Promise<T> {
    const requestKey = this.getRequestKey(url);
    
    try {
      this.activeRequests.add(requestKey);
      this.updateRequestStats(requestKey);
      
      console.log(`🚀 RequestThrottler: Executing ${url} (active: ${this.activeRequests.size})`);
      
      const result = await requestFn();
      
      console.log(`✅ RequestThrottler: Completed ${url}`);
      return result;
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error(`❌ RequestThrottler: Failed ${url}:`, msg);
      
      // Se è un errore di risorse insufficienti, aumenta il throttling
      if (this.isErrnoException(error) && error.code === 'ERR_INSUFFICIENT_RESOURCES') {
        this.handleResourceError();
      }
      
      throw error;
    } finally {
      this.activeRequests.delete(requestKey);
      this.processQueue();
    }
  }

  /**
   * Aggiunge una richiesta alla coda
   */
  private queueRequest<T>(
    url: string, 
    requestFn: () => Promise<T>,
    priority: number
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      const request: PendingRequest = {
        url,
        resolve: async () => {
          try {
            const result = await this.executeRequest(url, requestFn);
            resolve(result);
          } catch (error) {
            reject(error);
          }
        },
        reject,
        timestamp: Date.now(),
        priority
      };

      // Inserisce nella coda ordinata per priorità
      const insertIndex = this.pendingQueue.findIndex(r => r.priority < priority);
      if (insertIndex === -1) {
        this.pendingQueue.push(request);
      } else {
        this.pendingQueue.splice(insertIndex, 0, request);
      }

      console.log(`📋 RequestThrottler: Queued ${url} (queue size: ${this.pendingQueue.length})`);
    });
  }

  /**
   * Processa la coda delle richieste in attesa
   */
  private processQueue(): void {
    if (this.pendingQueue.length === 0) return;
    if (this.activeRequests.size >= this.maxConcurrentRequests) return;

    const nextRequest = this.pendingQueue.shift();
    if (nextRequest) {
      // Controlla se la richiesta non è scaduta (timeout di 30 secondi)
      if (Date.now() - nextRequest.timestamp > 30000) {
        nextRequest.reject(new Error('Request timeout'));
        this.processQueue();
        return;
      }

      const requestKey = this.getRequestKey(nextRequest.url);
      if (!this.shouldThrottle(requestKey)) {
        // CORREZIONE CRITICA: Esegui la richiesta chiamando la funzione resolve asincrona
        setTimeout(async () => {
          await nextRequest.resolve();
        }, 0);
      } else {
        // Rimette in coda se ancora throttled
        this.pendingQueue.unshift(nextRequest);
        setTimeout(() => this.processQueue(), this.minInterval);
      }
    }
  }

  /**
   * Determina se una richiesta deve essere throttled
   */
  private shouldThrottle(requestKey: string): boolean {
    // Le richieste di autenticazione non devono mai essere throttled
    if (requestKey.startsWith('auth-')) {
      return false;
    }
    
    // Le richieste di permessi e ruoli non devono mai essere throttled
    if (requestKey.startsWith('roles-') || requestKey.startsWith('permissions-') || requestKey.includes('permissions')) {
      return false;
    }
    
    // Le richieste di dettaglio entità (courses, persons, companies) hanno throttling ridotto
    if (requestKey.endsWith('-detail')) {
      const lastTime = this.lastRequestTime.get(requestKey) || 0;
      const timeSinceLastRequest = Date.now() - lastTime;
      return timeSinceLastRequest < 50; // Throttling ridotto a 50ms per dettagli
    }
    
    const lastTime = this.lastRequestTime.get(requestKey) || 0;
    const timeSinceLastRequest = Date.now() - lastTime;
    
    return timeSinceLastRequest < this.minInterval;
  }

  /**
   * Aggiorna le statistiche delle richieste
   */
  private updateRequestStats(requestKey: string): void {
    this.lastRequestTime.set(requestKey, Date.now());
    const count = this.requestCounts.get(requestKey) || 0;
    this.requestCounts.set(requestKey, count + 1);
  }

  /**
   * Gestisce errori di risorse insufficienti
   */
  private isErrnoException(e: unknown): e is NodeJS.ErrnoException {
    return typeof e === 'object' && e !== null && 'code' in e;
  }
  private handleResourceError(): void {
    // Riduce temporaneamente il numero di richieste simultanee
    this.maxConcurrentRequests = Math.max(1, this.maxConcurrentRequests - 1);
    
    console.warn(`⚠️ RequestThrottler: Resource error, reducing concurrent requests to ${this.maxConcurrentRequests}`);
    
    // Ripristina dopo 10 secondi
    setTimeout(() => {
      this.maxConcurrentRequests = Math.min(3, this.maxConcurrentRequests + 1);
      console.log(`🔄 RequestThrottler: Restored concurrent requests to ${this.maxConcurrentRequests}`);
    }, 10000);
  }

  /**
   * Aspetta che una richiesta specifica sia completata
   */
  private async waitForRequest(requestKey: string): Promise<void> {
    return new Promise((resolve) => {
      const checkInterval = setInterval(() => {
        if (!this.activeRequests.has(requestKey)) {
          clearInterval(checkInterval);
          resolve();
        }
      }, 50);
      
      // Timeout dopo 5 secondi
      setTimeout(() => {
        clearInterval(checkInterval);
        resolve();
      }, 5000);
    });
  }

  /**
   * Genera una chiave per identificare il tipo di richiesta
   */
  private getRequestKey(url: string): string {
    // Normalizza l'URL per raggruppare richieste simili
    const cleanUrl = url.split('?')[0]; // Rimuove query parameters
    
    // Raggruppa per tipo di endpoint
    // PRIORITÀ ALTA: Richieste di autenticazione (non devono essere throttled)
    if (cleanUrl.includes('/auth/login')) return 'auth-login';
    if (cleanUrl.includes('/auth/logout')) return 'auth-logout';
    if (cleanUrl.includes('/auth/refresh')) return 'auth-refresh';
    if (cleanUrl.includes('/auth/verify')) return 'auth-verify';
    if (cleanUrl.includes('/auth/')) return 'auth-other';
    
    // PRIORITÀ ALTA: Richieste di permessi e ruoli (critiche per il funzionamento)
    if (cleanUrl.includes('/roles/') && cleanUrl.includes('/permissions')) return 'permissions-role-specific';
    if (cleanUrl.includes('/advanced-permissions')) return 'permissions-advanced';
    if (cleanUrl.includes('/permissions')) return 'permissions-general';
    if (cleanUrl.includes('/roles/hierarchy')) return 'roles-hierarchy';
    if (cleanUrl.includes('/roles')) return 'roles-general';
    
    // Altri endpoint
    if (cleanUrl.includes('/tenants')) return 'tenants';
    if (cleanUrl.includes('/users')) return 'users';
    if (cleanUrl.includes('/courses/')) return 'courses-detail';
    if (cleanUrl.includes('/courses')) return 'courses-general';
    if (cleanUrl.includes('/persons/')) return 'persons-detail';
    if (cleanUrl.includes('/persons')) return 'persons-general';
    if (cleanUrl.includes('/companies/')) return 'companies-detail';
    if (cleanUrl.includes('/companies')) return 'companies-general';
    
    return cleanUrl;
  }

  /**
   * Ottiene statistiche del throttler
   */
  getStats() {
    return {
      activeRequests: this.activeRequests.size,
      queuedRequests: this.pendingQueue.length,
      maxConcurrentRequests: this.maxConcurrentRequests,
      requestCounts: Object.fromEntries(this.requestCounts),
      lastRequestTimes: Object.fromEntries(this.lastRequestTime)
    };
  }

  /**
   * Resetta il throttler
   */
  reset(): void {
    this.activeRequests.clear();
    this.pendingQueue.length = 0;
    this.requestCounts.clear();
    this.lastRequestTime.clear();
    this.maxConcurrentRequests = 3;
    console.log('🔄 RequestThrottler: Reset completed');
  }
}

// Istanza singleton
export const requestThrottler = new RequestThrottler();

/**
 * Wrapper per le chiamate API con throttling automatico
 */
export async function throttledApiCall<T>(
  url: string,
  requestFn: () => Promise<T>,
  priority: number = 1
): Promise<T> {
  return requestThrottler.throttleRequest(url, requestFn, priority);
}

export default requestThrottler;