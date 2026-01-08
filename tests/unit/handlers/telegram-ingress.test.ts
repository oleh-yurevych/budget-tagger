import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mockClient } from 'aws-sdk-client-mock';
import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';
import { handler } from '../../../src/handlers/telegram-ingress';
import { createAPIGatewayEvent } from '../../helpers/event-factories';
import { telegramFixtures, secretsFixtures } from '../../helpers/fixtures';
import { clearSecretCache } from '../../../src/shared/secrets';

// Create mocks for AWS SDK clients
const sqsMock = mockClient(SQSClient);
const secretsMock = mockClient(SecretsManagerClient);

describe('telegram-ingress handler', () => {
  beforeEach(() => {
    // Reset all mocks before each test
    sqsMock.reset();
    secretsMock.reset();

    // Mock Secrets Manager to return valid secret
    secretsMock.on(GetSecretValueCommand).resolves({
      SecretString: 'test-secret-token',
    });
  });

  describe('when webhook is valid', () => {
    it('should accept valid webhook with correct secret token and send to SQS', async () => {
      // Arrange
      sqsMock.on(SendMessageCommand).resolves({
        MessageId: 'test-message-id-123',
      });

      const event = createAPIGatewayEvent({
        body: JSON.stringify(telegramFixtures.textMessage),
        headers: {
          'X-Telegram-Bot-Api-Secret-Token': 'test-secret-token',
        },
      });

      // Act
      const result = await handler(event);

      // Assert
      expect(result.statusCode).toBe(200);
      expect(JSON.parse(result.body)).toEqual({ message: 'OK' });
      
      // Verify SQS was called once
      expect(sqsMock.calls()).toHaveLength(1);
      
      // Verify the message body sent to SQS
      const sqsCall = sqsMock.call(0).args[0];
      expect(sqsCall.input).toMatchObject({
        QueueUrl: process.env.TELEGRAM_QUEUE_URL,
        MessageBody: JSON.stringify(telegramFixtures.textMessage),
      });
    });

    it('should handle different types of Telegram updates', async () => {
      // Arrange
      sqsMock.on(SendMessageCommand).resolves({
        MessageId: 'test-message-id-456',
      });

      const event = createAPIGatewayEvent({
        body: JSON.stringify(telegramFixtures.callbackQuery),
        headers: {
          'X-Telegram-Bot-Api-Secret-Token': 'test-secret-token',
        },
      });

      // Act
      const result = await handler(event);

      // Assert
      expect(result.statusCode).toBe(200);
      expect(sqsMock.calls()).toHaveLength(1);
    });
  });

  describe('when secret token is invalid', () => {
    it('should return 401 when secret token is missing', async () => {
      // Arrange
      const event = createAPIGatewayEvent({
        body: JSON.stringify(telegramFixtures.textMessage),
        headers: {}, // No secret token
      });

      // Act
      const result = await handler(event);

      // Assert
      expect(result.statusCode).toBe(401);
      expect(sqsMock.calls()).toHaveLength(0); // SQS should not be called
    });

    it('should return 401 when secret token does not match', async () => {
      // Arrange
      const event = createAPIGatewayEvent({
        body: JSON.stringify(telegramFixtures.textMessage),
        headers: {
          'X-Telegram-Bot-Api-Secret-Token': 'wrong-token',
        },
      });

      // Act
      const result = await handler(event);

      // Assert
      expect(result.statusCode).toBe(401);
      expect(sqsMock.calls()).toHaveLength(0);
    });
  });

  describe('when request body is invalid', () => {
    it('should return 400 when body is missing', async () => {
      // Arrange
      const event = createAPIGatewayEvent({
        body: null,
        headers: {
          'X-Telegram-Bot-Api-Secret-Token': 'test-secret-token',
        },
      });

      // Act
      const result = await handler(event);

      // Assert
      expect(result.statusCode).toBe(400);
      expect(sqsMock.calls()).toHaveLength(0);
    });

    it('should return 400 when body is empty string', async () => {
      // Arrange
      const event = createAPIGatewayEvent({
        body: '',
        headers: {
          'X-Telegram-Bot-Api-Secret-Token': 'test-secret-token',
        },
      });

      // Act
      const result = await handler(event);

      // Assert
      expect(result.statusCode).toBe(400);
      expect(sqsMock.calls()).toHaveLength(0);
    });
  });

  describe('when SQS fails', () => {
    it('should return 500 when SQS send fails', async () => {
      // Arrange
      sqsMock.on(SendMessageCommand).rejects(new Error('SQS service unavailable'));

      const event = createAPIGatewayEvent({
        body: JSON.stringify(telegramFixtures.textMessage),
        headers: {
          'X-Telegram-Bot-Api-Secret-Token': 'test-secret-token',
        },
      });

      // Act
      const result = await handler(event);

      // Assert
      expect(result.statusCode).toBe(500);
      expect(sqsMock.calls()).toHaveLength(1); // Attempted to call SQS
    });

    it('should return 500 when SQS returns throttling error', async () => {
      // Arrange
      const throttlingError = new Error('Throttling');
      throttlingError.name = 'ThrottlingException';
      sqsMock.on(SendMessageCommand).rejects(throttlingError);

      const event = createAPIGatewayEvent({
        body: JSON.stringify(telegramFixtures.textMessage),
        headers: {
          'X-Telegram-Bot-Api-Secret-Token': 'test-secret-token',
        },
      });

      // Act
      const result = await handler(event);

      // Assert
      expect(result.statusCode).toBe(500);
    });
  });

  describe('when Secrets Manager fails', () => {
    it('should return 500 when secret cannot be retrieved', async () => {
      // Arrange: Clear cache and mock Secrets Manager to fail
      clearSecretCache();
      secretsMock.reset();
      secretsMock.on(GetSecretValueCommand).rejects(new Error('Secret not found'));

      const event = createAPIGatewayEvent({
        body: JSON.stringify(telegramFixtures.textMessage),
        headers: {
          'X-Telegram-Bot-Api-Secret-Token': 'test-secret-token',
        },
      });

      // Act
      const result = await handler(event);

      // Assert
      // AWS Secrets Manager failure is an internal server error (500)
      expect(result.statusCode).toBe(500);
      expect(sqsMock.calls()).toHaveLength(0); // Should not send to SQS
      
      // Verify Secrets Manager was actually called
      expect(secretsMock.calls()).toHaveLength(1);
      
      // Verify error message indicates AWS service failure
      const body = JSON.parse(result.body);
      expect(body.error).toContain('Failed to fetch Telegram secret');
    });
  });

  describe('response format', () => {
    it('should return proper API Gateway response structure', async () => {
      // Arrange
      sqsMock.on(SendMessageCommand).resolves({
        MessageId: 'test-message-id',
      });

      const event = createAPIGatewayEvent({
        body: JSON.stringify(telegramFixtures.textMessage),
        headers: {
          'X-Telegram-Bot-Api-Secret-Token': 'test-secret-token',
        },
      });

      // Act
      const result = await handler(event);

      // Assert
      expect(result).toHaveProperty('statusCode');
      expect(result).toHaveProperty('body');
      expect(typeof result.body).toBe('string');
      expect(() => JSON.parse(result.body)).not.toThrow();
    });
  });

  describe('logging', () => {
    it('should not expose sensitive data in logs', async () => {
      // Arrange
      const logSpy = vi.spyOn(console, 'log');
      sqsMock.on(SendMessageCommand).resolves({
        MessageId: 'test-message-id',
      });

      const event = createAPIGatewayEvent({
        body: JSON.stringify(telegramFixtures.textMessage),
        headers: {
          'X-Telegram-Bot-Api-Secret-Token': 'test-secret-token',
        },
      });

      // Act
      await handler(event);

      // Assert - verify secret token is not logged
      const logs = logSpy.mock.calls.map((call) => JSON.stringify(call));
      const hasSecretInLogs = logs.some((log) => log.includes('test-secret-token'));
      expect(hasSecretInLogs).toBe(false);

      logSpy.mockRestore();
    });
  });
});
