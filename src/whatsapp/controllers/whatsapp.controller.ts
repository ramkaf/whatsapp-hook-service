import { ApiControllerDocs, ApiEndpointDocs, ApiErrorDto } from '#common';
import {
  GroupMessageSentDto,
  PairingQrUnavailableDto,
  SendGroupMessageDto,
  WhatsappGroupDto,
  WhatsappPairingDto,
  WhatsappStatusDto,
} from '../dto/whatsapp-api.dto.ts';
import {
  Body,
  Controller,
  Get,
  Header,
  HttpCode,
  Inject,
  Post,
  NotFoundException,
  StreamableFile,
  UseGuards,
} from '@nestjs/common';
import { WhatsappApiGuard } from '../guards/whatsapp-api.guard.ts';
import { WhatsappService } from '../providers/whatsapp.service.ts';

@Controller('whatsapp')
@UseGuards(WhatsappApiGuard)
@ApiControllerDocs({
  tag: 'WhatsApp',
  bearerAuth: 'whatsapp-token',
  responses: [
    {
      status: 401,
      description: 'Missing or invalid bearer token.',
      type: ApiErrorDto,
    },
    {
      status: 503,
      description:
        'API token is not configured, WhatsApp is not connected, or connection initialization failed.',
      type: ApiErrorDto,
    },
  ],
})
export class WhatsappController {
  constructor(
    @Inject(WhatsappService) private readonly whatsapp: WhatsappService,
  ) {}

  @Post('connect')
  @ApiEndpointDocs({
    summary: 'Connect or restore the WhatsApp session',
    description:
      'Starts an asynchronous connection. A fresh account generates a QR; saved credentials restore the session without a QR. Poll status or QR until ready. Does not send a message.',
    responses: [{ status: 202, type: WhatsappPairingDto }],
  })
  @HttpCode(202)
  @Header('Cache-Control', 'no-store')
  async connect() {
    await this.whatsapp.connect();
    return this.whatsapp.getQr();
  }

  @Get('qr')
  @ApiEndpointDocs({
    summary: 'Get the current QR as JSON',
    description:
      'Returns raw QR text and a PNG data URL. Both are null when no QR is available; see qrUnavailableReason.',
    responses: [{ status: 200, type: WhatsappPairingDto }],
  })
  @Header('Cache-Control', 'no-store')
  qr() {
    return this.whatsapp.getQr();
  }

  @Get('qr/image')
  @ApiEndpointDocs({
    summary: 'Get the current QR as a PNG image',
    description:
      'Scan the image with WhatsApp Business > Linked devices. Requires the same bearer token as other WhatsApp endpoints.',
    responses: [
      {
        status: 200,
        description: 'Scannable QR image.',
        content: {
          'image/png': { schema: { type: 'string', format: 'binary' } },
        },
      },
      {
        status: 404,
        description:
          'No QR is available. The JSON response explains whether the session is restoring, already connected, or waiting for a QR.',
        type: PairingQrUnavailableDto,
      },
    ],
  })
  @Header('Cache-Control', 'no-store')
  async qrImage() {
    const pairing = await this.whatsapp.getQr();
    const { qrDataUrl } = pairing;
    if (!qrDataUrl) {
      throw new NotFoundException({
        ...pairing,
        statusCode: 404,
        error: 'Not Found',
        message:
          pairing.qrUnavailableReason ??
          'No current QR is available. Retry GET /whatsapp/qr.',
      });
    }
    return new StreamableFile(Buffer.from(qrDataUrl.split(',')[1]!, 'base64'), {
      type: 'image/png',
      disposition: 'inline',
    });
  }

  @Get('status')
  @ApiEndpointDocs({
    summary: 'Get connection status and pairing diagnostics',
    responses: [{ status: 200, type: WhatsappStatusDto }],
  })
  @Header('Cache-Control', 'no-store')
  status() {
    return this.whatsapp.getStatus();
  }

  @Get('groups')
  @ApiEndpointDocs({
    summary: 'List groups joined by the linked account',
    description:
      'Requires status connected. Use a returned id as groupJid when sending a message.',
    responses: [
      { status: 200, type: WhatsappGroupDto, isArray: true },
      {
        status: 502,
        description: 'WhatsApp group lookup failed.',
        type: ApiErrorDto,
      },
    ],
  })
  groups() {
    return this.whatsapp.listGroups();
  }

  @Post('messages')
  @ApiEndpointDocs({
    summary: 'Send a text message to an existing group',
    description:
      'Requires a connected account that belongs to the group. WhatsApp enforces group posting restrictions. Sends are not automatically retried; check the group before retrying an uncertain result.',
    body: { type: SendGroupMessageDto },
    responses: [
      { status: 200, type: GroupMessageSentDto },
      {
        status: 400,
        description:
          'Invalid group JID, empty or oversized text, or unknown body fields.',
        type: ApiErrorDto,
      },
      {
        status: 403,
        description:
          'The linked account is not a member of the requested group.',
        type: ApiErrorDto,
      },
      {
        status: 502,
        description: 'WhatsApp group lookup or message sending failed.',
        type: ApiErrorDto,
      },
    ],
  })
  @HttpCode(200)
  send(@Body() body: unknown) {
    return this.whatsapp.sendGroupMessage(body);
  }
}
