import { Module } from '@nestjs/common';

import { WhatsappMessageController } from './controllers/whatsapp-message.controller.ts';

import { WhatsappMessageCoreModule } from './whatsapp-message-core.module.ts';
import { WhatsappConnectionModule } from '../connection/whatsapp-connection.module.ts';

@Module({
  imports: [WhatsappMessageCoreModule, WhatsappConnectionModule],

  controllers: [WhatsappMessageController],
})
export class WhatsappMessageModule {}
