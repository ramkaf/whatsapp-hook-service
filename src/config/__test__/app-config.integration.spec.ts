import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Environment } from './../enums/env.enum.js';
import type { EnvironmentVariables } from './../interfaces/env.interface.js';
import { createEnvironmentSchema } from './../validation/env.validation.js';

let directory: string;

beforeEach(async () => {
  vi.resetModules();
  directory = mkdtempSync(join(tmpdir(), 'whatsapp-app-config-'));
  vi.stubEnv('NODE_ENV', Environment.Development);
  vi.stubEnv('PORT', undefined);

  // Isolate env files from developer secrets while exercising the real module.
  const utils = await import('./../utils/env.utils.js');
  const getEnvFilePaths = utils.getEnvFilePaths;
  vi.spyOn(utils, 'getEnvFilePaths').mockImplementation((stage) =>
    getEnvFilePaths(stage).map((file) => join(directory, file)),
  );
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  rmSync(directory, { recursive: true, force: true });
});

describe('AppConfigModule wiring', () => {
  it.each([
    [Environment.Development, 4000],
    [Environment.Staging, 5000],
    [Environment.Production, 3000],
  ] as const)(
    'loads the selected %s file in the real app',
    async (stage, port) => {
      vi.stubEnv('NODE_ENV', stage);
      for (const otherStage of Object.values(Environment)) {
        writeFileSync(
          join(directory, `.env.${otherStage}`),
          otherStage === stage ? `PORT=${port}\n` : 'PORT=invalid\n',
        );
      }

      const { AppModule } = await import('../../app.module.js');
      const app = await NestFactory.createApplicationContext(AppModule, {
        logger: false,
        abortOnError: false,
      });
      try {
        const config = app.get(ConfigService<EnvironmentVariables, true>);
        expect(config.getOrThrow('NODE_ENV')).toBe(stage);
        expect(config.getOrThrow('PORT')).toBe(port);
      } finally {
        await app.close();
      }
    },
  );

  it('provides validated config globally without env files', async () => {
    vi.stubEnv('NODE_ENV', Environment.Production);
    vi.stubEnv('PORT', '8080');
    const { AppConfigModule } = await import('./../app-config.module.js');
    const probe = Symbol('config-consumer');

    class ConsumerModule {}
    Module({
      providers: [
        {
          provide: probe,
          inject: [ConfigService],
          useFactory: (config: ConfigService<EnvironmentVariables, true>) => ({
            stage: config.getOrThrow('NODE_ENV'),
            port: config.getOrThrow('PORT'),
          }),
        },
      ],
    })(ConsumerModule);

    class TestRootModule {}
    Module({ imports: [AppConfigModule, ConsumerModule] })(TestRootModule);
    const app = await NestFactory.createApplicationContext(TestRootModule, {
      logger: false,
      abortOnError: false,
    });
    try {
      expect(app.get(probe)).toEqual({
        stage: Environment.Production,
        port: 8080,
      });
    } finally {
      await app.close();
    }
  });

  it('rejects an unsupported stage when the real module is imported', async () => {
    vi.stubEnv('NODE_ENV', 'prod');
    await expect(import('./../app-config.module.js')).rejects.toThrow(
      'Invalid NODE_ENV',
    );
  });
});

describe('Nest validation failures', () => {
  it('rejects startup configuration when no file or runtime port is supplied', async () => {
    await expect(
      ConfigModule.forRoot({
        envFilePath: join(directory, '.env.development'),
        validationSchema: createEnvironmentSchema(Environment.Development),
      }),
    ).rejects.toThrow('"PORT" is required');
  });

  it('rejects an invalid file value through Nest validation', async () => {
    const file = join(directory, '.env.development');
    writeFileSync(file, 'PORT=invalid\n');
    await expect(
      ConfigModule.forRoot({
        envFilePath: file,
        validationSchema: createEnvironmentSchema(Environment.Development),
      }),
    ).rejects.toThrow('PORT');
  });

  it('rejects an invalid runtime override of a valid file value', async () => {
    const file = join(directory, '.env.development');
    writeFileSync(file, 'PORT=4000\n');
    vi.stubEnv('PORT', '65536');
    await expect(
      ConfigModule.forRoot({
        envFilePath: file,
        validationSchema: createEnvironmentSchema(Environment.Development),
      }),
    ).rejects.toThrow('PORT');
  });

  it('rejects a file that tries to change the selected stage', async () => {
    const file = join(directory, '.env.development');
    writeFileSync(file, 'NODE_ENV=production\nPORT=4000\n');
    vi.stubEnv('NODE_ENV', undefined);
    await expect(
      ConfigModule.forRoot({
        envFilePath: file,
        validationSchema: createEnvironmentSchema(Environment.Development),
      }),
    ).rejects.toThrow('must match the selected stage');
  });
});
