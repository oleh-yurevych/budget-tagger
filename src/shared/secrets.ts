import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';
import { Either, Left, Right } from 'purify-ts/Either';
import { EitherAsync } from 'purify-ts/EitherAsync';
import { Maybe, Just } from 'purify-ts/Maybe';
import { logger } from './logger';
import { getEnv } from './env';

const env = getEnv();
const secretsClient = new SecretsManagerClient({ region: env.REGION });

let cachedSecret: Maybe<string> = Maybe.empty();

export async function getTelegramSecret(): Promise<Either<string, string>> {
  if (cachedSecret.isJust()) {
    logger.debug('Using cached Telegram secret');
    return Right(cachedSecret.extract());
  }

  const secretName = env.TELEGRAM_SECRET_NAME;

  try {
    logger.info('Fetching Telegram secret from Secrets Manager', { secretName });
    
    const command = new GetSecretValueCommand({ SecretId: secretName });
    const response = await secretsClient.send(command);
    
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

export function validateTelegramSecret(providedSecret: Maybe<string>): EitherAsync<string, boolean> {
    return EitherAsync.fromPromise(() => getTelegramSecret())
        .chain(expectedSecret => 
            EitherAsync.liftEither(
                providedSecret
                    .map(provided => provided === expectedSecret)
                    .toEither('No secret provided')
            )
        )
        .ifRight(isValid => logger.debug('Telegram secret validation result', { isValid }))
        .ifLeft(error => logger.error('Failed to validate secret', { error }));
}
