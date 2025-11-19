/**
 * Centralized Error Handling Utility
 *
 * Provides consistent error handling across the application.
 * Backend-agnostic - works with any data source.
 */

// ==================== Error Types ====================

export enum ErrorCode {
  // Authentication & Authorization
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  SESSION_EXPIRED = 'SESSION_EXPIRED',

  // Validation
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  INVALID_INPUT = 'INVALID_INPUT',
  MISSING_REQUIRED_FIELD = 'MISSING_REQUIRED_FIELD',

  // Data
  NOT_FOUND = 'NOT_FOUND',
  ALREADY_EXISTS = 'ALREADY_EXISTS',
  CONFLICT = 'CONFLICT',

  // Business Logic
  INSUFFICIENT_INVENTORY = 'INSUFFICIENT_INVENTORY',
  INVALID_ORDER_STATUS = 'INVALID_ORDER_STATUS',
  COUPON_EXPIRED = 'COUPON_EXPIRED',
  COUPON_LIMIT_REACHED = 'COUPON_LIMIT_REACHED',
  INSUFFICIENT_LOYALTY_POINTS = 'INSUFFICIENT_LOYALTY_POINTS',

  // Network & System
  NETWORK_ERROR = 'NETWORK_ERROR',
  TIMEOUT = 'TIMEOUT',
  SERVER_ERROR = 'SERVER_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',

  // Unknown
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

export interface ErrorContext {
  [key: string]: unknown
  userId?: string
  tenantId?: string
  action?: string
  resource?: string
}

// ==================== Base Error Class ====================

export class AppError extends Error {
  public readonly code: ErrorCode
  public readonly statusCode: number
  public readonly context?: ErrorContext
  public readonly isOperational: boolean
  public readonly timestamp: Date

  constructor(
    message: string,
    code: ErrorCode = ErrorCode.UNKNOWN_ERROR,
    statusCode: number = 500,
    context?: ErrorContext,
    isOperational: boolean = true
  ) {
    super(message)

    this.name = this.constructor.name
    this.code = code
    this.statusCode = statusCode
    this.context = context
    this.isOperational = isOperational
    this.timestamp = new Date()

    // Maintains proper stack trace for where our error was thrown
    Error.captureStackTrace(this, this.constructor)
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      statusCode: this.statusCode,
      context: this.context,
      timestamp: this.timestamp.toISOString(),
    }
  }
}

// ==================== Specific Error Classes ====================

export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication required', context?: ErrorContext) {
    super(message, ErrorCode.UNAUTHORIZED, 401, context)
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = 'Insufficient permissions', context?: ErrorContext) {
    super(message, ErrorCode.FORBIDDEN, 403, context)
  }
}

export class ValidationError extends AppError {
  constructor(message: string, context?: ErrorContext) {
    super(message, ErrorCode.VALIDATION_ERROR, 400, context)
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, id?: string, context?: ErrorContext) {
    const message = id ? `${resource} with id '${id}' not found` : `${resource} not found`
    super(message, ErrorCode.NOT_FOUND, 404, { ...context, resource, id })
  }
}

export class ConflictError extends AppError {
  constructor(message: string, context?: ErrorContext) {
    super(message, ErrorCode.CONFLICT, 409, context)
  }
}

export class BusinessLogicError extends AppError {
  constructor(message: string, code: ErrorCode, context?: ErrorContext) {
    super(message, code, 400, context)
  }
}

export class NetworkError extends AppError {
  constructor(message: string = 'Network request failed', context?: ErrorContext) {
    super(message, ErrorCode.NETWORK_ERROR, 503, context)
  }
}

export class DatabaseError extends AppError {
  constructor(message: string = 'Database operation failed', context?: ErrorContext) {
    super(message, ErrorCode.DATABASE_ERROR, 500, context, false)
  }
}

// ==================== Error Handling Functions ====================

/**
 * Checks if an error is an operational error (expected) vs programming error
 */
export function isOperationalError(error: Error): boolean {
  if (error instanceof AppError) {
    return error.isOperational
  }
  return false
}

/**
 * Extracts user-friendly error message from any error
 */
export function getUserMessage(error: unknown): string {
  if (error instanceof AppError) {
    return error.message
  }

  if (error instanceof Error) {
    // Check for known error patterns from different backends
    const message = error.message.toLowerCase()

    // Supabase patterns
    if (message.includes('jwt') || message.includes('token')) {
      return 'Your session has expired. Please sign in again.'
    }
    if (message.includes('row level security') || message.includes('rls')) {
      return 'You do not have permission to perform this action.'
    }
    if (message.includes('unique constraint') || message.includes('duplicate')) {
      return 'This item already exists.'
    }
    if (message.includes('foreign key') || message.includes('fk_')) {
      return 'Cannot complete operation due to related data.'
    }

    // Network patterns
    if (message.includes('network') || message.includes('fetch')) {
      return 'Network error. Please check your connection.'
    }
    if (message.includes('timeout')) {
      return 'Request timed out. Please try again.'
    }

    // Generic
    return error.message
  }

  if (typeof error === 'string') {
    return error
  }

  return 'An unexpected error occurred. Please try again.'
}

/**
 * Logs error with appropriate level and context
 */
export function logError(error: unknown, context?: ErrorContext): void {
  const errorInfo = {
    error:
      error instanceof Error
        ? {
            name: error.name,
            message: error.message,
            stack: error.stack,
          }
        : error,
    context,
    timestamp: new Date().toISOString(),
  }

  // In production, send to error tracking service (Sentry, etc.)
  if (process.env.NODE_ENV === 'production') {
    // TODO: Send to error tracking service
    console.error('[ERROR]', JSON.stringify(errorInfo, null, 2))
  } else {
    console.error('[ERROR]', errorInfo)
  }
}

/**
 * Handles error and returns user-friendly result
 */
export function handleError(
  error: unknown,
  context?: ErrorContext
): {
  message: string
  code: ErrorCode
  statusCode: number
} {
  logError(error, context)

  if (error instanceof AppError) {
    return {
      message: error.message,
      code: error.code,
      statusCode: error.statusCode,
    }
  }

  return {
    message: getUserMessage(error),
    code: ErrorCode.UNKNOWN_ERROR,
    statusCode: 500,
  }
}

/**
 * Wraps async function with error handling
 */
export function withErrorHandling<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  context?: ErrorContext
): T {
  return (async (...args: Parameters<T>) => {
    try {
      return await fn(...args)
    } catch (error) {
      const handled = handleError(error, context)
      throw new AppError(handled.message, handled.code, handled.statusCode, context)
    }
  }) as T
}

/**
 * Creates error from HTTP response
 */
export function createErrorFromResponse(response: Response, context?: ErrorContext): AppError {
  const statusCode = response.status
  let code: ErrorCode
  let message: string

  switch (statusCode) {
    case 400:
      code = ErrorCode.VALIDATION_ERROR
      message = 'Invalid request'
      break
    case 401:
      code = ErrorCode.UNAUTHORIZED
      message = 'Authentication required'
      break
    case 403:
      code = ErrorCode.FORBIDDEN
      message = 'Access denied'
      break
    case 404:
      code = ErrorCode.NOT_FOUND
      message = 'Resource not found'
      break
    case 409:
      code = ErrorCode.CONFLICT
      message = 'Conflict with existing data'
      break
    case 500:
      code = ErrorCode.SERVER_ERROR
      message = 'Server error'
      break
    default:
      code = ErrorCode.UNKNOWN_ERROR
      message = 'An unexpected error occurred'
  }

  return new AppError(message, code, statusCode, context)
}

// ==================== React Hook for Error Handling ====================

export interface UseErrorHandlerResult {
  error: AppError | null
  setError: (error: unknown) => void
  clearError: () => void
  handleError: (error: unknown, context?: ErrorContext) => void
}

/**
 * React hook for component-level error handling
 * Usage:
 *
 * const { error, handleError, clearError } = useErrorHandler()
 *
 * try {
 *   await someOperation()
 * } catch (err) {
 *   handleError(err, { action: 'createOrder' })
 * }
 */
export function createErrorHandler() {
  return {
    handleError: (error: unknown, context?: ErrorContext) => {
      const handled = handleError(error, context)
      return new AppError(handled.message, handled.code, handled.statusCode, context)
    },
    getUserMessage,
    logError,
  }
}
