export interface AppConfig {
  port: number;
  name: string;
}

export interface WhatsappConfig {
  apiToken: string;
  authDir: string;
}
export interface MinioConfig {
  endpoint: string;
  port: number;
  useSsl: boolean;
  accessKey: string;
  secretKey: string;
  bucket: string;
}
export interface AppConfiguration {
  app: AppConfig;
  whatsapp: WhatsappConfig;
  minio: MinioConfig;
}
