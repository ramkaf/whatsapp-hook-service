import {
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { WhatsappApiGuard } from './whatsapp-api.guard.ts';

function context(authorization?: string) {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ headers: { authorization } }),
    }),
  } as unknown as ExecutionContext;
}

afterEach(() => vi.unstubAllEnvs());

describe('WhatsApp API authorization', () => {
  it('keeps the API disabled until a token is configured', () => {
    vi.stubEnv('WHATSAPP_API_TOKEN', '');
    expect(() => new WhatsappApiGuard().canActivate(context())).toThrow(
      ServiceUnavailableException,
    );
  });

  it.each([undefined, 'Bearer wrong', 'Basic secret', 'Bearer secrex'])(
    'rejects invalid authorization %s',
    (header) => {
      vi.stubEnv('WHATSAPP_API_TOKEN', 'secret');
      expect(() => new WhatsappApiGuard().canActivate(context(header))).toThrow(
        UnauthorizedException,
      );
    },
  );

  it('accepts the configured bearer token', () => {
    vi.stubEnv('WHATSAPP_API_TOKEN', 'secret');
    expect(new WhatsappApiGuard().canActivate(context('Bearer secret'))).toBe(
      true,
    );
  });
});
