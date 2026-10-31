import { AppConfiguration } from '../interfaces/app-config.interface.ts';

export const appConfiguration = (): AppConfiguration => ({
  app: {
    port: parseInt(process.env.APP_PORT! || '3000', 10),
    name: process.env.APP_NAME!,
  },
  whatsapp: {
    apiToken: process.env.WHATSAPP_API_TOKEN!,
    authDir: process.env.WHATSAPP_AUTH_DIR!,
  },
  minio: {
    endpoint: process.env.MINIO_ENDPOINT!,
    port: Number(process.env.MINIO_PORT!),
    useSsl: false,
    accessKey: '',
    secretKey: '',
    bucket: '',
  },
});
