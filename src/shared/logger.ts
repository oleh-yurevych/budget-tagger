export const logger = {
  info: (message: string, data?: any) => {
    console.log(JSON.stringify({
      level: 'INFO',
      message,
      timestamp: new Date().toISOString(),
      ...(data && { data }),
    }));
  },

  error: (message: string, error?: any) => {
    console.error(JSON.stringify({
      level: 'ERROR',
      message,
      timestamp: new Date().toISOString(),
      ...(error && {
        error: error instanceof Error ? {
          message: error.message,
          stack: error.stack,
          name: error.name,
        } : error,
      }),
    }));
  },

  debug: (message: string, data?: any) => {
    console.log(JSON.stringify({
      level: 'DEBUG',
      message,
      timestamp: new Date().toISOString(),
      ...(data && { data }),
    }));
  },

  warn: (message: string, data?: any) => {
    console.warn(JSON.stringify({
      level: 'WARN',
      message,
      timestamp: new Date().toISOString(),
      ...(data && { data }),
    }));
  },
};
