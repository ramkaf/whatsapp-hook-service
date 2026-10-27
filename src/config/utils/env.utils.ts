import type { Environment } from '../enums/env.enum.js';
import { stageSchema } from '../validation/env.validation.js';

export function getEnvironment(value = process.env.NODE_ENV): Environment {
  const { error, value: environment } = stageSchema.validate(value, {
    convert: false,
  });
  if (error) {
    throw new Error(`Invalid NODE_ENV: ${error.message}`);
  }
  return environment;
}

export function getEnvFilePaths(environment: Environment): string[] {
  return [`.env.${environment}.local`, `.env.${environment}`, '.env'];
}
