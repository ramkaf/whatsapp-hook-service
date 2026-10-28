import { ApiProperty } from '@nestjs/swagger';

export class WhatsappStatusDto {
  @ApiProperty({
    type: String,
    enum: [
      'disconnected',
      'connecting',
      'awaiting_qr',
      'connected',
      'logged_out',
      'error',
    ],
    example: 'connecting',
  })
  status: string;

  @ApiProperty({
    type: String,
    nullable: true,
    example: null,
    description:
      'Linked account JID, if available. Its presence does not mean the connection is ready.',
  })
  accountJid: string | null;

  @ApiProperty({ type: Boolean, example: false })
  qrAvailable: boolean;

  @ApiProperty({
    type: Boolean,
    example: false,
    description:
      'True when saved account credentials were loaded or pairing supplied an account identity.',
  })
  hasSavedSession: boolean;

  @ApiProperty({
    type: Number,
    nullable: true,
    example: null,
    description: 'Most recent disconnect code; null if none is known.',
  })
  lastDisconnectCode: number | null;

  @ApiProperty({
    type: String,
    nullable: true,
    example:
      'Waiting for WhatsApp to generate a QR. Retry GET /whatsapp/qr shortly.',
  })
  qrUnavailableReason: string | null;

  @ApiProperty({ type: String, example: '/whatsapp/qr' })
  qrEndpoint: string;

  @ApiProperty({ type: String, example: '/whatsapp/qr/image' })
  qrImageEndpoint: string;
}

export class WhatsappPairingDto extends WhatsappStatusDto {
  @ApiProperty({
    type: String,
    nullable: true,
    example: null,
    description:
      'Raw WhatsApp pairing payload. Null until a QR is available, and after connection or disconnect.',
  })
  qr: string | null;

  @ApiProperty({
    type: String,
    nullable: true,
    example: null,
    description:
      'Scannable PNG data URL (data:image/png;base64,...). Use as an image src; poll while connecting.',
  })
  qrDataUrl: string | null;
}

export class WhatsappGroupDto {
  @ApiProperty({ type: String, example: '120363000000000000@g.us' })
  id: string;

  @ApiProperty({ type: String, example: 'Operations' })
  name: string;

  @ApiProperty({ type: Number, example: 12 })
  participants: number;

  @ApiProperty({
    type: Boolean,
    example: false,
    description: 'True when only group admins may post.',
  })
  announcementOnly: boolean;
}

export class SendGroupMessageDto {
  @ApiProperty({
    type: String,
    pattern: '^\\d+(?:-\\d+)?@g\\.us$',
    example: '120363000000000000@g.us',
    description: 'An existing group ID from GET /whatsapp/groups.',
  })
  groupJid: string;

  @ApiProperty({
    type: String,
    minLength: 1,
    maxLength: 65536,
    example: 'Hello from our WhatsApp service',
    description: 'Message text; leading and trailing whitespace is trimmed.',
  })
  text: string;
}

export class GroupMessageSentDto {
  @ApiProperty({ type: String, example: '120363000000000000@g.us' })
  groupJid: string;

  @ApiProperty({ type: String, example: '3EB0123456789ABCDEF' })
  messageId: string;

  @ApiProperty({
    type: String,
    enum: ['sent'],
    description:
      'Baileys completed the send call. This does not confirm delivery or reading by members.',
  })
  status: 'sent';
}

export class PairingQrUnavailableDto extends WhatsappPairingDto {
  @ApiProperty({ type: Number, example: 404 })
  statusCode: number;

  @ApiProperty({ type: String, example: 'Not Found' })
  error: string;

  @ApiProperty({
    type: String,
    example:
      'Restoring a saved WhatsApp session; no QR is generated for an existing login. Poll GET /whatsapp/status for connected.',
  })
  message: string;
}
