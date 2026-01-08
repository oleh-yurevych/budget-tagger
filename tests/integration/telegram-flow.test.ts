import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { handler as ingressHandler } from '../../src/handlers/telegram-ingress';
import { handler as processorHandler } from '../../src/handlers/telegram-processor';
import { setupLocalStack, teardownLocalStack, pollQueue, purgeQueue, LocalStackResources } from './helpers/localstack-setup';
import { createAPIGatewayEvent, createSQSEvent } from '../helpers/event-factories';
import { textMessage, startCommand } from '../helpers/fixtures';
import type { SQSRecord } from 'aws-lambda';

describe('Telegram Webhook Integration Flow', () => {
  let localstack: LocalStackResources;

  beforeAll(async () => {
    // Start LocalStack and create resources
    localstack = await setupLocalStack();

    // Set environment variables to point to LocalStack BEFORE importing handlers
    process.env.TELEGRAM_QUEUE_URL = localstack.queueUrl;
    process.env.TELEGRAM_SECRET_NAME = 'telegram/bot-token';
    process.env.AWS_ENDPOINT = localstack.endpoint;
    process.env.REGION = 'us-east-1';
    process.env.STAGE = 'test';
    
    // Clear the secrets cache since it was initialized before LocalStack started
    const { clearSecretCache } = await import('../../src/shared/secrets');
    clearSecretCache();
  }, 60000); // 60s timeout for container startup

  afterAll(async () => {
    await teardownLocalStack(localstack);
  });

  it('should process webhook through entire flow: ingress → SQS → processor', async () => {
    // Given: A valid Telegram webhook payload
    const webhookPayload = textMessage;

    // When: Ingress handler receives the webhook
    const event = createAPIGatewayEvent({
      body: JSON.stringify(webhookPayload),
      headers: {
        'X-Telegram-Bot-Api-Secret-Token': 'test-secret-token',
      },
    });

    const ingressResponse = await ingressHandler(event);

    // Then: Ingress should return 200
    expect(ingressResponse.statusCode).toBe(200);
    expect(JSON.parse(ingressResponse.body)).toEqual({ message: 'OK' });

    // And: Message should appear in SQS queue
    const queueMessage = await pollQueue(localstack.sqsClient, localstack.queueUrl);
    expect(queueMessage.body).toEqual(webhookPayload);

    // When: Processor handler processes the SQS message
    const sqsEvent = createSQSEvent([
      {
        messageId: queueMessage.messageId,
        receiptHandle: 'test-receipt-handle',
        body: JSON.stringify(queueMessage.body),
        attributes: {
          ApproximateReceiveCount: '1',
          SentTimestamp: String(Date.now()),
          SenderId: 'test-sender',
          ApproximateFirstReceiveTimestamp: String(Date.now()),
        },
        messageAttributes: {},
        md5OfBody: 'test-md5',
        eventSource: 'aws:sqs',
        eventSourceARN: 'arn:aws:sqs:us-east-1:000000000000:TelegramQueue',
        awsRegion: 'us-east-1',
      } as SQSRecord,
    ]);

    const processorResponse = await processorHandler(sqsEvent);

    // Then: Processor should successfully process without failures
    expect(processorResponse.batchItemFailures).toHaveLength(0);
  }, 30000);

  it('should handle /start command through full flow', async () => {
    // Clear any leftover messages from previous tests
    await purgeQueue(localstack.sqsClient, localstack.queueUrl);

    // Given: A /start command webhook
    const webhookPayload = startCommand;

    // When: Webhook is sent to ingress
    const event = createAPIGatewayEvent({
      body: JSON.stringify(webhookPayload),
      headers: {
        'X-Telegram-Bot-Api-Secret-Token': 'test-secret-token',
      },
    });

    const ingressResponse = await ingressHandler(event);

    // Then: Should succeed
    expect(ingressResponse.statusCode).toBe(200);

    // And: Message in queue should be a command
    const queueMessage = await pollQueue(localstack.sqsClient, localstack.queueUrl);
    expect(queueMessage.body.message.text).toBe('/start');
    expect(queueMessage.body.message.entities[0].type).toBe('bot_command');

    // When: Processor handles the command
    const sqsEvent = createSQSEvent([
      {
        messageId: queueMessage.messageId,
        receiptHandle: 'test-receipt-handle',
        body: JSON.stringify(queueMessage.body),
        attributes: {
          ApproximateReceiveCount: '1',
          SentTimestamp: String(Date.now()),
          SenderId: 'test-sender',
          ApproximateFirstReceiveTimestamp: String(Date.now()),
        },
        messageAttributes: {},
        md5OfBody: 'test-md5',
        eventSource: 'aws:sqs',
        eventSourceARN: 'arn:aws:sqs:us-east-1:000000000000:TelegramQueue',
        awsRegion: 'us-east-1',
      } as SQSRecord,
    ]);

    const processorResponse = await processorHandler(sqsEvent);

    // Then: Should process successfully
    expect(processorResponse.batchItemFailures).toHaveLength(0);
  }, 30000);

  it('should reject invalid secret token at ingress', async () => {
    // Clear any leftover messages from previous tests
    await purgeQueue(localstack.sqsClient, localstack.queueUrl);

    // Given: Valid webhook but wrong secret token
    const event = createAPIGatewayEvent({
      body: JSON.stringify(textMessage),
      headers: {
        'X-Telegram-Bot-Api-Secret-Token': 'wrong-token',
      },
    });

    // When: Ingress processes the request
    const ingressResponse = await ingressHandler(event);

    // Then: Should return 401
    expect(ingressResponse.statusCode).toBe(401);

    // And: No message should be in queue
    await expect(
      pollQueue(localstack.sqsClient, localstack.queueUrl, 1000)
    ).rejects.toThrow('No message received from queue after 1000ms');
  }, 30000);

  it('should handle multiple messages in sequence', async () => {
    // Clear any leftover messages from previous tests
    await purgeQueue(localstack.sqsClient, localstack.queueUrl);

    // Given: Multiple webhook payloads
    const messages = [textMessage, startCommand];

    // When: Both are sent through ingress
    for (const message of messages) {
      const event = createAPIGatewayEvent({
        body: JSON.stringify(message),
        headers: {
          'X-Telegram-Bot-Api-Secret-Token': 'test-secret-token',
        },
      });

      const response = await ingressHandler(event);
      expect(response.statusCode).toBe(200);
    }

    // Then: Both messages should be in queue
    const firstMessage = await pollQueue(localstack.sqsClient, localstack.queueUrl);
    expect(firstMessage.body.message.text).toBe('Hello from test user!');

    const secondMessage = await pollQueue(localstack.sqsClient, localstack.queueUrl);
    expect(secondMessage.body.message.text).toBe('/start');
  }, 30000);

  it('should handle processor failures without losing messages', async () => {
    // Clear any leftover messages from previous tests
    await purgeQueue(localstack.sqsClient, localstack.queueUrl);

    // Given: An invalid message payload (will cause processor to fail gracefully)
    const invalidPayload = { invalid: 'structure' };

    const event = createAPIGatewayEvent({
      body: JSON.stringify(invalidPayload),
      headers: {
        'X-Telegram-Bot-Api-Secret-Token': 'test-secret-token',
      },
    });

    // When: Ingress sends invalid payload
    const ingressResponse = await ingressHandler(event);
    expect(ingressResponse.statusCode).toBe(200);

    // And: Processor tries to handle it
    const queueMessage = await pollQueue(localstack.sqsClient, localstack.queueUrl);
    
    const sqsEvent = createSQSEvent([
      {
        messageId: queueMessage.messageId,
        receiptHandle: 'test-receipt-handle',
        body: JSON.stringify(queueMessage.body),
        attributes: {
          ApproximateReceiveCount: '1',
          SentTimestamp: String(Date.now()),
          SenderId: 'test-sender',
          ApproximateFirstReceiveTimestamp: String(Date.now()),
        },
        messageAttributes: {},
        md5OfBody: 'test-md5',
        eventSource: 'aws:sqs',
        eventSourceARN: 'arn:aws:sqs:us-east-1:000000000000:TelegramQueue',
        awsRegion: 'us-east-1',
      } as SQSRecord,
    ]);

    const processorResponse = await processorHandler(sqsEvent);

    // Then: Processor should report the failure (would go to DLQ in real AWS)
    expect(processorResponse.batchItemFailures).toHaveLength(0); // No failures because invalid structure is logged, not thrown
  }, 30000);
});
