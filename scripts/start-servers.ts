#!/usr/bin/env node

/* eslint-env node */
/* global setTimeout clearTimeout */

/// <reference lib="dom" />
/// <reference types="node" />

// Node.js built-in imports
import { spawn, exec } from 'child_process';
import { createWriteStream } from 'fs';
import http from 'http';
import { join } from 'path';
import { promisify } from 'util';

// Third-party imports
import chalk from 'chalk';

// Types
type NodeTimer = ReturnType<typeof setTimeout>;

const execAsync = promisify(exec);

const BACKEND_PORT = 4100;
const FRONTEND_PORT = 3002;
const DOCKER_CONTAINERS = ['pooper-redis', 'pooper-db'];
const DOCKER_NETWORK = 'jakenet';

let isShuttingDown = false;
let frontendProcess: ReturnType<typeof spawn> | null = null;
let backendProcess: ReturnType<typeof spawn> | null = null;

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
            await createDockerNetwork();
        }

        // Check if containers are running
        const containersRunning = await Promise.all(
            DOCKER_CONTAINERS.map(async container => ({
                name: container,
                running: await isContainerRunning(container)
            }))
        );

        const allRunning = containersRunning.every(c => c.running);
        if (!allRunning) {
            console.info(chalk.blue('Starting Docker stack...'));
            await execAsync('docker compose up -d');

            // Wait for containers to be healthy
            console.info(chalk.blue('Waiting for containers to be healthy...'));
            const healthyResults = await Promise.all(
                DOCKER_CONTAINERS.map(container => waitForContainerHealth(container))
            );

            if (!healthyResults.every(healthy => healthy)) {
                throw new Error('Some containers failed to become healthy');
            }
        } else {
            console.info(chalk.green('Docker containers are already running'));
        }
    } catch (error) {
        console.error(chalk.red('Failed to start Docker stack:'), error);
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

        // Add debug environment variables for frontend
        const env = { 
            ...process.env, 
            FORCE_COLOR: 'true',
            PORT: port.toString(),
            DEBUG: name === 'Frontend' 
                ? 'next:build:*,next:server:*,next:error:*'  // Frontend debug logging
                : 'mcp:*,mcp:*:*',  // Backend debug logging for MCP
            ...(name === 'Frontend' ? {
                NEXT_TURBO_DEV_LOG: '1',
                NEXT_TURBO_TRACE: '1',
            } : {})
        };

        // Create debug log file for frontend with absolute path
        const debugLogPath = name === 'Frontend' 
            ? join(process.cwd(), 'frontend', 'turbopack-debug.log')
            : null;
        
        const debugLogStream = debugLogPath 
            ? createWriteStream(debugLogPath, { flags: 'a' })
            : null;

        const child = spawn(command, args, {
            cwd,
            stdio: ['pipe', 'pipe', 'pipe'],
            shell: true,
            env
        });
        
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
        
        child.stdout?.on('data', (data) => {
            const output = data.toString();
            const prefix = chalk.cyan(`[${name}]`);
            console.info(`${prefix} ${output}`);
            
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
        
        child.stderr?.on('data', (data) => {
            const error = data.toString();
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
                console.error(`${prefix} ${error}`);
                errorOutput += error;
            }
        });
        
        child.on('error', (error) => {
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

        child.on('exit', async (code, signal) => {
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

    console.info(chalk.yellow('\nGracefully shutting down...'));
    
    // Kill all Next.js processes
    await killAllNextProcesses();
    
    // Kill processes by port
    await killProcessOnPort(BACKEND_PORT);
    await killProcessOnPort(FRONTEND_PORT);
    
    // Gracefully terminate stored processes
    if (frontendProcess) {
        frontendProcess.kill('SIGINT');
    }
    if (backendProcess) {
        backendProcess.kill('SIGINT');
    }
    
    process.exit(0);
}

async function main() {
    if (isShuttingDown) return;

    try {
        // Start Docker stack first
        await startDockerStack();
    } catch {
        console.error(chalk.red('Failed to start Docker stack. Exiting...'));
        process.exit(1);
    }

    console.info(chalk.blue('Checking for running servers...'));

    // Kill all Next.js processes first
    await killAllNextProcesses();

    // Kill backend server if running
    if (await isPortInUse(BACKEND_PORT)) {
        console.warn(chalk.yellow(`Backend server running on port ${chalk.bold(BACKEND_PORT)}, killing...`));
        await killProcessOnPort(BACKEND_PORT);
    }

    // Kill frontend server if running
    if (await isPortInUse(FRONTEND_PORT)) {
        console.warn(chalk.yellow(`Frontend server running on port ${chalk.bold(FRONTEND_PORT)}, killing...`));
        await killProcessOnPort(FRONTEND_PORT);
    }

    // Wait for backend port to be free
    console.info(chalk.blue('Waiting for backend port to be free...'));
    const backendPortFree = await waitForPortToBeFree(BACKEND_PORT);
    if (!backendPortFree) {
        console.error(chalk.red(`Failed to free backend port ${chalk.bold(BACKEND_PORT)}`));
        process.exit(1);
    }

    // Wait for frontend port to be free
    console.info(chalk.blue('Waiting for frontend port to be free...'));
    const frontendPortFree = await waitForPortToBeFree(FRONTEND_PORT);
    if (!frontendPortFree) {
        console.error(chalk.red(`Failed to free frontend port ${chalk.bold(FRONTEND_PORT)}`));
        process.exit(1);
    }

    console.info(chalk.green('All ports are free, starting servers...'));

    // Get root directory
    const rootDir = process.cwd();
    const backendDir = join(rootDir, 'backend');
    const frontendDir = join(rootDir, 'frontend');

    try {
        // Start backend server
        console.info(chalk.blue('Starting backend server...'));
        await startServer('pnpm', ['run', 'dev'], backendDir, 'Backend', BACKEND_PORT);

        // Wait a bit for backend to initialize
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Start frontend server
        console.info(chalk.blue('Starting frontend server...'));
        await startServer('pnpm', ['run', 'dev'], frontendDir, 'Frontend', FRONTEND_PORT);

        console.info(chalk.green.bold('Both servers started successfully!'));
    } catch (error) {
        console.error(chalk.red('Error starting servers:'), error);
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