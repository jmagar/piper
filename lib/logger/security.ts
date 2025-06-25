import { appLogger } from './index';
import { getCurrentCorrelationId, getCurrentContext } from './correlation';

// PII detection patterns
export const PII_PATTERNS = {
  // Email addresses
  email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
  
  // Phone numbers (various formats)
  phone: /(\+?1[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})/g,
  
  // Social Security Numbers
  ssn: /\b(?!000|666|9\d{2})\d{3}-?(?!00)\d{2}-?(?!0000)\d{4}\b/g,
  
  // Credit card numbers (basic pattern)
  creditCard: /\b(?:\d{4}[-\s]?){3}\d{4}\b/g,
  
  // API keys (common patterns)
  apiKey: /\b(?:api[_-]?key|token|secret|password)['":\s]*['"]*([a-zA-Z0-9_\-]{20,})['"]*\b/gi,
  
  // JWT tokens
  jwt: /\beyJ[a-zA-Z0-9_-]+\.eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\b/g,
  
  // IP addresses (might be sensitive in some contexts)
  ipAddress: /\b(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\b/g,
  
  // UUIDs (might contain sensitive identifiers)
  uuid: /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi,
  
  // Custom patterns for common sensitive fields
  authHeader: /\b(?:authorization|bearer|basic)\s+[a-zA-Z0-9+/=]+\b/gi,
  
  // Database connection strings
  dbConnection: /\b(?:mongodb|mysql|postgres|redis):\/\/[^\s]+\b/gi,
};

// Sensitive field names to mask
export const SENSITIVE_FIELD_NAMES = [
  'password',
  'token',
  'secret',
  'key',
  'auth',
  'authorization',
  'credential',
  'private',
  'sensitive',
  'ssn',
  'social_security',
  'credit_card',
  'card_number',
  'cvv',
  'pin',
  'api_key',
  'access_token',
  'refresh_token',
  'session_token',
  'csrf_token',
  'x_api_key',
  'x_auth_token',
  'bearer_token',
  'private_key',
  'public_key',
  'encryption_key',
  'signing_key',
  'webhook_secret',
  'client_secret',
  'database_url',
  'connection_string',
  'smtp_password',
  'oauth_secret',
  'firebase_key'
];

// Security configuration interface
export interface SecurityConfig {
  enablePiiDetection: boolean;
  enableDataMasking: boolean;
  maskingPatterns: {
    email: boolean;
    phone: boolean;
    ssn: boolean;
    creditCard: boolean;
    apiKeys: boolean;
    ipAddresses: boolean;
    uuids: boolean;
  };
  sensitiveFields: string[];
  enableLogAccess: boolean;
  authorizedRoles: string[];
  enableAuditLog: boolean;
  maxLogRetentionDays: number;
  enableLogEncryption: boolean;
}

// Default security configuration
export const DEFAULT_SECURITY_CONFIG: SecurityConfig = {
  enablePiiDetection: true,
  enableDataMasking: true,
  maskingPatterns: {
    email: true,
    phone: true,
    ssn: true,
    creditCard: true,
    apiKeys: true,
    ipAddresses: false, // May be needed for debugging
    uuids: false, // May be needed for correlation
  },
  sensitiveFields: SENSITIVE_FIELD_NAMES,
  enableLogAccess: true,
  authorizedRoles: ['admin', 'developer'],
  enableAuditLog: true,
  maxLogRetentionDays: 30,
  enableLogEncryption: false, // Disabled by default for simplicity
};

/**
 * Security manager for logging system
 */
export class LogSecurity {
  private static instance: LogSecurity;
  private config: SecurityConfig;
  private auditLog: Array<{
    timestamp: string;
    action: string;
    userId?: string;
    details: Record<string, unknown>;
  }> = [];

  private constructor(config: SecurityConfig = DEFAULT_SECURITY_CONFIG) {
    this.config = config;
  }

  public static getInstance(config?: SecurityConfig): LogSecurity {
    if (!LogSecurity.instance) {
      LogSecurity.instance = new LogSecurity(config);
    }
    return LogSecurity.instance;
  }

  /**
   * Sanitize data by detecting and masking PII
   */
  public sanitizeData(data: unknown, depth: number = 0): unknown {
    if (!this.config.enableDataMasking || depth > 10) {
      return data;
    }

    if (typeof data === 'string') {
      return this.sanitizeString(data);
    }

    if (Array.isArray(data)) {
      return data.map(item => this.sanitizeData(item, depth + 1));
    }

    if (typeof data === 'object' && data !== null) {
      const sanitized: Record<string, unknown> = {};
      
      for (const [key, value] of Object.entries(data)) {
        const lowerKey = key.toLowerCase();
        
        // Check if field name is sensitive
        if (this.config.sensitiveFields.some(field => lowerKey.includes(field))) {
          sanitized[key] = '[REDACTED]';
        } else {
          sanitized[key] = this.sanitizeData(value, depth + 1);
        }
      }
      
      return sanitized;
    }

    return data;
  }

  /**
   * Sanitize a string for PII
   */
  private sanitizeString(text: string): string {
    let sanitized = text;

    if (this.config.enablePiiDetection) {
      // Apply PII patterns based on configuration
      if (this.config.maskingPatterns.email) {
        sanitized = sanitized.replace(PII_PATTERNS.email, '[EMAIL_REDACTED]');
      }
      
      if (this.config.maskingPatterns.phone) {
        sanitized = sanitized.replace(PII_PATTERNS.phone, '[PHONE_REDACTED]');
      }
      
      if (this.config.maskingPatterns.ssn) {
        sanitized = sanitized.replace(PII_PATTERNS.ssn, '[SSN_REDACTED]');
      }
      
      if (this.config.maskingPatterns.creditCard) {
        sanitized = sanitized.replace(PII_PATTERNS.creditCard, '[CARD_REDACTED]');
      }
      
      if (this.config.maskingPatterns.apiKeys) {
        sanitized = sanitized.replace(PII_PATTERNS.apiKey, (match, capture) => {
          // Keep first 4 characters for debugging
          const preview = capture.substring(0, 4);
          return match.replace(capture, `${preview}***[API_KEY_REDACTED]`);
        });
        
        sanitized = sanitized.replace(PII_PATTERNS.jwt, '[JWT_REDACTED]');
        sanitized = sanitized.replace(PII_PATTERNS.authHeader, '[AUTH_HEADER_REDACTED]');
        sanitized = sanitized.replace(PII_PATTERNS.dbConnection, '[DB_CONNECTION_REDACTED]');
      }
      
      if (this.config.maskingPatterns.ipAddresses) {
        sanitized = sanitized.replace(PII_PATTERNS.ipAddress, '[IP_REDACTED]');
      }
      
      if (this.config.maskingPatterns.uuids) {
        sanitized = sanitized.replace(PII_PATTERNS.uuid, '[UUID_REDACTED]');
      }
    }

    return sanitized;
  }

  /**
   * Check if user has permission to access logs
   */
  public async checkLogAccess(userId?: string, userRoles: string[] = []): Promise<{
    granted: boolean;
    reason?: string;
  }> {
    if (!this.config.enableLogAccess) {
      return { granted: false, reason: 'Log access is disabled' };
    }

    if (!userId) {
      return { granted: false, reason: 'User not authenticated' };
    }

    // Check if user has authorized role
    const hasAuthorizedRole = userRoles.some(role => 
      this.config.authorizedRoles.includes(role)
    );

    if (!hasAuthorizedRole) {
      this.auditLogAccess(userId, 'DENIED', { reason: 'Insufficient permissions', roles: userRoles });
      return { granted: false, reason: 'Insufficient permissions' };
    }

    this.auditLogAccess(userId, 'GRANTED', { roles: userRoles });
    return { granted: true };
  }

  /**
   * Audit log access attempts
   */
  private auditLogAccess(userId: string, action: 'GRANTED' | 'DENIED', details: Record<string, unknown>): void {
    if (!this.config.enableAuditLog) {
      return;
    }

    const auditEntry = {
      timestamp: new Date().toISOString(),
      action: `LOG_ACCESS_${action}`,
      userId,
      details: {
        ...details,
        correlationId: getCurrentCorrelationId(),
        userAgent: getCurrentContext()?.userAgent,
        ip: getCurrentContext()?.ip,
      }
    };

    this.auditLog.push(auditEntry);

    // Keep only recent audit entries (last 1000)
    if (this.auditLog.length > 1000) {
      this.auditLog = this.auditLog.slice(-1000);
    }

    // Log to application logger as well
    appLogger.info(`Log access ${action.toLowerCase()}`);
  }

  /**
   * Validate log request parameters
   */
  public validateLogRequest(params: Record<string, unknown>): {
    valid: boolean;
    sanitizedParams: Record<string, unknown>;
    errors: string[];
  } {
    const errors: string[] = [];
    const sanitizedParams: Record<string, unknown> = {};

    // Validate and sanitize each parameter
    for (const [key, value] of Object.entries(params)) {
      if (typeof value === 'string') {
        // Check for potential injection attempts
        if (this.containsSqlInjection(value) || this.containsXssAttempt(value)) {
          errors.push(`Invalid characters in parameter: ${key}`);
          continue;
        }
        
        // Sanitize the value
        sanitizedParams[key] = this.sanitizeString(value);
      } else {
        sanitizedParams[key] = value;
      }
    }

    // Validate specific parameters
    if (params.limit && typeof params.limit === 'number') {
      if (params.limit > 1000) {
        errors.push('Limit cannot exceed 1000');
        sanitizedParams.limit = 1000;
      }
    }

    return {
      valid: errors.length === 0,
      sanitizedParams,
      errors
    };
  }

  /**
   * Check for potential SQL injection attempts
   */
  private containsSqlInjection(value: string): boolean {
    const sqlPatterns = [
      /(['";]|--|\*|\/\*|\*\/)/gi,
      /\b(union|select|insert|update|delete|drop|create|alter)\b/gi,
      /\b(or|and)\s+['"]?\d+['"]?\s*[=<>]/gi
    ];

    return sqlPatterns.some(pattern => pattern.test(value));
  }

  /**
   * Check for potential XSS attempts
   */
  private containsXssAttempt(value: string): boolean {
    const xssPatterns = [
      /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
      /javascript:/gi,
      /on\w+\s*=/gi,
      /<iframe\b/gi,
      /<object\b/gi,
      /<embed\b/gi
    ];

    return xssPatterns.some(pattern => pattern.test(value));
  }

  /**
   * Get audit log entries
   */
  public getAuditLog(limit: number = 100): Array<{
    timestamp: string;
    action: string;
    userId?: string;
    details: Record<string, unknown>;
  }> {
    return this.auditLog.slice(-limit);
  }

  /**
   * Update security configuration
   */
  public updateConfig(newConfig: Partial<SecurityConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    appLogger.info('Log security configuration updated');
  }

  /**
   * Get current security configuration
   */
  public getConfig(): SecurityConfig {
    return { ...this.config };
  }

  /**
   * Generate security report
   */
  public generateSecurityReport(): {
    configStatus: Record<string, boolean>;
    recentAuditEvents: number;
    recommendations: string[];
  } {
    const configStatus = {
      piiDetectionEnabled: this.config.enablePiiDetection,
      dataMaskingEnabled: this.config.enableDataMasking,
      logAccessControlEnabled: this.config.enableLogAccess,
      auditLoggingEnabled: this.config.enableAuditLog,
      encryptionEnabled: this.config.enableLogEncryption,
    };

    const recentAuditEvents = this.auditLog.filter(entry => 
      new Date(entry.timestamp) > new Date(Date.now() - 24 * 60 * 60 * 1000)
    ).length;

    const recommendations: string[] = [];
    
    if (!this.config.enablePiiDetection) {
      recommendations.push('Enable PII detection to protect sensitive data');
    }
    
    if (!this.config.enableAuditLog) {
      recommendations.push('Enable audit logging for security monitoring');
    }
    
    if (!this.config.enableLogEncryption) {
      recommendations.push('Consider enabling log encryption for enhanced security');
    }
    
    if (this.config.maxLogRetentionDays > 90) {
      recommendations.push('Consider reducing log retention period for compliance');
    }

    return {
      configStatus,
      recentAuditEvents,
      recommendations
    };
  }
}

// Singleton instance
export const logSecurity = LogSecurity.getInstance();

// Utility functions
export const sanitizeData = (data: unknown) => logSecurity.sanitizeData(data);
export const checkLogAccess = (userId?: string, userRoles: string[] = []) => 
  logSecurity.checkLogAccess(userId, userRoles);
export const validateLogRequest = (params: Record<string, unknown>) => 
  logSecurity.validateLogRequest(params);

// Constants are already exported when declared above
// (PII_PATTERNS, SENSITIVE_FIELD_NAMES)

// Default export
export default logSecurity; 