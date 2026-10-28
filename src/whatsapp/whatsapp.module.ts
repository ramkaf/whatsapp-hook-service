import { Module } from '@nestjs/common';
import { WhatsappApiGuard } from './guards/whatsapp-api.guard.ts';
import { WhatsappController } from './controllers/whatsapp.controller.ts';
import { WhatsappService } from './providers/whatsapp.service.ts';
import { GroupMessageHandler } from './providers/group-message.handler.ts';
import { WhatsappGroupMonitorService } from './providers/whatsapp-group-monitor.service.ts';

@Module({
  controllers: [WhatsappController],
  providers: [
    WhatsappService,
    WhatsappApiGuard,
    GroupMessageHandler,
    WhatsappGroupMonitorService,
  ],
  exports: [WhatsappService],
})
export class WhatsappModule {}
