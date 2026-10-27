import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module.js';
import type { EnvironmentVariables } from './config/interfaces/env.interface.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService<EnvironmentVariables, true>);
  const port = config.getOrThrow('PORT', { infer: true });

  await app.listen(port);

  Logger.log(`WhatsApp service is running on port ${port}`, 'Bootstrap');
}

await bootstrap();
