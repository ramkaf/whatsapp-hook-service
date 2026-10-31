import { Module } from '@nestjs/common';
import { WhatsappGroupController } from './controllers/whatsapp-group.controller.ts';
import { WhatsappGroupService } from './providers/whatsapp-group.service.ts';
import { WhatsappConnectionModule } from '../connection/whatsapp-connection.module.ts';

@Module({
  imports: [WhatsappConnectionModule],
  controllers: [WhatsappGroupController],
  providers: [WhatsappGroupService],
  exports: [WhatsappGroupService],
})
export class WhatsappGroupModule {}
