import { Module } from '@nestjs/common';
import { WhatsappConnectionModule } from './connection/whatsapp-connection.module.ts';
import { WhatsappGroupModule } from './groups/whatsapp-group.module.ts';
import { WhatsappMessageModule } from './messages/whatsapp-message.module.ts';
import { WhatsappMessageCoreModule } from './messages/whatsapp-message-core.module.ts';

@Module({
  imports: [
    WhatsappMessageCoreModule,
    WhatsappConnectionModule,
    WhatsappGroupModule,
    WhatsappMessageModule,
  ],
})
export class WhatsappModule {}
