#!/usr/bin/env node
/**
 * Start servers for development
 */

/* eslint-env node */
/* global setTimeout clearTimeout */

/// <reference lib="dom" />
/// <reference types="node" />

// Node.js built-in importsi
import { spawn, exec, ChildProcess, SpawnOptions } from 'child_process';
import { createWriteStream } from 'fs';
import { existsSync } from 'fs';
import { join, resolve } from 'path';
import { promisify } from 'util';
import { platform } from 'os';
import * as http from 'http';

// Third-party imports
import chalk from 'chalk';
import { exit } from 'process';

// Types
type NodeTimer = ReturnType<typeof setTimeout>;

const execAsync = promisify(exec);

const BACKEND_PORT = 4100;
const FRONTEND_PORT = 3002;
const DOCKER_CONTAINERS = ['pooper-redis', 'pooper-db', 'pooper-qdrant'];
const DOCKER_NETWORK = 'jakenet';

let isShuttingDown = false;
let frontendProcess: ChildProcess | null = null;
let backendProcess: ChildProcess | null = null;

// ASCII art logo for startup
const ASCII_LOGO = `
 ██████   ██████   ██████  ██████  ███████ ██████  
 ██   ██ ██    ██ ██    ██ ██   ██ ██      ██   ██ 
 ██████  ██    ██ ██    ██ ██████  █████   ██████  
 ██      ██    ██ ██    ██ ██      ██      ██   ██ 
 ██       ██████   ██████  ██      ███████ ██   ██ 
                                                    
 ███████ ███████ ██████  ██    ██ ███████ ██████  ███████ 
 ██      ██      ██   ██ ██    ██ ██      ██   ██ ██      
 ███████ █████   ██████  ██    ██ █████   ██████  ███████ 
      ██ ██      ██   ██  ██  ██  ██      ██   ██      ██ 
 ███████ ███████ ██   ██   ████   ███████ ██   ██ ███████ 
`;

// Enhanced terminal symbols
const SYMBOLS = {
  success: '✓',
  error: '✗',
  warning: '⚠',
  info: 'ℹ',
  loading: '⟳',
  bullet: '•',
  arrow: '→',
  docker: '🐳',
  server: '🖥️',
  database: '🗄️',
  frontend: '🌐',
  backend: '⚙️'
};

// Function to create EST timestamp formatter
function getTimestampOptions(): string {
    return 'HH:MM:ss';
}

// Format duration in a human-readable way
function formatDuration(ms: number): string {
    if (ms < 1000) return `${ms}ms`;
    const seconds = Math.floor(ms / 1000);
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
}

// Create a horizontal divider with title
function createDivider(title?: string): string {
    const dividerLength = 80;
    const dividerChar = '─';
    
    if (!title) {
        return chalk.gray(dividerChar.repeat(dividerLength));
    }
    
    const prefix = `${dividerChar.repeat(3)} `;
    const suffix = ` ${dividerChar.repeat(dividerLength - prefix.length - title.length - 2)}`;
    return chalk.gray(prefix) + chalk.cyan.bold(title) + chalk.gray(suffix);
}

async function waitForServerReady(port: number, timeout = 30000): Promise<boolean> {
    const start = Date.now();
    while (Date.now() - start < timeout) {
        try {
            await new Promise((resolve, reject) => {
                const req = http.get(`http://localhost:${port}/api/health`, (res) => {
                    if (res.statusCode === 200) {
                        resolve(true);
                    } else {
                        reject(new Error(`Server responded with status ${res.statusCode}`));
                    }
                });
                req.on('error', () => {
                    // Server not ready yet
                    resolve(false);
                });
                req.end();
            });
            return true;
        } catch {
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    }
    
    return false;
}

async function checkDockerNetwork(): Promise<boolean> {
    try {
        const { stdout } = await execAsync('docker network ls --format "{{.Name}}"');
        return stdout.split('\n').includes(DOCKER_NETWORK);
    } catch {
        return false;
    }
}

async function createDockerNetwork(): Promise<void> {
    try {
        console.info(chalk.blue(`Creating Docker network ${chalk.bold(DOCKER_NETWORK)}...`));
        await execAsync(`docker network create ${DOCKER_NETWORK}`);
    } catch (_error) {
        console.error(chalk.red(`Failed to create Docker network`));
        throw _error;
    }
}

async function isContainerRunning(container: string): Promise<boolean> {
    try {
        const { stdout } = await execAsync(`docker container inspect -f '{{.State.Running}}' ${container}`);
        return stdout.trim() === 'true';
    } catch {
        return false;
    }
}

async function isContainerHealthy(container: string): Promise<boolean> {
    try {
        const { stdout } = await execAsync(`docker container inspect -f '{{.State.Health.Status}}' ${container}`);
        return stdout.trim() === 'healthy';
    } catch {
        return false;
    }
}

async function waitForContainerHealth(container: string, timeout = 60000): Promise<boolean> {
    const start = Date.now();
    while (Date.now() - start < timeout) {
        if (await isContainerHealthy(container)) {
            console.info(chalk.green(`Container ${chalk.bold(container)} is healthy`));
            return true;
        }
        await new Promise(resolve => setTimeout(resolve, 1000));
        process.stdout.write(chalk.yellow('.'));
    }
    console.error(chalk.red(`\nTimeout waiting for container ${chalk.bold(container)} to be healthy`));
    return false;
}

async function startDockerStack(): Promise<void> {
    try {
        // Check if network exists
        if (!await checkDockerNetwork()) {
            console.log(chalk.blue(`${SYMBOLS.bullet} Creating Docker network ${chalk.bold(DOCKER_NETWORK)}...`));
            await createDockerNetwork();
            console.log(chalk.green(`${SYMBOLS.success} Docker network created successfully`));
        } else {
            console.log(chalk.green(`${SYMBOLS.success} Docker network ${chalk.bold(DOCKER_NETWORK)} already exists`));
        }

        // Check container status with visual indicators
        console.log(chalk.blue(`${SYMBOLS.bullet} Checking Docker container status...`));
        
        const containersRunning = await Promise.all(
            DOCKER_CONTAINERS.map(async container => {
                const running = await isContainerRunning(container);
                console.log(
                    running 
                        ? chalk.green(`${SYMBOLS.success} Container ${chalk.bold(container)} is running`)
                        : chalk.yellow(`${SYMBOLS.warning} Container ${chalk.bold(container)} is not running`)
                );
                return { name: container, running };
            })
        );

        const allRunning = containersRunning.every(c => c.running);
        
        if (!allRunning) {
            console.log(chalk.blue(`${SYMBOLS.docker} Starting Docker stack...`));
            const startTime = Date.now();
            await execAsync('docker compose up -d');
            console.log(chalk.green(`${SYMBOLS.success} Docker compose started in ${chalk.cyan(formatDuration(Date.now() - startTime))}`));

            // Wait for containers to be healthy with enhanced progress feedback
            console.log(chalk.blue(`${SYMBOLS.loading} Waiting for containers to be healthy...`));
            
            const healthyResults = await Promise.all(
                DOCKER_CONTAINERS.map(async container => {
                    const isHealthy = await waitForContainerHealth(container);
                    return { container, healthy: isHealthy };
                })
            );

            // Print summary of container health status
            console.log(chalk.cyan(`${SYMBOLS.info} Container health summary:`));
            for (const result of healthyResults) {
                console.log(
                    result.healthy
                        ? chalk.green(`   ${SYMBOLS.success} ${chalk.bold(result.container)}: Healthy`)
                        : chalk.red(`   ${SYMBOLS.error} ${chalk.bold(result.container)}: Unhealthy`)
                );
            }

            if (!healthyResults.every(result => result.healthy)) {
                throw new Error('Some containers failed to become healthy');
            }
        } else {
            console.log(chalk.green(`${SYMBOLS.success} All Docker containers are already running`));
        }
    } catch (error) {
        console.error(chalk.red(`${SYMBOLS.error} Failed to start Docker stack:`), error);
        throw error;
    }
}

async function isPortInUse(port: number): Promise<boolean> {
    try {
        const { stdout } = await execAsync(`lsof -i :${port} -t`);
        return stdout.trim().length > 0;
    } catch {
        // If lsof returns no results, it exits with code 1
        return false;
    }
}

async function killProcessOnPort(port: number): Promise<void> {
    try {
        const { stdout } = await execAsync(`lsof -i :${port} -t`);
        if (stdout.trim()) {
            // Kill all processes using this port
            const pids = stdout.trim().split('\n');
            for (const pid of pids) {
                try {
                    await execAsync(`kill -9 ${pid}`);
                    console.info(chalk.yellow(`Killed process ${chalk.bold(pid)} on port ${chalk.bold(port)}`));
                } catch {
                    // Process might be already gone
                }
            }
        }
    } catch {
        // Ignore errors if no process found
    }
}

async function killAllNextProcesses(): Promise<void> {
    try {
        // Find and kill all Next.js processes
        const { stdout } = await execAsync("ps aux | grep '[n]ext' | awk '{print $2}'");
        if (stdout.trim()) {
            const pids = stdout.trim().split('\n');
            for (const pid of pids) {
                try {
                    await execAsync(`kill -9 ${pid}`);
                    console.info(chalk.yellow(`Killed Next.js process ${chalk.bold(pid)}`));
                } catch {
                    // Process might be already gone
                }
            }
        }
    } catch {
        // Ignore errors if no process found
    }
}

async function waitForPortToBeFree(port: number, timeout = 5000): Promise<boolean> {
    const start = Date.now();
    while (Date.now() - start < timeout) {
        if (isShuttingDown) return false;
        if (!await isPortInUse(port)) {
            return true;
        }
        await new Promise(resolve => setTimeout(resolve, 100));
    }
    return false;
}

function startServer(command: string, args: string[], cwd: string, name: string, port: number): Promise<void> {
    return new Promise((resolve, reject) => {
        if (isShuttingDown === true) {
            resolve();
            return;
        }

        // Always use root .env file
        const rootEnvPath = join(process.cwd(), '.env');
        console.info(chalk.blue(`[${name}] Using root .env file: ${chalk.cyan(rootEnvPath)}`));

        // Add debug environment variables for frontend
        const customEnv = { 
            ...process.env, 
            FORCE_COLOR: 'true',
            PORT: port.toString(),
            DEBUG: name === 'Frontend' 
                ? 'next:build:*,next:server:*,next:error:*'  // Frontend debug logging
                : 'mcp:*,mcp:*:*,langchain:*,socket:*,agent:*',  // Enhanced Backend debug logging
            DEBUG_COLORS: 'true',
            DEBUG_HIDE_DATE: 'false',
            DEBUG_TIMESTAMP_FORMAT: getTimestampOptions(),
            // Force dotenv to use root .env file
            DOTENV_CONFIG_PATH: rootEnvPath,
            // Force debug to use stdout instead of stderr to prevent [ERROR] labels
            DEBUG_FD: '1',
            // Add explicit LLM/MCP logging flags
            ...(name === 'Backend' ? {
                DEBUG_LLM_INITIALIZATION: 'true',
                DEBUG_MCP_TOOLS: 'true',
                DEBUG_SOCKET_STREAMING: 'true',
                NODE_ENV: 'development', // This will be overridden correctly
                VERBOSE_LOGGING: 'true',
            } : {}),
            ...(name === 'Frontend' ? {
                NEXT_TURBO_DEV_LOG: '1',
                NEXT_TURBO_TRACE: '1',
            } : {})
        };

        // Ensure NODE_ENV is a valid value
        if (customEnv.NODE_ENV && !['development', 'production', 'test'].includes(customEnv.NODE_ENV)) {
            customEnv.NODE_ENV = 'development';
        }

        // Create debug log file for frontend with absolute path
        const debugLogPath = name === 'Frontend' 
            ? join(process.cwd(), 'frontend', 'turbopack-debug.log')
            : null;
        
        const debugLogStream = debugLogPath 
            ? createWriteStream(debugLogPath, { flags: 'a' })
            : null;

        const spawnOptions: SpawnOptions = {
            cwd,
            stdio: ['pipe', 'pipe', 'pipe'],
            shell: true,
            env: customEnv as NodeJS.ProcessEnv // Type assertion here
        };

        const child: ChildProcess = spawn(command, args, spawnOptions);
        
        // Store process reference
        if (name === 'Frontend') {
            frontendProcess = child;
        } else if (name === 'Backend') {
            backendProcess = child;
        }

        let serverStarted = false;
        let errorOutput = '';
        const startTimeout: NodeTimer = setTimeout(() => {
            if (!serverStarted) {
                const prefix = chalk.red(`[${name} ERROR]`);
                console.error(`${prefix} Server start timed out`);
                reject(new Error(`${name} server start timed out`));
            }
        }, name === 'Backend' ? 30000 : 60000); // 30s for backend, 60s for frontend
        
        child.stdout?.on('data', (data: Buffer) => {
            const output = data.toString();
            
            // Better detection of debug messages vs actual errors
            let formattedOutput = output;
            const isMcpDebug = output.includes('mcp:') && !output.includes('Error:') && !output.includes('ERROR:') && !output.includes('Exception:');
            
            if (isMcpDebug) {
                // Format MCP debug messages correctly
                formattedOutput = output.replace(/\[Backend ERROR\]/g, chalk.cyan('[Backend INFO]'));
            }
            
            const prefix = chalk.cyan(`[${name}]`);
            console.info(`${prefix} ${formattedOutput}`);
            
            // Write to debug log if frontend
            if (debugLogStream !== null) {
                debugLogStream.write(`${output}\n`);
            }
            
            // Check for successful server start
            const isBackendReady = name === 'Backend' && typeof output === 'string' && output.includes('Server running on port');
            const isFrontendReady = name === 'Frontend' && typeof output === 'string' && output.includes('Ready in');
            
            if (isBackendReady) {
                // Wait for server to be actually ready
                void waitForServerReady(port).then((ready) => {
                    if (ready === true) {
                        serverStarted = true;
                        if (startTimeout !== null) {
                            clearTimeout(startTimeout);
                        }
                        resolve();
                    }
                });
            } else if (isFrontendReady) {
                serverStarted = true;
                if (startTimeout !== null) {
                    clearTimeout(startTimeout);
                }
                resolve();
            }
        });
        
        child.stderr?.on('data', (data: Buffer) => {
            const error = data.toString();
            
            // Improved handling of debug messages in stderr
            let formattedError = error;
            const isMcpDebug = error.includes('mcp:') && !error.includes('Error:') && !error.includes('ERROR:') && !error.includes('Exception:');
            
            if (isMcpDebug) {
                // This is a debug message incorrectly sent to stderr
                formattedError = error.replace(/\[Backend ERROR\]/g, chalk.cyan('[Backend INFO]'));
                
                // Output to stdout with INFO prefix
                const prefix = chalk.cyan(`[${name} INFO]`);
                console.info(`${prefix} ${formattedError}`);
                
                // Don't proceed to error output
                return;
            }
            
            // Write errors to debug log for frontend
            if (debugLogStream !== null) {
                debugLogStream.write(`ERROR: ${error}\n`);
            }
            
            // Filter out Next.js port warnings
            const hasNoPortWarning = typeof error === 'string' && 
                !error.includes('Port') && 
                !error.includes('trying') && 
                !error.includes('instead');

            if (hasNoPortWarning) {
                const prefix = chalk.red(`[${name} ERROR]`);
                console.error(`${prefix} ${formattedError}`);
                errorOutput += error;
            }
        });
        
        child.on('error', (error: Error) => {
            const prefix = chalk.red(`[${name} ERROR]`);
            console.error(`${prefix} Failed to start:`, error);
            if (debugLogStream !== null) {
                debugLogStream.write(`SPAWN ERROR: ${error.toString()}\n`);
            }
            const shouldReject = !serverStarted;
            if (shouldReject) {
                if (startTimeout !== null) {
                    clearTimeout(startTimeout);
                }
                reject(error);
            }
        });

        child.on('exit', async (code: number | null, signal: string | null) => {
            const prefix = chalk.cyan(`[${name}]`);
            if (code !== null) {
                console.info(`${prefix} Process exited with code ${chalk.yellow(code)}`);
                if (debugLogStream !== null) {
                    debugLogStream.write(`EXIT CODE: ${code}\n`);
                }
            } else if (signal !== null) {
                console.info(`${prefix} Process killed with signal ${chalk.yellow(signal)}`);
                if (debugLogStream !== null) {
                    debugLogStream.write(`EXIT SIGNAL: ${signal}\n`);
                }
            }
            
            if (debugLogStream !== null) {
                debugLogStream.end();
            }
            
            // If the frontend crashes and we're not shutting down, restart it
            if (name === 'Frontend' && !isShuttingDown && !serverStarted) {
                console.warn(chalk.yellow('Frontend server failed to start, retrying...'));
                await new Promise(resolve => setTimeout(resolve, 1000));
                startServer(command, args, cwd, name, port).then(resolve).catch(reject);
            } else if (!serverStarted) {
                const prefix = chalk.red(`[${name} ERROR]`);
                console.error(`${prefix} Failed to start. Error output:`, errorOutput);
                if (startTimeout !== null) {
                    clearTimeout(startTimeout);
                }
                reject(new Error(`${name} server failed to start`));
            }
        });
    });
}

async function cleanup() {
    if (isShuttingDown) return;
    isShuttingDown = true;

    console.log('\n' + createDivider('Shutdown Sequence'));
    console.log(chalk.yellow(`${SYMBOLS.warning} Gracefully shutting down servers...`));
    
    const shutdownStart = Date.now();
    
    // Kill all Next.js processes with status indication
    console.log(chalk.cyan(`${SYMBOLS.bullet} Stopping Next.js processes...`));
    await killAllNextProcesses();
    
    // Kill processes by port with status indication
    console.log(chalk.cyan(`${SYMBOLS.bullet} Stopping backend server on port ${chalk.bold(BACKEND_PORT)}...`));
    await killProcessOnPort(BACKEND_PORT);
    
    console.log(chalk.cyan(`${SYMBOLS.bullet} Stopping frontend server on port ${chalk.bold(FRONTEND_PORT)}...`));
    await killProcessOnPort(FRONTEND_PORT);
    
    // Gracefully terminate stored processes
    if (frontendProcess) {
        console.log(chalk.cyan(`${SYMBOLS.frontend} Sending SIGINT to frontend process...`));
        frontendProcess.kill('SIGINT');
    }
    
    if (backendProcess) {
        console.log(chalk.cyan(`${SYMBOLS.backend} Sending SIGINT to backend process...`));
        backendProcess.kill('SIGINT');
    }
    
    const shutdownTime = Date.now() - shutdownStart;
    console.log(chalk.green(`${SYMBOLS.success} Servers shut down successfully in ${chalk.cyan(formatDuration(shutdownTime))}`));
    console.log(createDivider());
    
    process.exit(0);
}

async function main() {
    if (isShuttingDown) return;
    
    // Display ASCII logo
    console.log(chalk.cyan(ASCII_LOGO));
    console.log(createDivider('Development Server Startup'));
    
    const startTime = Date.now();
    console.log(chalk.magenta.bold(`${SYMBOLS.info} Starting development servers at ${new Date().toLocaleTimeString()}`));

    try {
        // Start Docker stack first
        console.log(createDivider('Docker Infrastructure'));
        console.log(chalk.blue(`${SYMBOLS.docker} Initializing Docker environment...`));
        await startDockerStack();
    } catch {
        console.error(chalk.red(`${SYMBOLS.error} Failed to start Docker stack. Exiting...`));
        process.exit(1);
    }

    console.log(createDivider('Process Management'));
    console.log(chalk.blue(`${SYMBOLS.info} Checking for running servers...`));

    // Kill all Next.js processes first
    console.log(chalk.cyan(`${SYMBOLS.bullet} Stopping any existing Next.js processes...`));
    await killAllNextProcesses();

    // Kill backend server if running
    if (await isPortInUse(BACKEND_PORT)) {
        console.warn(chalk.yellow(`${SYMBOLS.warning} Backend server running on port ${chalk.bold(BACKEND_PORT)}, killing...`));
        await killProcessOnPort(BACKEND_PORT);
    }

    // Kill frontend server if running
    if (await isPortInUse(FRONTEND_PORT)) {
        console.warn(chalk.yellow(`${SYMBOLS.warning} Frontend server running on port ${chalk.bold(FRONTEND_PORT)}, killing...`));
        await killProcessOnPort(FRONTEND_PORT);
    }

    // Wait for backend port to be free
    console.log(chalk.blue(`${SYMBOLS.loading} Waiting for backend port to be free...`));
    const backendPortFree = await waitForPortToBeFree(BACKEND_PORT);
    if (!backendPortFree) {
        console.error(chalk.red(`${SYMBOLS.error} Failed to free backend port ${chalk.bold(BACKEND_PORT)}`));
        process.exit(1);
    }

    // Wait for frontend port to be free
    console.log(chalk.blue(`${SYMBOLS.loading} Waiting for frontend port to be free...`));
    const frontendPortFree = await waitForPortToBeFree(FRONTEND_PORT);
    if (!frontendPortFree) {
        console.error(chalk.red(`${SYMBOLS.error} Failed to free frontend port ${chalk.bold(FRONTEND_PORT)}`));
        process.exit(1);
    }

    console.log(chalk.green(`${SYMBOLS.success} All ports are free, starting servers...`));

    console.log(createDivider('Environment Configuration'));
    
    // Get root directory
    const rootDir = process.cwd();
    const backendDir = join(rootDir, 'backend');
    const frontendDir = join(rootDir, 'frontend');

    // Check for competing .env files
    const rootEnvPath = join(rootDir, '.env');
    const backendEnvPath = join(backendDir, '.env');
    const frontendEnvPath = join(frontendDir, '.env');

    if (!existsSync(rootEnvPath)) {
        console.error(chalk.red(`${SYMBOLS.error} Error: Root .env file not found at ${chalk.bold(rootEnvPath)}`));
        console.error(chalk.red(`${SYMBOLS.arrow} Please create a .env file at the project root with all environment variables.`));
        process.exit(1);
    }

    // Check for competing .env files and remove them if they exist
    if (existsSync(backendEnvPath)) {
        console.warn(chalk.yellow(`${SYMBOLS.warning} Competing .env file found in backend directory.`));
        console.warn(chalk.yellow(`${SYMBOLS.arrow} Please remove ${chalk.bold(backendEnvPath)} and only use the root .env file.`));
    }

    if (existsSync(frontendEnvPath)) {
        console.warn(chalk.yellow(`${SYMBOLS.warning} Competing .env file found in frontend directory.`));
        console.warn(chalk.yellow(`${SYMBOLS.arrow} Please remove ${chalk.bold(frontendEnvPath)} and only use the root .env file.`));
    }

    console.log(chalk.blue(`${SYMBOLS.info} Using root .env file as single source of truth:`));
    console.log(chalk.blue(`   ${SYMBOLS.arrow} ${chalk.cyan(rootEnvPath)}`));

    console.log(createDivider('Starting Servers'));
    
    try {
        // Start backend server
        console.log(chalk.blue(`${SYMBOLS.backend} Starting backend server on port ${chalk.bold(BACKEND_PORT)}...`));
        const backendStartTime = Date.now();
        await startServer('pnpm', ['run', 'dev'], backendDir, 'Backend', BACKEND_PORT);
        console.log(chalk.green(`${SYMBOLS.success} Backend server started successfully in ${chalk.cyan(formatDuration(Date.now() - backendStartTime))}`));

        // Wait a bit for backend to initialize
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Start frontend server
        console.log(chalk.blue(`${SYMBOLS.frontend} Starting frontend server on port ${chalk.bold(FRONTEND_PORT)}...`));
        const frontendStartTime = Date.now();
        await startServer('pnpm', ['run', 'dev'], frontendDir, 'Frontend', FRONTEND_PORT);
        console.log(chalk.green(`${SYMBOLS.success} Frontend server started successfully in ${chalk.cyan(formatDuration(Date.now() - frontendStartTime))}`));

        const totalTime = Date.now() - startTime;
        
        // Wait a bit for MCP servers to initialize
        console.log(chalk.blue(`${SYMBOLS.loading} Waiting for MCP servers to initialize...`));
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Fetch MCP server status
        try {
            console.log(chalk.blue(`${SYMBOLS.info} Checking MCP server status...`));
            
            // Fetch servers
            const serversResponse = await fetch(`http://localhost:${BACKEND_PORT}/api/mcp/servers`);
            const serversData = await serversResponse.json();

            // Extract servers array from the response
            const servers = serversData.servers || [];
            
            // Count connected servers
            let connectedServers = 0;
            for (const server of servers) {
                if (server.status === 'connected' || server.status === 'active') {
                    connectedServers++;
                }
            }
            
            // Fetch tools separately
            const toolsResponse = await fetch(`http://localhost:${BACKEND_PORT}/api/mcp/tools`);
            const toolsData = await toolsResponse.json();
            
            // Extract tools array from the response
            const tools = toolsData.tools || [];
            const totalTools = tools.length;
            
            // Group tools by server for detailed display
            const toolsByServer = tools.reduce((acc: Record<string, number>, tool: any) => {
                const serverId = tool.serverId;
                if (serverId) {
                    acc[serverId] = (acc[serverId] || 0) + 1;
                }
                return acc;
            }, {});
            
            // Display MCP server and tool information
            console.log(chalk.green(`${SYMBOLS.success} ${connectedServers} of ${servers.length} MCP servers connected`));
            console.log(chalk.green(`${SYMBOLS.success} ${totalTools} tools available across all MCP servers`));
            
        } catch (error) {
            console.warn(chalk.yellow(`${SYMBOLS.warning} Could not fetch MCP server status: ${error}`));
        }
        
        console.log(createDivider('Startup Complete'));
        console.log(chalk.green.bold(`${SYMBOLS.success} All servers started successfully in ${chalk.cyan(formatDuration(totalTime))}!`));
        console.log(chalk.cyan(`${SYMBOLS.info} Backend URL: ${chalk.bold(`http://localhost:${BACKEND_PORT}`)}`));
        console.log(chalk.cyan(`${SYMBOLS.info} Frontend URL: ${chalk.bold(`http://localhost:${FRONTEND_PORT}`)}`));
        console.log(chalk.gray(`Press Ctrl+C to stop all servers`));
        console.log(chalk.gray(`Use the API at ${chalk.bold(`http://localhost:${BACKEND_PORT}/api/mcp/servers`)} to view detailed MCP server status`));
        console.log(createDivider());
    } catch (error) {
        console.error(chalk.red(`${SYMBOLS.error} Error starting servers:`), error);
        await cleanup();
        process.exit(1);
    }
}

// Clean up on various signals
process.on('SIGINT', () => {
    console.info(chalk.yellow('Received SIGINT, cleaning up...'));
    void cleanup();
});
process.on('SIGTERM', () => { void cleanup(); });
process.on('SIGHUP', () => { void cleanup(); });

// Handle errors with void operator
process.on('unhandledRejection', (error) => {
    console.error(chalk.red('Unhandled rejection:'), error);
    void cleanup();
});

void main().catch((error) => {
    console.error(chalk.red('Failed to start servers:'), error);
    void cleanup();
});
