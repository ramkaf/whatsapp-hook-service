import { Module } from '@nestjs/common';
import { WhatsappWebhookModule } from './whatsapp-webhook-server/whatsapp-webhook-server.module.js';
@Module({
  imports: [WhatsappWebhookModule]
})
export class AppModule {}
