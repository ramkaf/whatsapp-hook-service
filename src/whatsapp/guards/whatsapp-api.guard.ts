import {
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import type { CanActivate, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import { timingSafeEqual } from 'node:crypto';

@Injectable()
export class WhatsappApiGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const token = process.env.WHATSAPP_API_TOKEN;
    if (!token?.trim()) {
      throw new ServiceUnavailableException(
        'Set WHATSAPP_API_TOKEN to enable the WhatsApp API',
      );
    }
    const request = context.switchToHttp().getRequest<Request>();
    const expected = Buffer.from(`Bearer ${token}`);
    const received = Buffer.from(request.headers.authorization ?? '');
    if (
      received.length !== expected.length ||
      !timingSafeEqual(received, expected)
    ) {
      throw new UnauthorizedException('Invalid WhatsApp API bearer token');
    }
    return true;
  }
}
