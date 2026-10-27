import type { Environment } from '../enums/env.enum.js';

export interface EnvironmentVariables {
  NODE_ENV: Environment;
  PORT: number;
}
