import { Module } from "@nestjs/common";

import { WhatsappWebhookSignatureService } from "./providers/whatsapp-webhook-signature.service.ts";
import { WhatsappWebhookService } from "./providers/whatsapp-webhook.service.ts";
import { WhatsappWebhookPayloadService } from "./providers/whatsapp-webhook-payload.service.ts";
import { WhatsappWebhookRepoitory } from "./repository/whatsapp-webhook-repository.ts";
import { WhatsappWebhookController } from "./controllers/whatsapp-webhook-server.controller.ts";

@Module({
  imports: [],
  controllers: [WhatsappWebhookController],
  providers: [
    WhatsappWebhookRepoitory,
    WhatsappWebhookService,
    WhatsappWebhookSignatureService,
    WhatsappWebhookPayloadService,
  ],
})
export class WhatsappWebhookModule {}
