import { Module } from '@nestjs/common';

import { WhatsappConnectService } from './providers/wa-connect.service.ts';
import { WhatsappConnectionHandler } from './providers/wa-connection.handler.ts';
import { WhatsappSocketFactory } from './providers/wa-socket.factory.ts';
import { WhatsappSessionState } from './providers/wa-session.state.ts';

import { WhatsappConnectController } from './controllers/whatsap-connect.controller.ts';
import { WhatsappConnectionGuard } from './guards/whatsapp-connection.guard.ts';

import { WhatsappMessageCoreModule } from '../messages/whatsapp-message-core.module.ts';

@Module({
  imports: [WhatsappMessageCoreModule],

  controllers: [WhatsappConnectController],

  providers: [
    WhatsappConnectService,
    WhatsappConnectionHandler,
    WhatsappSocketFactory,
    WhatsappSessionState,
    WhatsappConnectionGuard,
  ],

  exports: [WhatsappConnectService, WhatsappConnectionGuard],
})
export class WhatsappConnectionModule {}
