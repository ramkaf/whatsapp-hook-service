import { existsSync } from 'node:fs';
import { loadEnvFile } from 'node:process';

export const logsConfiguration = () => {
  if (existsSync('.env')) {
    loadEnvFile('.env');
  }

  return {
    logs: {
      serviceName: process.env.ELASTIC_APM_SERVICE_NAME,
      serverUrl: process.env.ELASTIC_APM_SERVER_URL,
      secretToken: process.env.ELASTIC_APM_SECRET_TOKEN,
    },
  };
};
