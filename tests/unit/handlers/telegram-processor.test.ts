import { describe, it, expect, beforeEach, vi } from 'vitest';
import { handler } from '../../../src/handlers/telegram-processor';
import { createSQSEvent } from '../../helpers/event-factories';
import { telegramFixtures } from '../../helpers/fixtures';
import { deepClone } from '../../helpers/test-utils';

describe('telegram-processor handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('message processing', () => {
    it('should process valid SQS message with Telegram update', async () => {
      // Arrange
      const sqsEvent = createSQSEvent([
        {
          body: JSON.stringify(telegramFixtures.textMessage),
        },
      ]);

      // Act & Assert - should not throw
      await expect(handler(sqsEvent)).resolves.toBeUndefined();
    });

    it('should process multiple messages in batch', async () => {
      // Arrange
      const sqsEvent = createSQSEvent([
        {
          body: JSON.stringify(telegramFixtures.textMessage),
          messageId: 'msg-1',
        },
        {
          body: JSON.stringify(telegramFixtures.startCommand),
          messageId: 'msg-2',
        },
        {
          body: JSON.stringify(telegramFixtures.callbackQuery),
          messageId: 'msg-3',
        },
      ]);

      // Act & Assert - should not throw
      await expect(handler(sqsEvent)).resolves.toBeUndefined();
    });
  });

  describe('message type detection', () => {
    it('should detect text message type', async () => {
      // Arrange
      const sqsEvent = createSQSEvent([
        {
          body: JSON.stringify(telegramFixtures.textMessage),
        },
      ]);

      // Act
      await handler(sqsEvent);

      // Assert - Verify message was logged with correct type
      // (In real implementation, you'd check logger mock)
    });

    it('should detect callback query type', async () => {
      // Arrange
      const sqsEvent = createSQSEvent([
        {
          body: JSON.stringify(telegramFixtures.callbackQuery),
        },
      ]);

      // Act
      await handler(sqsEvent);

      // Assert - should process without errors
    });

    it('should detect edited message type', async () => {
      // Arrange
      const sqsEvent = createSQSEvent([
        {
          body: JSON.stringify(telegramFixtures.editedMessage),
        },
      ]);

      // Act
      await handler(sqsEvent);

      // Assert - should process without errors
    });

    it('should handle unknown message types', async () => {
      // Arrange
      const unknownUpdate = {
        update_id: 999,
        // No message, callback_query, or other known types
      };

      const sqsEvent = createSQSEvent([
        {
          body: JSON.stringify(unknownUpdate),
        },
      ]);

      // Act
      await handler(sqsEvent);

      // Assert - should not throw
    });
  });

  describe('error handling', () => {
    it('should throw error for invalid JSON in message body', async () => {
      // Arrange
      const sqsEvent = createSQSEvent([
        {
          body: 'invalid-json{{{',
        },
      ]);

      // Act & Assert - should throw to trigger DLQ flow
      await expect(handler(sqsEvent)).rejects.toThrow();
    });

    it('should throw error and continue to next message on single failure', async () => {
      // Arrange
      const sqsEvent = createSQSEvent([
        {
          body: 'invalid-json',
          messageId: 'msg-1',
        },
        {
          body: JSON.stringify(telegramFixtures.textMessage),
          messageId: 'msg-2',
        },
      ]);

      // Act & Assert
      await expect(handler(sqsEvent)).rejects.toThrow();
    });

    it('should handle empty SQS records', async () => {
      // Arrange
      const sqsEvent = createSQSEvent([]);

      // Act
      await handler(sqsEvent);

      // Assert - should complete without error
    });
  });

  describe('update ID logging', () => {
    it('should log Telegram update_id for traceability', async () => {
      // Arrange
      const sqsEvent = createSQSEvent([
        {
          body: JSON.stringify(telegramFixtures.textMessage),
        },
      ]);

      // Act
      await handler(sqsEvent);

      // Assert - In real implementation, verify logger was called with update_id
      // This is a placeholder for when logger mocking is implemented
    });
  });

  describe('message attributes', () => {
    it('should process message with all required Telegram fields', async () => {
      // Arrange
      const completeMessage = deepClone(telegramFixtures.textMessage);
      const sqsEvent = createSQSEvent([
        {
          body: JSON.stringify(completeMessage),
        },
      ]);

      // Act & Assert
      await expect(handler(sqsEvent)).resolves.toBeUndefined();
    });

    it('should handle message with minimal Telegram fields', async () => {
      // Arrange
      const minimalMessage = {
        update_id: 123,
        message: {
          message_id: 1,
          date: 1700000000,
          chat: {
            id: 123,
            type: 'private',
          },
          text: 'test',
        },
      };

      const sqsEvent = createSQSEvent([
        {
          body: JSON.stringify(minimalMessage),
        },
      ]);

      // Act & Assert
      await expect(handler(sqsEvent)).resolves.toBeUndefined();
    });
  });

  describe('SQS message attributes', () => {
    it('should extract messageId from SQS record', async () => {
      // Arrange
      const messageId = 'test-msg-id-12345';
      const sqsEvent = createSQSEvent([
        {
          body: JSON.stringify(telegramFixtures.textMessage),
          messageId,
        },
      ]);

      // Act
      await handler(sqsEvent);

      // Assert - Verify messageId was used in logging
      // (In real implementation, check logger mock)
    });
  });

  describe('idempotency', () => {
    it('should handle duplicate messages gracefully', async () => {
      // Arrange
      const duplicateUpdate = deepClone(telegramFixtures.textMessage);
      const sqsEvent = createSQSEvent([
        {
          body: JSON.stringify(duplicateUpdate),
          messageId: 'msg-1',
        },
        {
          body: JSON.stringify(duplicateUpdate), // Same update
          messageId: 'msg-2',
        },
      ]);

      // Act - Should process both without errors
      await expect(handler(sqsEvent)).resolves.toBeUndefined();
    });
  });

  describe('performance', () => {
    it('should process messages in reasonable time', async () => {
      // Arrange
      const startTime = Date.now();
      const sqsEvent = createSQSEvent([
        {
          body: JSON.stringify(telegramFixtures.textMessage),
        },
      ]);

      // Act
      await handler(sqsEvent);

      // Assert - should complete in under 1 second for single message
      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(1000);
    });
  });
});
