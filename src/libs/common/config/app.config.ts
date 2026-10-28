export const appConfiguration = () => ({
  app: {
    port: parseInt(process.env.APP_PORT || '3000'),
    name: process.env.APP_NAME,
  },
});