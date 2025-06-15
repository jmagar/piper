import { MCPServerConfigFromUI, MCPTransportSSE, MCPTransportStdio, ServerFormData } from './serverTypes';

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

/**
 * Validate a URL string
 */
export const isValidUrl = (url: string): boolean => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

/**
 * Validate server name uniqueness
 */
export const validateServerNameUniqueness = (
  name: string,
  existingServers: MCPServerConfigFromUI[],
  currentServerId?: string
): ValidationResult => {
  const trimmedName = name.trim();
  
  if (!trimmedName) {
    return { isValid: false, error: 'Server Key Name is required' };
  }

  const existingServer = existingServers.find(s => s.name === trimmedName);
  
  // For new servers
  if (!currentServerId && existingServer) {
    return { isValid: false, error: 'Server Key Name must be unique' };
  }
  
  // For editing servers - check if name conflicts with a different server
  if (currentServerId && existingServer && existingServer.id !== currentServerId) {
    return { isValid: false, error: 'Server Key Name must be unique' };
  }

  return { isValid: true };
};

/**
 * Validate STDIO transport configuration
 */
export const validateStdioTransport = (transport: MCPTransportStdio): ValidationResult => {
  if (!transport.command?.trim()) {
    return { isValid: false, error: 'Command is required for STDIO transport' };
  }

  // Additional validation for command could go here
  // e.g., check if command looks valid, exists, etc.

  return { isValid: true };
};

/**
 * Validate SSE/HTTP transport configuration
 */
export const validateSseHttpTransport = (transport: MCPTransportSSE): ValidationResult => {
  if (!transport.url?.trim()) {
    return { isValid: false, error: 'URL is required for SSE/HTTP transport' };
  }

  if (!isValidUrl(transport.url)) {
    return { isValid: false, error: 'Please enter a valid URL' };
  }

  return { isValid: true };
};

/**
 * Validate transport configuration based on type
 */
export const validateTransport = (transport: MCPTransportSSE | MCPTransportStdio): ValidationResult => {
  if (transport.type === 'stdio') {
    return validateStdioTransport(transport as MCPTransportStdio);
  } else if (transport.type === 'sse' || transport.type === 'http') {
    return validateSseHttpTransport(transport as MCPTransportSSE);
  }

  return { isValid: false, error: 'Invalid transport type' };
};

/**
 * Validate complete server form data
 */
export const validateServerForm = (
  formData: ServerFormData,
  existingServers: MCPServerConfigFromUI[],
  isEditing: boolean = false,
  currentServerId?: string
): ValidationResult => {
  // Validate server name uniqueness
  const nameValidation = validateServerNameUniqueness(
    formData.name,
    existingServers,
    isEditing ? currentServerId : undefined
  );
  
  if (!nameValidation.isValid) {
    return nameValidation;
  }

  // Validate transport configuration
  const transportValidation = validateTransport(formData.transport);
  if (!transportValidation.isValid) {
    return transportValidation;
  }

  return { isValid: true };
};

/**
 * Validate complete server configuration
 */
export const validateServerConfig = (
  server: MCPServerConfigFromUI,
  existingServers: MCPServerConfigFromUI[],
  isEditing: boolean = false
): ValidationResult => {
  const formData: ServerFormData = {
    id: server.id,
    name: server.name,
    displayName: server.displayName || '',
    enabled: server.enabled,
    transport: server.transport
  };

  return validateServerForm(formData, existingServers, isEditing, server.id);
};

/**
 * Validate environment variables format
 */
export const validateEnvironmentVariables = (envString: string): ValidationResult => {
  if (!envString.trim()) {
    return { isValid: true }; // Empty is valid
  }

  const lines = envString.split('\n');
  for (const line of lines) {
    const trimmedLine = line.trim();
    if (trimmedLine && !trimmedLine.includes('=')) {
      return { 
        isValid: false, 
        error: 'Environment variables must be in KEY=VALUE format' 
      };
    }
  }

  return { isValid: true };
};

/**
 * Validate headers format
 */
export const validateHeaders = (headersString: string): ValidationResult => {
  if (!headersString.trim()) {
    return { isValid: true }; // Empty is valid
  }

  const lines = headersString.split('\n');
  for (const line of lines) {
    const trimmedLine = line.trim();
    if (trimmedLine && !trimmedLine.includes(':')) {
      return { 
        isValid: false, 
        error: 'Headers must be in Header:Value format' 
      };
    }
  }

  return { isValid: true };
};

/**
 * Validate command arguments
 */
export const validateCommandArgs = (argsString: string): ValidationResult => {
  if (!argsString.trim()) {
    return { isValid: true }; // Empty is valid
  }

  try {
    // Try to parse as JSON array for structured args
    const parsed = JSON.parse(argsString);
    if (Array.isArray(parsed)) {
      return { isValid: true };
    }
    return { 
      isValid: false, 
      error: 'Arguments must be a valid JSON array (e.g., ["--help", "--verbose"])' 
    };
  } catch {
    // If not JSON, treat as space-separated string and validate basic format
    const args = argsString.trim().split(/\s+/);
    const hasInvalidChars = args.some(arg => 
      arg.includes('\n') || arg.includes('\r') || arg.includes('\0')
    );
    
    if (hasInvalidChars) {
      return { 
        isValid: false, 
        error: 'Arguments cannot contain newlines or null characters' 
      };
    }
    
    return { isValid: true };
  }
};

/**
 * Get validation rules for a field
 */
export const getFieldValidationRules = (fieldName: string) => {
  const rules = {
    name: {
      required: true,
      minLength: 1,
      pattern: /^[a-zA-Z0-9_-]+$/,
      message: 'Name must contain only letters, numbers, hyphens, and underscores'
    },
    command: {
      required: true,
      minLength: 1,
      message: 'Command is required'
    },
    url: {
      required: true,
      minLength: 1,
      pattern: /^https?:\/\/.+/,
      message: 'Must be a valid HTTP or HTTPS URL'
    }
  };

  return rules[fieldName as keyof typeof rules];
}; 