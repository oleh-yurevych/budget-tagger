import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';
import { Either, Left, Right } from 'purify-ts/Either';
import { EitherAsync } from 'purify-ts/EitherAsync';
import { Maybe, Just } from 'purify-ts/Maybe';
import { logger } from './logger';
import { getEnv } from './env';

const env = getEnv();

// Lazy initialization to allow environment variables to be set in tests
let secretsClient: SecretsManagerClient | null = null;

function getSecretsClient(): SecretsManagerClient {
  if (!secretsClient) {
    secretsClient = new SecretsManagerClient({ 
      region: env.REGION,
      ...(process.env.AWS_ENDPOINT && { endpoint: process.env.AWS_ENDPOINT })
    });
  }
  return secretsClient;
}

let cachedSecret: Maybe<string> = Maybe.empty();

// For testing: clear the cached secret and force re-initialization of client
export function clearSecretCache(): void {
  cachedSecret = Maybe.empty();
  secretsClient = null;
}

export async function getTelegramSecret(): Promise<Either<string, string>> {
  if (cachedSecret.isJust()) {
    logger.debug('Using cached Telegram secret');
    return Right(cachedSecret.extract());
  }

  const secretName = env.TELEGRAM_SECRET_NAME;

  try {
    logger.info('Fetching Telegram secret from Secrets Manager', { secretName });
    
    const command = new GetSecretValueCommand({ SecretId: secretName });
    const response = await getSecretsClient().send(command);
    
    if (!response.SecretString) {
      logger.error('Secret value is empty');
      return Left('Secret value is empty');
    }

    const secretValue = response.SecretString;
    cachedSecret = Just(secretValue);
    
    return Right(secretValue);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Failed to fetch Telegram secret', error);
    return Left(`Failed to fetch Telegram secret: ${errorMessage}`);
  }
}

export type SecretValidationError = 
  | { type: 'AWS_ERROR'; message: string }  // Secrets Manager failure (500)
  | { type: 'NO_SECRET_PROVIDED'; message: string }  // Missing header (401)
  | { type: 'INVALID_TOKEN'; message: string };  // Wrong token (401)

export function validateTelegramSecret(providedSecret: Maybe<string>): EitherAsync<SecretValidationError, boolean> {
    // First, check if secret was provided
    if (providedSecret.isNothing()) {
        const error: SecretValidationError = { 
            type: 'NO_SECRET_PROVIDED', 
            message: 'No secret token provided in request headers' 
        };
        logger.error('Failed to validate secret', { error: error.message });
        return EitherAsync.liftEither(Left(error));
    }

    return EitherAsync.fromPromise(() => getTelegramSecret())
        .mapLeft((awsError): SecretValidationError => {
            const error: SecretValidationError = {
                type: 'AWS_ERROR',
                message: awsError
            };
            logger.error('Failed to validate secret', { error: error.message });
            return error;
        })
        .chain(expectedSecret => {
            const provided = providedSecret.extract();
            const isValid = provided === expectedSecret;
            
            if (isValid) {
                logger.debug('Telegram secret validation result', { isValid: true });
                return EitherAsync.liftEither(Right(true));
            } else {
                const error: SecretValidationError = {
                    type: 'INVALID_TOKEN',
                    message: 'Secret token does not match expected value'
                };
                logger.error('Failed to validate secret', { error: error.message });
                return EitherAsync.liftEither(Left(error));
            }
        });
}
