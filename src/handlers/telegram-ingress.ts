import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';
import { logger } from '../shared/logger';

const sqsClient = new SQSClient({ region: process.env.REGION });

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    logger.info('Telegram webhook received', { body: event.body });

    const webhookPayload = event.body ? JSON.parse(event.body) : {};

    const command = new SendMessageCommand({
      QueueUrl: process.env.TELEGRAM_QUEUE_URL,
      MessageBody: JSON.stringify(webhookPayload),
    });

    await sqsClient.send(command);
    logger.info('Message sent to SQS successfully');

    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'OK' }),
    };
  } catch (error) {
    logger.error('Error processing webhook', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
};
