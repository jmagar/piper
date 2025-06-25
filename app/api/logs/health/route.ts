import { NextResponse } from 'next/server'
import fs from 'fs/promises'
import { constants } from 'fs'
import path from 'path'
import { appLogger } from '@/lib/logger'
import { getCurrentCorrelationId } from '@/lib/logger/correlation'

interface LogHealthCheck {
  status: 'healthy' | 'degraded' | 'unhealthy'
  message: string
  checks: {
    fileWriteAccess: {
      status: 'pass' | 'fail'
      message: string
    }
    diskSpace: {
      status: 'pass' | 'warn' | 'fail'
      available: number
      used: number
      percentage: number
      message: string
    }
    logRotation: {
      status: 'pass' | 'fail'
      message: string
      lastRotation?: string
    }
    recentErrors: {
      status: 'pass' | 'warn' | 'fail'
      count: number
      message: string
    }
    loggerStatus: {
      status: 'pass' | 'fail'
      message: string
    }
  }
  timestamp: string
}

export async function GET() {
  const correlationId = getCurrentCorrelationId()
  
  try {
    appLogger.debug('Log health check requested', { correlationId })
    
    const healthCheck = await performHealthChecks()
    
    // Determine overall status
    const checks = Object.values(healthCheck.checks)
    const hasFailures = checks.some(check => check.status === 'fail')
    const hasWarnings = checks.some(check => check.status === 'warn')
    
    let overallStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy'
    let overallMessage = 'All logging systems are operational'
    
    if (hasFailures) {
      overallStatus = 'unhealthy'
      overallMessage = 'One or more critical logging systems are failing'
    } else if (hasWarnings) {
      overallStatus = 'degraded'
      overallMessage = 'Logging systems are operational with warnings'
    }
    
    const response = {
      ...healthCheck,
      status: overallStatus,
      message: overallMessage
    }
    
    appLogger.debug('Log health check completed', {
      correlationId,
      args: { status: overallStatus, hasFailures, hasWarnings }
    })
    
    // Return appropriate HTTP status based on health
    const httpStatus = overallStatus === 'unhealthy' ? 503 : 
                      overallStatus === 'degraded' ? 200 : 200
    
    return NextResponse.json(response, {
      status: httpStatus,
      headers: {
        'X-Correlation-Id': correlationId || '',
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
    })
    
  } catch (error) {
    appLogger.error('Error in log health check', { 
      correlationId,
      error: error as Error 
    })
    
    return NextResponse.json({
      status: 'unhealthy',
      message: 'Health check failed to execute',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { 
      status: 503,
      headers: {
        'X-Correlation-Id': correlationId || ''
      }
    })
  }
}

async function performHealthChecks(): Promise<LogHealthCheck> {
  const logsDir = path.join(process.cwd(), 'logs')
  const timestamp = new Date().toISOString()
  
  // Initialize all checks
  const checks: LogHealthCheck['checks'] = {
    fileWriteAccess: { status: 'fail', message: 'Not checked' },
    diskSpace: { status: 'fail', available: 0, used: 0, percentage: 0, message: 'Not checked' },
    logRotation: { status: 'fail', message: 'Not checked' },
    recentErrors: { status: 'fail', count: 0, message: 'Not checked' },
    loggerStatus: { status: 'fail', message: 'Not checked' }
  }
  
  // Check 1: File write access
  try {
    // Check if logs directory exists and is writable
    await fs.access(logsDir, constants.F_OK | constants.W_OK)
    
    // Try to write a test file
    const testFile = path.join(logsDir, '.health-check')
    await fs.writeFile(testFile, `Health check at ${timestamp}`)
    await fs.unlink(testFile) // Clean up
    
    checks.fileWriteAccess = {
      status: 'pass',
      message: 'Log directory is writable'
    }
  } catch (error) {
    checks.fileWriteAccess = {
      status: 'fail',
      message: `Cannot write to log directory: ${error instanceof Error ? error.message : 'Unknown error'}`
    }
  }
  
  // Check 2: Disk space
  try {
    // Note: fs.stat doesn't provide disk usage, but we can estimate from file sizes
    
    // Get all log files and calculate total size
    const files = await fs.readdir(logsDir)
    let totalSize = 0
    
    for (const file of files) {
      try {
        const filePath = path.join(logsDir, file)
        const fileStat = await fs.stat(filePath)
        totalSize += fileStat.size
      } catch {
        // Skip files we can't read
      }
    }
    
    // Convert to MB for readability
    const totalSizeMB = totalSize / (1024 * 1024)
    const warningThresholdMB = 500 // 500MB warning
    const criticalThresholdMB = 1000 // 1GB critical
    
    let status: 'pass' | 'warn' | 'fail' = 'pass'
    let message = `Log files using ${totalSizeMB.toFixed(2)}MB`
    
    if (totalSizeMB > criticalThresholdMB) {
      status = 'fail'
      message = `Log files using ${totalSizeMB.toFixed(2)}MB (exceeds ${criticalThresholdMB}MB limit)`
    } else if (totalSizeMB > warningThresholdMB) {
      status = 'warn'
      message = `Log files using ${totalSizeMB.toFixed(2)}MB (approaching ${criticalThresholdMB}MB limit)`
    }
    
    checks.diskSpace = {
      status,
      available: 0, // Not available via fs.stat
      used: totalSize,
      percentage: 0, // Not calculable without total disk space
      message
    }
  } catch (error) {
    checks.diskSpace = {
      status: 'fail',
      available: 0,
      used: 0,
      percentage: 0,
      message: `Cannot check disk space: ${error instanceof Error ? error.message : 'Unknown error'}`
    }
  }
  
  // Check 3: Log rotation
  try {
    const files = await fs.readdir(logsDir)
    const logFiles = files.filter(file => file.endsWith('.log'))
    
    if (logFiles.length === 0) {
      checks.logRotation = {
        status: 'fail',
        message: 'No log files found'
      }
    } else {
      // Check if we have files from different days (indicating rotation is working)
      const today = new Date().toISOString().split('T')[0]
      const hasOldFiles = logFiles.some(file => !file.includes(today))
      
      if (hasOldFiles || logFiles.length > 1) {
        checks.logRotation = {
          status: 'pass',
          message: `Log rotation appears to be working (${logFiles.length} log files)`
        }
      } else {
        checks.logRotation = {
          status: 'pass',
          message: 'Single log file found (rotation may not have occurred yet)'
        }
      }
    }
  } catch (error) {
    checks.logRotation = {
      status: 'fail',
      message: `Cannot check log rotation: ${error instanceof Error ? error.message : 'Unknown error'}`
    }
  }
  
  // Check 4: Recent errors
  try {
    const files = await fs.readdir(logsDir)
    const errorLogFiles = files.filter(file => file.includes('error') && file.endsWith('.log'))
    
    let recentErrorCount = 0
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)
    
    // Check error logs from the last hour
    for (const file of errorLogFiles.slice(0, 3)) { // Only check recent error files
      try {
        const filePath = path.join(logsDir, file)
        const content = await fs.readFile(filePath, 'utf-8')
        const lines = content.trim().split('\n').filter(line => line.trim())
        
        for (const line of lines) {
          try {
            const logEntry = JSON.parse(line)
            const logTime = new Date(logEntry.timestamp)
            if (logTime > oneHourAgo && logEntry.level === 'error') {
              recentErrorCount++
            }
          } catch {
            // Skip malformed lines
          }
        }
      } catch {
        // Skip files we can't read
      }
    }
    
    let status: 'pass' | 'warn' | 'fail' = 'pass'
    let message = `${recentErrorCount} errors in the last hour`
    
    if (recentErrorCount > 50) {
      status = 'fail'
      message = `High error rate: ${recentErrorCount} errors in the last hour`
    } else if (recentErrorCount > 10) {
      status = 'warn'
      message = `Elevated error rate: ${recentErrorCount} errors in the last hour`
    }
    
    checks.recentErrors = {
      status,
      count: recentErrorCount,
      message
    }
  } catch (error) {
    checks.recentErrors = {
      status: 'fail',
      count: 0,
      message: `Cannot check recent errors: ${error instanceof Error ? error.message : 'Unknown error'}`
    }
  }
  
  // Check 5: Logger status
  try {
    // Simple logger health check - verify we can log
    appLogger.debug('Logger health check test')
    checks.loggerStatus = {
      status: 'pass',
      message: 'Logger is functioning correctly'
    }
  } catch (error) {
    checks.loggerStatus = {
      status: 'fail',
      message: `Logger health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    }
  }
  
  return {
    status: 'healthy', // Will be overridden by caller
    message: '', // Will be overridden by caller
    checks,
    timestamp
  }
} 