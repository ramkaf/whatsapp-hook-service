import { Controller, Get, Post } from '@nestjs/common';
import { WhatsappConnectService } from '../providers/wa-connect.service.ts';

@Controller('whatsapp/connection')
export class WhatsappConnectController {
  constructor(
    private readonly WhatsappConnectService: WhatsappConnectService,
  ) {}

  @Post('connect')
  async connect() {
    return this.WhatsappConnectService.connect();
  }

  @Get('status')
  getStatus() {
    return this.WhatsappConnectService.getStatus();
  }

  @Get('qr')
  async getQr() {
    return this.WhatsappConnectService.getQr();
  }
}
