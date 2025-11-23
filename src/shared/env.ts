import * as env from 'env-var';

const envVarsConfig = {
  REGION: { required: true },
  STAGE: { required: true },
  TELEGRAM_QUEUE_URL: { required: true },
  TELEGRAM_SECRET_NAME: { required: true },
  TELEGRAM_SECRET_HEADER: { required: false, default: 'X-Telegram-Bot-Api-Secret-Token' },
} as const;

type EnvVar = keyof typeof envVarsConfig;

export const getEnv = (): Record<EnvVar, string> => {
  return Object.entries(envVarsConfig).reduce((acc, [key, config]) => {
    const envKey = key as EnvVar;
    const value = config.required
      ? env.get(envKey).required().asString()
      : env.get(envKey).default(config.default || '').asString();
    acc[envKey] = value;
    return acc;
  }, {} as Record<EnvVar, string>);
};
