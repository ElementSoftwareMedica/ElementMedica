/**
 * AppError Utility - Week 12 Multi-Tenant Implementation
 * Classe per la gestione centralizzata degli errori dell'applicazione
 */

/**
 * Tipi di errore dell'applicazione
 */
export enum ErrorType {
  // Errori di autenticazione
  AUTHENTICATION_FAILED = 'AUTHENTICATION_FAILED',
  INVALID_TOKEN = 'INVALID_TOKEN',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  UNAUTHORIZED = 'UNAUTHORIZED',
  
  // Errori di autorizzazione
  FORBIDDEN = 'FORBIDDEN',
  INSUFFICIENT_PERMISSIONS = 'INSUFFICIENT_PERMISSIONS',
  ROLE_NOT_FOUND = 'ROLE_NOT_FOUND',
  
  // Errori tenant
  TENANT_NOT_FOUND = 'TENANT_NOT_FOUND',
  TENANT_INACTIVE = 'TENANT_INACTIVE',
  TENANT_ACCESS_DENIED = 'TENANT_ACCESS_DENIED',
  TENANT_LIMIT_EXCEEDED = 'TENANT_LIMIT_EXCEEDED',
  INVALID_TENANT_CONTEXT = 'INVALID_TENANT_CONTEXT',
  
  // Errori di validazione
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  INVALID_INPUT = 'INVALID_INPUT',
  MISSING_REQUIRED_FIELD = 'MISSING_REQUIRED_FIELD',
  
  // Errori di business logic
  RESOURCE_NOT_FOUND = 'RESOURCE_NOT_FOUND',
  RESOURCE_ALREADY_EXISTS = 'RESOURCE_ALREADY_EXISTS',
  OPERATION_NOT_ALLOWED = 'OPERATION_NOT_ALLOWED',
  BUSINESS_RULE_VIOLATION = 'BUSINESS_RULE_VIOLATION',
  
  // Errori di sistema
  INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',
  EXTERNAL_SERVICE_ERROR = 'EXTERNAL_SERVICE_ERROR',
  CONFIGURATION_ERROR = 'CONFIGURATION_ERROR',
  
  // Errori di rete
  NETWORK_ERROR = 'NETWORK_ERROR',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',
  CONNECTION_ERROR = 'CONNECTION_ERROR',
}

/**
 * Severità dell'errore
 */
export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

/**
 * Interfaccia per i dettagli dell'errore
 */
export interface ErrorDetails {
  field?: string;
  value?: any;
  constraint?: string;
  code?: string;
  context?: Record<string, any>;
}

/**
 * Classe principale per gli errori dell'applicazione
 */
export class AppError extends Error {
  public readonly type: ErrorType;
  public readonly statusCode: number;
  public readonly severity: ErrorSeverity;
  public readonly isOperational: boolean;
  public readonly details?: ErrorDetails;
  public readonly timestamp: Date;
  public readonly requestId?: string;
  public readonly tenantId?: string;
  public readonly personId?: string;

  constructor(
    message: string,
    type: ErrorType = ErrorType.INTERNAL_SERVER_ERROR,
    statusCode: number = 500,
    severity: ErrorSeverity = ErrorSeverity.MEDIUM,
    isOperational: boolean = true,
    details?: ErrorDetails,
    requestId?: string,
    tenantId?: string,
    personId?: string
  ) {
    super(message);
    
    this.name = this.constructor.name;
    this.type = type;
    this.statusCode = statusCode;
    this.severity = severity;
    this.isOperational = isOperational;
    this.details = details;
    this.timestamp = new Date();
    this.requestId = requestId;
    this.tenantId = tenantId;
    this.personId = personId;

    // Mantieni lo stack trace
    Error.captureStackTrace(this, this.constructor);
  }

  /**
   * Converte l'errore in formato JSON per le risposte API
   */
  toJSON(): object {
    return {
      error: {
        type: this.type,
        message: this.message,
        statusCode: this.statusCode,
        severity: this.severity,
        timestamp: this.timestamp.toISOString(),
        requestId: this.requestId,
        details: this.details,
        ...(process.env.NODE_ENV === 'development' && {
          stack: this.stack
        })
      }
    };
  }

  /**
   * Converte l'errore in formato per il logging
   */
  toLogFormat(): object {
    return {
      type: this.type,
      message: this.message,
      statusCode: this.statusCode,
      severity: this.severity,
      timestamp: this.timestamp.toISOString(),
      requestId: this.requestId,
      tenantId: this.tenantId,
      personId: this.personId,
      details: this.details,
      stack: this.stack
    };
  }
}

/**
 * Factory methods per creare errori specifici
 */
export class ErrorFactory {
  /**
   * Errori di autenticazione
   */
  static authenticationFailed(
    message: string = 'Authentication failed',
    details?: ErrorDetails,
    requestId?: string
  ): AppError {
    return new AppError(
      message,
      ErrorType.AUTHENTICATION_FAILED,
      401,
      ErrorSeverity.MEDIUM,
      true,
      details,
      requestId
    );
  }

  static invalidToken(
    message: string = 'Invalid or expired token',
    details?: ErrorDetails,
    requestId?: string
  ): AppError {
    return new AppError(
      message,
      ErrorType.INVALID_TOKEN,
      401,
      ErrorSeverity.MEDIUM,
      true,
      details,
      requestId
    );
  }

  static unauthorized(
    message: string = 'Unauthorized access',
    details?: ErrorDetails,
    requestId?: string
  ): AppError {
    return new AppError(
      message,
      ErrorType.UNAUTHORIZED,
      401,
      ErrorSeverity.MEDIUM,
      true,
      details,
      requestId
    );
  }

  /**
   * Errori di autorizzazione
   */
  static forbidden(
    message: string = 'Access forbidden',
    details?: ErrorDetails,
    requestId?: string,
    tenantId?: string,
    personId?: string
  ): AppError {
    return new AppError(
      message,
      ErrorType.FORBIDDEN,
      403,
      ErrorSeverity.MEDIUM,
      true,
      details,
      requestId,
      tenantId,
      personId
    );
  }

  static insufficientPermissions(
    message: string = 'Insufficient permissions',
    details?: ErrorDetails,
    requestId?: string,
    tenantId?: string,
    personId?: string
  ): AppError {
    return new AppError(
      message,
      ErrorType.INSUFFICIENT_PERMISSIONS,
      403,
      ErrorSeverity.MEDIUM,
      true,
      details,
      requestId,
      tenantId,
      personId
    );
  }

  /**
   * Errori tenant
   */
  static tenantNotFound(
    message: string = 'Tenant not found',
    details?: ErrorDetails,
    requestId?: string
  ): AppError {
    return new AppError(
      message,
      ErrorType.TENANT_NOT_FOUND,
      404,
      ErrorSeverity.MEDIUM,
      true,
      details,
      requestId
    );
  }

  static tenantInactive(
    message: string = 'Tenant is inactive',
    details?: ErrorDetails,
    requestId?: string,
    tenantId?: string
  ): AppError {
    return new AppError(
      message,
      ErrorType.TENANT_INACTIVE,
      403,
      ErrorSeverity.HIGH,
      true,
      details,
      requestId,
      tenantId
    );
  }

  static tenantAccessDenied(
    message: string = 'Access denied to tenant',
    details?: ErrorDetails,
    requestId?: string,
    tenantId?: string,
    personId?: string
  ): AppError {
    return new AppError(
      message,
      ErrorType.TENANT_ACCESS_DENIED,
      403,
      ErrorSeverity.HIGH,
      true,
      details,
      requestId,
      tenantId,
      personId
    );
  }

  static tenantLimitExceeded(
    message: string = 'Tenant limit exceeded',
    details?: ErrorDetails,
    requestId?: string,
    tenantId?: string
  ): AppError {
    return new AppError(
      message,
      ErrorType.TENANT_LIMIT_EXCEEDED,
      403,
      ErrorSeverity.HIGH,
      true,
      details,
      requestId,
      tenantId
    );
  }

  /**
   * Errori di validazione
   */
  static validationError(
    message: string = 'Validation error',
    details?: ErrorDetails,
    requestId?: string
  ): AppError {
    return new AppError(
      message,
      ErrorType.VALIDATION_ERROR,
      400,
      ErrorSeverity.LOW,
      true,
      details,
      requestId
    );
  }

  static invalidInput(
    message: string = 'Invalid input provided',
    details?: ErrorDetails,
    requestId?: string
  ): AppError {
    return new AppError(
      message,
      ErrorType.INVALID_INPUT,
      400,
      ErrorSeverity.LOW,
      true,
      details,
      requestId
    );
  }

  /**
   * Errori di business logic
   */
  static resourceNotFound(
    message: string = 'Resource not found',
    details?: ErrorDetails,
    requestId?: string,
    tenantId?: string
  ): AppError {
    return new AppError(
      message,
      ErrorType.RESOURCE_NOT_FOUND,
      404,
      ErrorSeverity.LOW,
      true,
      details,
      requestId,
      tenantId
    );
  }

  static resourceAlreadyExists(
    message: string = 'Resource already exists',
    details?: ErrorDetails,
    requestId?: string,
    tenantId?: string
  ): AppError {
    return new AppError(
      message,
      ErrorType.RESOURCE_ALREADY_EXISTS,
      409,
      ErrorSeverity.LOW,
      true,
      details,
      requestId,
      tenantId
    );
  }

  static operationNotAllowed(
    message: string = 'Operation not allowed',
    details?: ErrorDetails,
    requestId?: string,
    tenantId?: string,
    personId?: string
  ): AppError {
    return new AppError(
      message,
      ErrorType.OPERATION_NOT_ALLOWED,
      403,
      ErrorSeverity.MEDIUM,
      true,
      details,
      requestId,
      tenantId,
      personId
    );
  }

  /**
   * Errori di sistema
   */
  static internalServerError(
    message: string = 'Internal server error',
    details?: ErrorDetails,
    requestId?: string,
    isOperational: boolean = false
  ): AppError {
    return new AppError(
      message,
      ErrorType.INTERNAL_SERVER_ERROR,
      500,
      ErrorSeverity.CRITICAL,
      isOperational,
      details,
      requestId
    );
  }

  static databaseError(
    message: string = 'Database error',
    details?: ErrorDetails,
    requestId?: string
  ): AppError {
    return new AppError(
      message,
      ErrorType.DATABASE_ERROR,
      500,
      ErrorSeverity.HIGH,
      false,
      details,
      requestId
    );
  }

  static externalServiceError(
    message: string = 'External service error',
    details?: ErrorDetails,
    requestId?: string
  ): AppError {
    return new AppError(
      message,
      ErrorType.EXTERNAL_SERVICE_ERROR,
      502,
      ErrorSeverity.HIGH,
      true,
      details,
      requestId
    );
  }
}

/**
 * Utility per verificare se un errore è operazionale
 */
export function isOperationalError(error: Error): boolean {
  if (error instanceof AppError) {
    return error.isOperational;
  }
  return false;
}

/**
 * Utility per estrarre informazioni utili da errori generici
 */
export function normalizeError(error: any, requestId?: string): AppError {
  if (error instanceof AppError) {
    return error;
  }

  // Errori Prisma
  if (error.code && error.code.startsWith('P')) {
    return ErrorFactory.databaseError(
      `Database error: ${error.message}`,
      { code: error.code, context: error.meta },
      requestId
    );
  }

  // Errori di validazione
  if (error.name === 'ValidationError') {
    return ErrorFactory.validationError(
      error.message,
      { context: error.errors },
      requestId
    );
  }

  // Errori generici
  return ErrorFactory.internalServerError(
    error.message || 'Unknown error occurred',
    { context: { originalError: error.name } },
    requestId,
    false
  );
}