import { Controller, UseGuards } from '@nestjs/common';
import { WhatsappConnectionGuard } from '../../connection/guards/whatsapp-connection.guard.ts';
import { WhatsappMessageService } from '../providers/whatsapp-message.service.ts';

@UseGuards(WhatsappConnectionGuard)
@Controller('whatsapp/messages')
export class WhatsappMessageController {
  constructor(
    private readonly whatsappMessageService: WhatsappMessageService,
  ) {}
}
