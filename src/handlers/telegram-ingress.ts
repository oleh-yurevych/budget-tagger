import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';
import { logger } from '../shared/logger';
import { getEnv } from '../shared/env';
import { validateTelegramSecret } from '../shared/secrets';
import { Maybe } from 'purify-ts/Maybe';
import { UnauthorizedError, BadRequestError, getErrorResponse } from '../shared/errors';

const env = getEnv();
const sqsClient = new SQSClient({ region: env.REGION });

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    logger.debug('Telegram webhook received', { body: event.body });

    const secretToken = event.headers[env.TELEGRAM_SECRET_HEADER];
    
    const validationResult = await validateTelegramSecret(Maybe.fromNullable(secretToken)).run();
    if (validationResult.isLeft()) {
      throw new UnauthorizedError(validationResult.extract());
    }
    
    if (!validationResult.extract()) {
      throw new UnauthorizedError('Invalid secret token');
    }

    if (!event.body) {
      throw new BadRequestError('No body in webhook request');
    }

    const command = new SendMessageCommand({
      QueueUrl: env.TELEGRAM_QUEUE_URL,
      MessageBody: event.body,
    });
    await sqsClient.send(command);

    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'OK' }),
    };
  } catch (error) {
    logger.error('Error processing webhook', error);
    return getErrorResponse(error);
  }
};
