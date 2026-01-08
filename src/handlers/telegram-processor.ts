import { SQSEvent, SQSRecord, SQSBatchResponse } from 'aws-lambda';
import { logger } from '../shared/logger';

export const handler = async (event: SQSEvent): Promise<SQSBatchResponse> => {
  logger.info('Processing Telegram messages', { messageCount: event.Records.length });

  const batchItemFailures: SQSBatchResponse['batchItemFailures'] = [];

  for (const record of event.Records) {
    try {
      await processMessage(record);
    } catch (error) {
      logger.error('Failed to process message', {
        messageId: record.messageId,
        error,
      });
      // Add to batch failures for DLQ processing
      batchItemFailures.push({ itemIdentifier: record.messageId });
    }
  }

  return { batchItemFailures };
};

async function processMessage(record: SQSRecord): Promise<void> {
  logger.debug('Processing SQS message', {
    messageId: record.messageId,
    body: record.body,
  });

  try {
    const telegramUpdate = JSON.parse(record.body);
    
    logger.info('Telegram update received', {
      updateId: telegramUpdate.update_id,
      messageType: getMessageType(telegramUpdate),
    });

    // TBD: processing logic
    
  } catch (error) {
    logger.error('Invalid message format', {
      messageId: record.messageId,
      error,
    });
    throw error;
  }
}

/**
 * Determine the type of Telegram update for logging
 */
function getMessageType(update: any): string {
  if (update.message) return 'message';
  if (update.edited_message) return 'edited_message';
  if (update.callback_query) return 'callback_query';
  if (update.inline_query) return 'inline_query';
  return 'unknown';
}
