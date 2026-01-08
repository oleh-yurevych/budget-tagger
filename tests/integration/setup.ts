/**
 * Integration test setup for LocalStack
 * Sets environment variables and AWS credentials for integration tests
 */

// Set environment variables before any imports
process.env.TELEGRAM_QUEUE_URL = process.env.TELEGRAM_QUEUE_URL || 'http://localhost:4566/000000000000/TelegramQueue';
process.env.TELEGRAM_SECRET_NAME = process.env.TELEGRAM_SECRET_NAME || 'telegram/bot-token';
process.env.REGION = process.env.REGION || 'us-east-1';
process.env.STAGE = process.env.STAGE || 'test';
process.env.LOG_LEVEL = process.env.LOG_LEVEL || 'error';

// Mock AWS credentials for LocalStack
process.env.AWS_ACCESS_KEY_ID = 'test';
process.env.AWS_SECRET_ACCESS_KEY = 'test';

// Disable AWS SDK retries for faster tests
process.env.AWS_MAX_ATTEMPTS = '1';
