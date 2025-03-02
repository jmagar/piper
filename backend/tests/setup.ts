// Test setup file for Vitest
import { beforeAll, afterAll, afterEach, vi } from 'vitest';
import { setupServer } from 'msw/node';

// Extend expect with DOM matchers
import '@testing-library/jest-dom';

// Create an empty mock service worker server
export const server = setupServer();

beforeAll(() => {
  // Enable the MSW server before tests
  server.listen({ onUnhandledRequest: 'error' });
  
  // Mock environment variables instead of directly modifying process.env
  vi.stubEnv('NODE_ENV', 'test');
});

afterEach(() => {
  // Reset any mocks and handlers after each test
  vi.restoreAllMocks();
  server.resetHandlers();
});

afterAll(() => {
  // Clean up after all tests are done
  server.close();
  vi.unstubAllEnvs();
});

// Add global vitest mocks
vi.mock('@prisma/client', async () => {
  const actual = await vi.importActual('@prisma/client');
  return {
    ...actual,
    PrismaClient: vi.fn().mockImplementation(() => ({
      $connect: vi.fn(),
      $disconnect: vi.fn(),
      user: {
        findUnique: vi.fn(),
        create: vi.fn(),
        upsert: vi.fn(),
        update: vi.fn(),
      },
      conversation: {
        create: vi.fn(),
        findUnique: vi.fn(),
        update: vi.fn(),
        findMany: vi.fn(),
      },
      chatMessage: {
        create: vi.fn(),
        update: vi.fn(),
        findMany: vi.fn(),
      },
      socketEvent: {
        create: vi.fn(),
      },
      // Add other models as needed
    })),
  };
});

// Mock debug to prevent console output during tests
vi.mock('debug', () => {
  return {
    default: () => vi.fn(),
  };
}); 