import { Module } from "@nestjs/common";

import { WhatsappWebhookSignatureService } from "./providers/whatsapp-webhook-signature.service.js";
import { WhatsappWebhookService } from "./providers/whatsapp-webhook.service.js";
import { WhatsappWebhookPayloadService } from "./providers/whatsapp-webhook-payload.service.js";
import { WhatsappWebhookRepoitory } from "./repository/whatsapp-webhook-repository.js";
import { WhatsappWebhookController } from "./controllers/whatsapp-webhook-server.controller.js";

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
