import { Module } from '@nestjs/common';
import { WhatsappModule } from './whatsapp/whatsapp.module.ts';

@Module({
  imports: [WhatsappModule],
})
export class AppModule {}
