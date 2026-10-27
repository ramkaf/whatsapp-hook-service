import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Environment } from '../enums/env.enum.js';
import type { EnvironmentVariables } from '../interfaces/env.interface.js';
import { getEnvironment, getEnvFilePaths } from '../utils/env.utils.js';
import { createEnvironmentSchema } from '../validation/env.validation.js';

afterEach(() => vi.unstubAllEnvs());

describe('stage selection', () => {
  it('defaults to development when NODE_ENV is absent', () => {
    vi.stubEnv('NODE_ENV', undefined);
    expect(getEnvironment()).toBe(Environment.Development);
  });

  it.each(Object.values(Environment))('selects %s', (stage) => {
    expect(getEnvironment(stage)).toBe(stage);
    expect(getEnvFilePaths(stage)).toEqual([
      `.env.${stage}.local`,
      `.env.${stage}`,
      '.env',
    ]);
  });

  it.each(['', 'test', 'prod', 'Development'])(
    'rejects unsupported NODE_ENV %j',
    (stage) => expect(() => getEnvironment(stage)).toThrow('NODE_ENV'),
  );
});

describe('Joi validation', () => {
  const schema = createEnvironmentSchema(Environment.Production);

  it('converts the port, defaults the stage, and preserves other variables', () => {
    const result = schema.validate({ PORT: '8080', CUSTOM_SETTING: 'example' });
    expect(result.error).toBeUndefined();
    expect(result.value).toEqual({
      NODE_ENV: Environment.Production,
      PORT: 8080,
      CUSTOM_SETTING: 'example',
    });
  });

  it('requires a port', () => {
    expect(schema.validate({}).error?.message).toContain('"PORT" is required');
  });

  it.each(['', 'abc', '0', '-1', '65536', '3.5', null, true])(
    'rejects invalid port %j',
    (port) => expect(schema.validate({ PORT: port }).error).toBeDefined(),
  );

  it.each(['1', '65535'])('accepts boundary port %s', (port) => {
    const result = schema.validate({ PORT: port });
    expect(result.error).toBeUndefined();
    expect(result.value.PORT).toBe(Number(port));
  });

  it('reports a mismatched stage and invalid port together', () => {
    const result = schema.validate({
      NODE_ENV: Environment.Staging,
      PORT: 'invalid',
    });
    expect(result.error?.message).toContain('must match the selected stage');
    expect(result.error?.message).toContain('PORT');
    expect(result.error?.details).toHaveLength(2);
  });
});

describe('Nest config integration', () => {
  it.each(Object.values(Environment))(
    'loads %s files and honors runtime > local > stage > shared priority',
    async (stage) => {
      const directory = mkdtempSync(join(tmpdir(), 'whatsapp-env-'));
      const paths = getEnvFilePaths(stage).map((file) => join(directory, file));
      const sources = [
        { name: 'runtime', port: 4400 },
        { name: 'local', port: 4300 },
        { name: 'stage', port: 4200 },
        { name: 'shared', port: 4100 },
      ];
      try {
        paths.forEach((file, index) =>
          writeFileSync(file, `PORT=${4300 - index * 100}\n`),
        );
        for (const [index, source] of sources.entries()) {
          vi.stubEnv('NODE_ENV', stage);
          vi.stubEnv('PORT', source.name === 'runtime' ? '4400' : undefined);
          if (index >= 2) rmSync(paths[index - 2]);

          class TestRootModule {}
          Module({
            imports: [
              ConfigModule.forRoot({
                envFilePath: paths,
                validationSchema: createEnvironmentSchema(stage),
              }),
            ],
          })(TestRootModule);

          const app = await NestFactory.createApplicationContext(
            TestRootModule,
            {
              logger: false,
              abortOnError: false,
            },
          );
          try {
            const config = app.get(ConfigService<EnvironmentVariables, true>);
            expect(config.getOrThrow('NODE_ENV')).toBe(stage);
            expect(config.getOrThrow('PORT')).toBe(source.port);
          } finally {
            await app.close();
          }
        }
      } finally {
        rmSync(directory, { recursive: true, force: true });
      }
    },
  );
});
