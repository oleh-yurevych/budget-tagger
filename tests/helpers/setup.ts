import { beforeEach, afterEach, vi } from 'vitest';

// Setup environment variables BEFORE any imports that use them
// This runs at module load time, not just before each test
process.env.TELEGRAM_QUEUE_URL = 'https://sqs.us-east-1.amazonaws.com/123456789/test-queue';
process.env.TELEGRAM_SECRET_HEADER = 'X-Telegram-Bot-Api-Secret-Token';
process.env.TELEGRAM_SECRET_NAME = 'test-telegram-secret';
process.env.REGION = 'us-east-1';
process.env.STAGE = 'test';
process.env.LOG_LEVEL = 'error'; // Reduce noise in tests

beforeEach(() => {
  // Ensure environment variables are set for each test
  process.env.TELEGRAM_QUEUE_URL = 'https://sqs.us-east-1.amazonaws.com/123456789/test-queue';
  process.env.TELEGRAM_SECRET_HEADER = 'X-Telegram-Bot-Api-Secret-Token';
  process.env.TELEGRAM_SECRET_NAME = 'test-telegram-secret';
  process.env.REGION = 'us-east-1';
  process.env.STAGE = 'test';
  process.env.LOG_LEVEL = 'error';
});

afterEach(() => {
  // Clear all mocks after each test
  vi.clearAllMocks();
  vi.restoreAllMocks();
});
