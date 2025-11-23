import * as env from 'env-var';

export const getEnv = () => ({
  REGION: env.get('REGION').required().asString(),
  STAGE: env.get('STAGE').required().asString(),
  TELEGRAM_QUEUE_URL: env.get('TELEGRAM_QUEUE_URL').required().asString(),
  TELEGRAM_SECRET_NAME: env.get('TELEGRAM_SECRET_NAME').required().asString(),
});
