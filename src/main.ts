import afraLogger from '@afra/exchange-logger';

afraLogger.start({
  apm: {
    ...logsConfiguration().logs,
    active: true,
    captureBody: 'off',
  },
  logger: {
    file: { enabled: false },
  },
  rabbitmq: {
    enabled: true,
  },
});

import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.ts';
import { appConfiguration, logsConfiguration, setupSwagger } from '#common';
import exchangeLogger from '@afra/exchange-logger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableShutdownHooks();
  app.setGlobalPrefix('api/v1');
  setupSwagger(app);
  setupSwagger(app);
  const { name: appName, port } = appConfiguration().app;
  await app.listen(port);
  exchangeLogger.logger.info(`${appName} is running on port ${port}`);
  Logger.log(`${appName} is running on port ${port}`, 'Bootstrap');
}

await bootstrap();
