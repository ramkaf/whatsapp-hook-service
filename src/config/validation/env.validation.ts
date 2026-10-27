import Joi from 'joi';
import { Environment } from '../enums/env.enum.js';
import type { EnvironmentVariables } from '../interfaces/env.interface.js';

export const stageSchema = Joi.string<Environment>()
  .valid(...Object.values(Environment))
  .default(Environment.Development);

export function createEnvironmentSchema(
  environment: Environment,
): Joi.ObjectSchema<EnvironmentVariables> {
  return Joi.object<EnvironmentVariables>({
    NODE_ENV: Joi.string<Environment>()
      .valid(environment)
      .default(environment)
      .messages({
        'any.only': 'NODE_ENV in the env file must match the selected stage',
      }),
    PORT: Joi.number().integer().min(1).max(65535).required(),
  }).prefs({ abortEarly: false, allowUnknown: true, convert: true });
}
