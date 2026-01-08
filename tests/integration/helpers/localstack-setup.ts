import { CreateQueueCommand, GetQueueUrlCommand, SQSClient, ReceiveMessageCommand, DeleteMessageCommand } from '@aws-sdk/client-sqs';
import { SecretsManagerClient, CreateSecretCommand } from '@aws-sdk/client-secrets-manager';
import { StartedTestContainer, GenericContainer, Wait } from 'testcontainers';

export interface LocalStackResources {
  sqsClient: SQSClient;
  secretsClient: SecretsManagerClient;
  queueUrl: string;
  endpoint: string;
  container: StartedTestContainer;
}

/**
 * Starts LocalStack container and creates required AWS resources
 */
export async function setupLocalStack(): Promise<LocalStackResources> {
  console.log('Starting LocalStack container...');
  
  const container = await new GenericContainer('localstack/localstack:latest')
    .withEnvironment({
      SERVICES: 'sqs,secretsmanager',
      DEBUG: '1',
      EAGER_SERVICE_LOADING: '1',
    })
    .withExposedPorts(4566)
    .withWaitStrategy(Wait.forLogMessage(/Ready\./))
    .start();

  const endpoint = `http://${container.getHost()}:${container.getMappedPort(4566)}`;
  console.log(`LocalStack started at ${endpoint}`);

  // Configure AWS SDK clients to use LocalStack
  const sqsClient = new SQSClient({
    endpoint,
    region: 'us-east-1',
    credentials: {
      accessKeyId: 'test',
      secretAccessKey: 'test',
    },
  });

  const secretsClient = new SecretsManagerClient({
    endpoint,
    region: 'us-east-1',
    credentials: {
      accessKeyId: 'test',
      secretAccessKey: 'test',
    },
  });

  // Create SQS Queue
  console.log('Creating TelegramQueue...');
  const createQueueResponse = await sqsClient.send(
    new CreateQueueCommand({
      QueueName: 'TelegramQueue',
      Attributes: {
        VisibilityTimeout: '30',
        MessageRetentionPeriod: '3600',
      },
    })
  );

  const queueUrl = createQueueResponse.QueueUrl!;
  console.log(`Queue created: ${queueUrl}`);

  // Create Telegram Secret
  console.log('Creating Telegram secret...');
  await secretsClient.send(
    new CreateSecretCommand({
      Name: 'telegram/bot-token',
      SecretString: 'test-secret-token',
    })
  );
  console.log('Secret created');

  return {
    sqsClient,
    secretsClient,
    queueUrl,
    endpoint,
    container,
  };
}

/**
 * Stops LocalStack container and cleans up resources
 */
export async function teardownLocalStack(resources: LocalStackResources): Promise<void> {
  console.log('Stopping LocalStack container...');
  await resources.container.stop();
  console.log('LocalStack stopped');
}

/**
 * Polls SQS queue until message is received or timeout
 */
export async function pollQueue(
  sqsClient: SQSClient,
  queueUrl: string,
  timeoutMs: number = 5000
): Promise<any> {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeoutMs) {
    const response = await sqsClient.send(
      new ReceiveMessageCommand({
        QueueUrl: queueUrl,
        MaxNumberOfMessages: 1,
        WaitTimeSeconds: 1,
      })
    );

    if (response.Messages && response.Messages.length > 0) {
      const message = response.Messages[0];
      
      // Delete message after receiving
      await sqsClient.send(
        new DeleteMessageCommand({
          QueueUrl: queueUrl,
          ReceiptHandle: message.ReceiptHandle!,
        })
      );

      return {
        messageId: message.MessageId,
        body: JSON.parse(message.Body!),
        attributes: message.MessageAttributes,
      };
    }

    // Wait a bit before polling again
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  throw new Error(`No message received from queue after ${timeoutMs}ms`);
}

/**
 * Clears all messages from the queue
 */
export async function purgeQueue(sqsClient: SQSClient, queueUrl: string): Promise<void> {
  let hasMessages = true;
  
  while (hasMessages) {
    const response = await sqsClient.send(
      new ReceiveMessageCommand({
        QueueUrl: queueUrl,
        MaxNumberOfMessages: 10,
        WaitTimeSeconds: 0,
      })
    );

    if (response.Messages && response.Messages.length > 0) {
      await Promise.all(
        response.Messages.map(message =>
          sqsClient.send(
            new DeleteMessageCommand({
              QueueUrl: queueUrl,
              ReceiptHandle: message.ReceiptHandle!,
            })
          )
        )
      );
    } else {
      hasMessages = false;
    }
  }
}
