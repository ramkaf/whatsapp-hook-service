import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { getEnvironment, getEnvFilePaths } from './utils/env.utils.js';
import { createEnvironmentSchema } from './validation/env.validation.js';

const environment = getEnvironment();

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      envFilePath: getEnvFilePaths(environment),
      validationSchema: createEnvironmentSchema(environment),
    }),
  ],
  exports: [ConfigModule],
})
export class AppConfigModule {}
