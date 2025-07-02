/**
 * Environment variable validation utility
 * Validates required environment variables and provides type-safe access
 */

interface EnvironmentConfig {
  DATABASE_URL: string
  OPENROUTER_API_KEY?: string
  OPENROUTER_BASE_URL?: string
  DEFAULT_MODEL_ID?: string
  NODE_ENV: 'development' | 'production' | 'test'
}

class EnvironmentValidator {
  private config: EnvironmentConfig | null = null
  private validationErrors: string[] = []

  validate(): EnvironmentConfig {
    if (this.config) {
      return this.config
    }

    this.validationErrors = []

    // Required variables
    const DATABASE_URL = this.validateRequired('DATABASE_URL')
    
    // Optional variables with validation
    const OPENROUTER_API_KEY = this.validateOptional('OPENROUTER_API_KEY', (value) => {
      if (value && value.length < 10) {
        throw new Error('OPENROUTER_API_KEY appears to be too short')
      }
      return value
    })

    const OPENROUTER_BASE_URL = this.validateOptional('OPENROUTER_BASE_URL', (value) => {
      if (value && !this.isValidUrl(value)) {
        throw new Error('OPENROUTER_BASE_URL must be a valid URL')
      }
      return value
    })

    const DEFAULT_MODEL_ID = this.validateOptional('DEFAULT_MODEL_ID', (value) => {
      if (value && !this.isValidModelId(value)) {
        throw new Error('DEFAULT_MODEL_ID must be a valid model identifier')
      }
      return value
    })

    const NODE_ENV = this.validateNodeEnv()

    // Check for validation errors
    if (this.validationErrors.length > 0) {
      const errorMessage = `Environment variable validation failed:\n${this.validationErrors.join('\n')}`
      console.error(errorMessage)
      throw new Error(errorMessage)
    }

    this.config = {
      DATABASE_URL,
      OPENROUTER_API_KEY,
      OPENROUTER_BASE_URL,
      DEFAULT_MODEL_ID,
      NODE_ENV
    }

    return this.config
  }

  private validateRequired(key: string): string {
    const env = (globalThis as any).process?.env || {}
    const value = env[key]
    if (!value || value.trim() === '') {
      this.validationErrors.push(`Required environment variable ${key} is missing or empty`)
      return ''
    }
    return value.trim()
  }

  private validateOptional<T>(key: string, validator?: (value: string) => T): T | undefined {
    const env = (globalThis as any).process?.env || {}
    const value = env[key]
    if (!value || value.trim() === '') {
      return undefined
    }

    try {
      return validator ? validator(value.trim()) : (value.trim() as T)
    } catch (error) {
      this.validationErrors.push(`Invalid ${key}: ${error instanceof Error ? error.message : String(error)}`)
      return undefined
    }
  }

  private validateNodeEnv(): 'development' | 'production' | 'test' {
    const env = (globalThis as any).process?.env || {}
    const nodeEnv = env.NODE_ENV || 'development'
    if (!['development', 'production', 'test'].includes(nodeEnv)) {
      this.validationErrors.push(`Invalid NODE_ENV: ${nodeEnv}. Must be 'development', 'production', or 'test'`)
      return 'development'
    }
    return nodeEnv as 'development' | 'production' | 'test'
  }

  private isValidUrl(url: string): boolean {
    try {
      new URL(url)
      return true
    } catch {
      return false
    }
  }

  private isValidModelId(modelId: string): boolean {
    // Basic validation for model ID format
    // Should be provider/model-name format or similar
    return /^[a-zA-Z0-9][a-zA-Z0-9._/-]*[a-zA-Z0-9]$/.test(modelId) && modelId.length <= 100
  }

  getConfig(): EnvironmentConfig {
    if (!this.config) {
      return this.validate()
    }
    return this.config
  }

  isDevelopment(): boolean {
    return this.getConfig().NODE_ENV === 'development'
  }

  isProduction(): boolean {
    return this.getConfig().NODE_ENV === 'production'
  }

  isTest(): boolean {
    return this.getConfig().NODE_ENV === 'test'
  }
}

// Singleton instance
export const envValidator = new EnvironmentValidator()

// Validate environment on module load (but only in Node.js environment)
if (typeof window === 'undefined') {
  try {
    envValidator.validate()
    console.log('✅ Environment variables validated successfully')
  } catch (error) {
    console.error('❌ Environment validation failed:', error)
    // Don't throw in module scope as it could break builds
    // Instead, the error will be thrown when trying to access config
  }
}

// Export validated config getter
export const getValidatedEnv = () => envValidator.getConfig()

// Export individual getters for convenience
export const getDatabaseUrl = () => envValidator.getConfig().DATABASE_URL
export const getOpenRouterApiKey = () => envValidator.getConfig().OPENROUTER_API_KEY
export const getOpenRouterBaseUrl = () => envValidator.getConfig().OPENROUTER_BASE_URL
export const getDefaultModelId = () => envValidator.getConfig().DEFAULT_MODEL_ID || 'anthropic/claude-3.5-sonnet'
export const getNodeEnv = () => envValidator.getConfig().NODE_ENV