import { Module } from '@nestjs/common';
import { AppConfigModule } from './config/app-config.module.js';
import { WhatsappWebhookModule } from './whatsapp-webhook-server/whatsapp-webhook-server.module.js';

@Module({
  imports: [AppConfigModule, WhatsappWebhookModule],
})
export class AppModule {}
