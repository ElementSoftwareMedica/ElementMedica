/**
 * Circuit Breaker Middleware
 * Implements circuit breaker pattern for service resilience
 */

import CircuitBreaker from 'opossum';
import { logger } from '../utils/logger.js';

// Circuit breaker instances storage
const circuitBreakers = new Map();

/**
 * Default circuit breaker options
 */
const defaultOptions = {
  timeout: parseInt(process.env.CIRCUIT_BREAKER_TIMEOUT) || 5000, // 5 seconds
  errorThresholdPercentage: parseInt(process.env.CIRCUIT_BREAKER_THRESHOLD) || 50, // 50%
  resetTimeout: parseInt(process.env.CIRCUIT_BREAKER_RESET_TIMEOUT) || 30000, // 30 seconds
  rollingCountTimeout: 10000, // 10 seconds
  rollingCountBuckets: 10,
  name: 'defaultCircuitBreaker',
  group: 'default'
};

/**
 * Create or get circuit breaker for a service
 */
function getCircuitBreaker(serviceName, action, options = {}) {
  const key = `${serviceName}-${action.name || 'anonymous'}`;
  
  if (circuitBreakers.has(key)) {
    return circuitBreakers.get(key);
  }
  
  const circuitBreakerOptions = {
    ...defaultOptions,
    ...options,
    name: key,
    group: serviceName
  };
  
  const breaker = new CircuitBreaker(action, circuitBreakerOptions);
  
  // Event listeners for monitoring
  breaker.on('open', () => {
    logger.warn('Circuit breaker opened', {
      service: serviceName,
      action: action.name,
      key
    });
  });
  
  breaker.on('halfOpen', () => {
    logger.info('Circuit breaker half-open', {
      service: serviceName,
      action: action.name,
      key
    });
  });
  
  breaker.on('close', () => {
    logger.info('Circuit breaker closed', {
      service: serviceName,
      action: action.name,
      key
    });
  });
  
  breaker.on('failure', (error) => {
    logger.error('Circuit breaker failure', {
      service: serviceName,
      action: action.name,
      error: error.message,
      key
    });
  });
  
  breaker.on('success', (result) => {
    logger.debug('Circuit breaker success', {
      service: serviceName,
      action: action.name,
      key
    });
  });
  
  breaker.on('timeout', () => {
    logger.warn('Circuit breaker timeout', {
      service: serviceName,
      action: action.name,
      timeout: circuitBreakerOptions.timeout,
      key
    });
  });
  
  circuitBreakers.set(key, breaker);
  return breaker;
}

/**
 * HTTP request circuit breaker
 */
function httpCircuitBreaker(serviceName, options = {}) {
  return async (req, res, next) => {
    const action = async () => {
      return new Promise((resolve, reject) => {
        // Store original methods
        const originalSend = res.send;
        const originalJson = res.json;
        const originalStatus = res.status;
        
        let statusCode = 200;
        let responseData = null;
        
        // Override status method
        res.status = function(code) {
          statusCode = code;
          return originalStatus.call(this, code);
        };
        
        // Override send method
        res.send = function(data) {
          responseData = data;
          
          if (statusCode >= 500) {
            reject(new Error(`HTTP ${statusCode}: ${data}`));
          } else {
            resolve({ statusCode, data });
          }
          
          return originalSend.call(this, data);
        };
        
        // Override json method
        res.json = function(data) {
          responseData = data;
          
          if (statusCode >= 500) {
            reject(new Error(`HTTP ${statusCode}: ${JSON.stringify(data)}`));
          } else {
            resolve({ statusCode, data });
          }
          
          return originalJson.call(this, data);
        };
        
        // Continue to next middleware
        next();
      });
    };
    
    const breaker = getCircuitBreaker(serviceName, action, options);
    
    try {
      await breaker.fire();
    } catch (error) {
      if (breaker.opened) {
        logger.error('Circuit breaker is open', {
          service: serviceName,
          path: req.path,
          method: req.method
        });
        
        return res.status(503).json({
          error: 'Service temporarily unavailable',
          message: `${serviceName} is currently experiencing issues. Please try again later.`,
          service: serviceName,
          retry_after: Math.ceil(breaker.options.resetTimeout / 1000)
        });
      }
      
      logger.error('Circuit breaker error', {
        service: serviceName,
        error: error.message,
        path: req.path,
        method: req.method
      });
      
      return res.status(500).json({
        error: 'Internal server error',
        message: 'An error occurred while processing your request'
      });
    }
  };
}

/**
 * Service call circuit breaker
 */
function serviceCircuitBreaker(serviceName, serviceCall, options = {}) {
  const breaker = getCircuitBreaker(serviceName, serviceCall, options);
  
  return async (...args) => {
    try {
      return await breaker.fire(...args);
    } catch (error) {
      if (breaker.opened) {
        throw new Error(`Service ${serviceName} is currently unavailable (circuit breaker open)`);
      }
      throw error;
    }
  };
}

/**
 * Get circuit breaker stats
 */
function getCircuitBreakerStats(serviceName = null) {
  const stats = {};
  
  for (const [key, breaker] of circuitBreakers.entries()) {
    if (!serviceName || key.startsWith(serviceName)) {
      stats[key] = {
        name: breaker.name,
        group: breaker.group,
        state: breaker.opened ? 'open' : breaker.halfOpen ? 'half-open' : 'closed',
        stats: breaker.stats,
        options: {
          timeout: breaker.options.timeout,
          errorThresholdPercentage: breaker.options.errorThresholdPercentage,
          resetTimeout: breaker.options.resetTimeout
        }
      };
    }
  }
  
  return stats;
}

/**
 * Reset circuit breaker
 */
function resetCircuitBreaker(serviceName, actionName = null) {
  if (actionName) {
    const key = `${serviceName}-${actionName}`;
    const breaker = circuitBreakers.get(key);
    if (breaker) {
      breaker.close();
      logger.info('Circuit breaker manually reset', { key });
      return true;
    }
    return false;
  }
  
  // Reset all circuit breakers for service
  let resetCount = 0;
  for (const [key, breaker] of circuitBreakers.entries()) {
    if (key.startsWith(serviceName)) {
      breaker.close();
      resetCount++;
    }
  }
  
  logger.info('Circuit breakers manually reset', { 
    service: serviceName, 
    count: resetCount 
  });
  
  return resetCount > 0;
}

/**
 * Health check for circuit breakers
 */
function getCircuitBreakerHealth() {
  const health = {
    status: 'healthy',
    circuit_breakers: {},
    summary: {
      total: 0,
      open: 0,
      half_open: 0,
      closed: 0
    }
  };
  
  for (const [key, breaker] of circuitBreakers.entries()) {
    const state = breaker.opened ? 'open' : breaker.halfOpen ? 'half-open' : 'closed';
    
    health.circuit_breakers[key] = {
      state,
      stats: breaker.stats
    };
    
    health.summary.total++;
    health.summary[state.replace('-', '_')]++;
  }
  
  // Set overall status
  if (health.summary.open > 0) {
    health.status = 'degraded';
  }
  
  return health;
}

export {
  httpCircuitBreaker,
  serviceCircuitBreaker,
  getCircuitBreaker,
  getCircuitBreakerStats,
  resetCircuitBreaker,
  getCircuitBreakerHealth
};