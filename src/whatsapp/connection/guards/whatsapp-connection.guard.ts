import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { WhatsappConnectService } from '../providers/wa-connect.service.ts';
@Injectable()
export class WhatsappConnectionGuard implements CanActivate {
  private readonly logger = new Logger(WhatsappConnectionGuard.name);

  constructor(
    private readonly whatsappConnectService: WhatsappConnectService,
  ) {}

  canActivate(_context: ExecutionContext): boolean {
    const status = this.whatsappConnectService.getStatus();

    try {
      const socket = this.whatsappConnectService.getSocket();

      if (!socket.user?.id) {
        throw new ServiceUnavailableException(
          'WhatsApp session is not authenticated',
        );
      }

      return true;
    } catch {
      this.logger.warn(
        `WhatsApp API request rejected: status=${status.status}`,
      );

      throw new ServiceUnavailableException({
        statusCode: 503,
        error: 'WHATSAPP_NOT_CONNECTED',
        message: 'WhatsApp connection is not available',
        connectionStatus: status.status,
      });
    }
  }
}
