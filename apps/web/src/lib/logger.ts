/**
 * Pino Logger Configuration
 * Provides structured logging for Next.js application
 * 
 * Usage:
 * ```ts
 * import { logger } from '@/lib/logger';
 * 
 * logger.info('User action', { userId: '123', action: 'view' });
 * logger.error('API error', { error: err.message, endpoint: '/api/data' });
 * ```
 */

import pino from 'pino';

/**
 * Determine if we're in browser or server environment
 */
const isBrowser = typeof window !== 'undefined';

/**
 * Production logger - JSON output for log aggregation services
 */
const productionLogger = pino({
    level: process.env.LOG_LEVEL || 'info',
    browser: {
        asObject: true,
    },
    base: {
        env: process.env.NODE_ENV,
        app: 'csv-web',
    },
    timestamp: pino.stdTimeFunctions.isoTime,
    formatters: {
        level: (label) => {
            return { level: label };
        },
    },
});

/**
 * Development logger - Pretty formatted output for terminal
 */
const developmentLogger = pino({
    level: process.env.LOG_LEVEL || 'debug',
    browser: {
        asObject: true,
    },
    transport: isBrowser ? undefined : {
        target: 'pino-pretty',
        options: {
            colorize: true,
            ignore: 'pid,hostname',
            translateTime: 'HH:MM:ss',
            singleLine: false,
        },
    },
    base: {
        env: process.env.NODE_ENV,
        app: 'csv-web',
    },
});

/**
 * Export logger based on environment
 */
export const logger = process.env.NODE_ENV === 'production'
    ? productionLogger
    : developmentLogger;

/**
 * Child logger factory - Creates logger with persistent context
 * 
 * @example
 * const apiLogger = createLogger({ module: 'api-client' });
 * apiLogger.info('Fetching data', { endpoint: '/documents' });
 * // Output: { module: 'api-client', msg: 'Fetching data', endpoint: '/documents' }
 */
export function createLogger(context: Record<string, unknown>) {
    return logger.child(context);
}

/**
 * Browser-safe console replacement
 * Falls back to console methods in browser environment
 */
export const browserLogger = {
    debug: (msg: string, data?: Record<string, unknown>) => {
        if (isBrowser) console.debug(msg, data);
        else logger.debug(data || {}, msg);
    },
    info: (msg: string, data?: Record<string, unknown>) => {
        if (isBrowser) console.info(msg, data);
        else logger.info(data || {}, msg);
    },
    warn: (msg: string, data?: Record<string, unknown>) => {
        if (isBrowser) console.warn(msg, data);
        else logger.warn(data || {}, msg);
    },
    error: (msg: string, data?: Record<string, unknown>) => {
        if (isBrowser) console.error(msg, data);
        else logger.error(data || {}, msg);
    },
};

/**
 * Helper to log API errors with structured data
 */
export function logApiError(error: unknown, context: { endpoint: string; method?: string; status?: string }) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;

    logger.error({
        msg: 'API Error',
        error: errorMessage,
        stack: errorStack,
        ...context,
    });
}

/**
 * Helper to log component errors (for Error Boundaries)
 */
export function logComponentError(
    error: Error,
    errorInfo: { componentStack?: string | null },
    component: string
) {
    logger.error({
        msg: 'React Component Error',
        error: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack || 'unknown',
        component,
    });
}
