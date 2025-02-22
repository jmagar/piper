#!/usr/bin/env node

import { execSync } from 'child_process';
import { rm } from 'fs/promises';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

import chalk from 'chalk';

// Get the directory name in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');
const frontendDir = join(rootDir, 'frontend');
const backendDir = join(rootDir, 'backend');

// Directories to clean
const CLEAN_DIRS = [
  '.next',
  '.turbo',
  'node_modules',
  'dist',
  'build',
  'coverage',
  '.coverage',
  'lib/generated',
  'src/generated'
];

async function removeDir(path: string, name: string) {
  try {
    await rm(path, { recursive: true, force: true });
    console.log(chalk.green(`✓ Cleaned ${name}`));
  } catch (err) {
    // Only log if directory exists but couldn't be removed
    if ((err as { code?: string }).code !== 'ENOENT') {
      console.error(chalk.red(`✗ Failed to remove ${name}:`), err);
      throw err;
    }
  }
}

async function main() {
  try {
    console.log(chalk.blue('\n🧹 Cleaning project...\n'));

    for (const dir of CLEAN_DIRS) {
      await removeDir(join(rootDir, dir), dir);
      await removeDir(join(frontendDir, dir), `frontend/${dir}`);
      await removeDir(join(backendDir, dir), `backend/${dir}`);
    }

    // Clean global turbo cache
    try {
      console.log(chalk.blue('\n🧹 Cleaning turbo cache...\n'));
      execSync('turbo clean', { stdio: 'inherit' });
    } catch (err) {
      console.error(chalk.yellow('⚠️ Failed to clean turbo cache:'), err);
      // Don't fail the whole clean if turbo clean fails
    }

    // Reinstall dependencies
    console.log(chalk.blue('\n📦 Installing dependencies...\n'));

    try {
      // Install root dependencies
      console.log(chalk.blue('Installing root dependencies...'));
      execSync('pnpm install', { stdio: 'inherit', cwd: rootDir });
      console.log(chalk.green('✓ Root dependencies installed\n'));

      // Install frontend dependencies
      console.log(chalk.blue('Installing frontend dependencies...'));
      execSync('pnpm install', { stdio: 'inherit', cwd: frontendDir });
      console.log(chalk.green('✓ Frontend dependencies installed\n'));

      // Install backend dependencies
      console.log(chalk.blue('Installing backend dependencies...'));
      execSync('pnpm install', { stdio: 'inherit', cwd: backendDir });
      console.log(chalk.green('✓ Backend dependencies installed\n'));

      // Generate API clients
      console.log(chalk.blue('Generating API clients...'));
      execSync('pnpm generate', { stdio: 'inherit', cwd: frontendDir });
      execSync('pnpm generate', { stdio: 'inherit', cwd: backendDir });
      console.log(chalk.green('✓ API clients generated\n'));

    } catch (err) {
      console.error(chalk.red('\n❌ Failed to install dependencies:'), err);
      throw err;
    }

    console.log(chalk.green('\n✨ All clean!\n'));
  } catch (err) {
    console.error(chalk.red('\n❌ Failed to clean project:'), err);
    throw err;
  }
}

void main().catch(() => {
  process.exit(1);
});