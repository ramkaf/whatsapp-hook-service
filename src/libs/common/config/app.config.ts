export const appConfiguration = () => ({
  app: {
    port: parseInt(process.env.APP_PORT || '3000'),
    name: process.env.APP_NAME,
  },
  whatsapp: {
    apiToken: process.env.WHATSAPP_API_TOKEN,
    authDir: process.env.WHATSAPP_AUTH_DIR,
  },
});