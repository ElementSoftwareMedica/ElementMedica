import axios from 'axios';
import { logger } from './logger.js';

class LoadBalancer {
  constructor() {
    this.servers = new Map();
    this.healthCheckInterval = 30000; // 30 seconds
    this.requestTimeout = 5000; // 5 seconds
    this.healthCheckTimer = null;
  }

  // Register a server with its configuration
  registerServer(name, config) {
    this.servers.set(name, {
      ...config,
      healthy: true,
      lastHealthCheck: Date.now(),
      requestCount: 0,
      responseTime: 0,
      errors: 0,
      weight: config.weight || 1
    });
    
    logger.info('Server registered in load balancer', {
      service: 'load-balancer',
      server: name,
      url: config.url
    });
  }

  // Start health checks for all registered servers
  startHealthChecks() {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
    }

    this.healthCheckTimer = setInterval(async () => {
      await this.performHealthChecks();
    }, this.healthCheckInterval);

    logger.info('Load balancer health checks started', {
      service: 'load-balancer',
      interval: this.healthCheckInterval
    });
  }

  // Stop health checks
  stopHealthChecks() {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = null;
    }
  }

  // Perform health checks on all servers
  async performHealthChecks() {
    const healthCheckPromises = Array.from(this.servers.entries()).map(
      async ([name, server]) => {
        try {
          const startTime = Date.now();
          const response = await axios.get(`${server.url}/health`, {
            timeout: this.requestTimeout
          });
          
          const responseTime = Date.now() - startTime;
          
          if (response.status === 200) {
            this.updateServerHealth(name, true, responseTime);
          } else {
            this.updateServerHealth(name, false, responseTime);
          }
        } catch (error) {
          this.updateServerHealth(name, false, null, error.message);
        }
      }
    );

    await Promise.allSettled(healthCheckPromises);
  }

  // Update server health status
  updateServerHealth(name, healthy, responseTime = null, error = null) {
    const server = this.servers.get(name);
    if (!server) return;

    const wasHealthy = server.healthy;
    server.healthy = healthy;
    server.lastHealthCheck = Date.now();
    
    if (responseTime !== null) {
      // Calculate moving average of response time
      server.responseTime = server.responseTime === 0 
        ? responseTime 
        : (server.responseTime * 0.7) + (responseTime * 0.3);
    }

    if (!healthy) {
      server.errors++;
      if (wasHealthy) {
        logger.warn('Server marked as unhealthy', {
          service: 'load-balancer',
          server: name,
          error: error || 'Health check failed'
        });
      }
    } else if (!wasHealthy) {
      logger.info('Server recovered and marked as healthy', {
        service: 'load-balancer',
        server: name
      });
    }
  }

  // Get the best server using weighted round-robin with health consideration
  getNextServer(serviceName) {
    const availableServers = Array.from(this.servers.entries())
      .filter(([name, server]) => {
        return name.startsWith(serviceName) && server.healthy;
      });

    if (availableServers.length === 0) {
      // Fallback to any server of the service, even if unhealthy
      const fallbackServers = Array.from(this.servers.entries())
        .filter(([name]) => name.startsWith(serviceName));
      
      if (fallbackServers.length === 0) {
        throw new Error(`No servers available for service: ${serviceName}`);
      }
      
      logger.warn('Using unhealthy server as fallback', {
        service: 'load-balancer',
        serviceName,
        server: fallbackServers[0][0]
      });
      
      return fallbackServers[0][1];
    }

    // Weighted selection based on inverse response time and weight
    let bestServer = null;
    let bestScore = -1;

    for (const [name, server] of availableServers) {
      // Score based on weight and inverse response time
      const responseTimeFactor = server.responseTime > 0 ? 1000 / server.responseTime : 1;
      const score = server.weight * responseTimeFactor * (1 - (server.errors / 100));
      
      if (score > bestScore) {
        bestScore = score;
        bestServer = server;
      }
    }

    if (bestServer) {
      bestServer.requestCount++;
    }

    return bestServer;
  }

  // Get server statistics
  getStats() {
    const stats = {};
    
    for (const [name, server] of this.servers.entries()) {
      stats[name] = {
        healthy: server.healthy,
        requestCount: server.requestCount,
        responseTime: Math.round(server.responseTime),
        errors: server.errors,
        lastHealthCheck: new Date(server.lastHealthCheck).toISOString(),
        weight: server.weight
      };
    }
    
    return stats;
  }

  // Reset statistics
  resetStats() {
    for (const server of this.servers.values()) {
      server.requestCount = 0;
      server.errors = 0;
      server.responseTime = 0;
    }
    
    logger.info('Load balancer statistics reset', {
      service: 'load-balancer'
    });
  }
}

// Create singleton instance
const loadBalancer = new LoadBalancer();

export default loadBalancer;