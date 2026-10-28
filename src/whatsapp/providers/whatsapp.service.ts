import {
  BadGatewayException,
  BadRequestException,
  ForbiddenException,
  Injectable,
  Inject,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import type { OnModuleDestroy } from '@nestjs/common';
import makeWASocket, { DisconnectReason, useMultiFileAuthState } from 'baileys';
import type { ConnectionState, WASocket } from 'baileys';
import Joi from 'joi';
import { chmod, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import qrcode from 'qrcode-terminal';
import QRCode from 'qrcode';
import { WhatsappGroupMonitorService } from './whatsapp-group-monitor.service.ts';

type SessionStatus =
  | 'disconnected'
  | 'connecting'
  | 'awaiting_qr'
  | 'connected'
  | 'logged_out'
  | 'error';

const messageSchema = Joi.object({
  groupJid: Joi.string()
    .pattern(/^\d+(?:-\d+)?@g\.us$/)
    .required(),
  text: Joi.string().trim().max(65536).required(),
}).required();

@Injectable()
export class WhatsappService implements OnModuleDestroy {
  private readonly logger = new Logger(WhatsappService.name);
  private socket?: WASocket;
  private status: SessionStatus = 'disconnected';
  private connecting?: Promise<void>;
  private reconnectTimer?: ReturnType<typeof setTimeout>;
  private reconnectAttempts = 0;
  private stopped = false;
  private pairingQr?: string;
  private hasSavedSession = false;
  private lastDisconnectCode: number | null = null;

  constructor(
    @Inject(WhatsappGroupMonitorService)
    private readonly groupMonitor: WhatsappGroupMonitorService,
  ) {}

  getStatus() {
    return {
      status: this.status,
      accountJid: this.socket?.user?.id ?? null,
      qrAvailable: this.pairingQr !== undefined,
      hasSavedSession: this.hasSavedSession,
      lastDisconnectCode: this.lastDisconnectCode,
      qrUnavailableReason: this.getQrUnavailableReason(),
      qrEndpoint: '/whatsapp/qr',
      qrImageEndpoint: '/whatsapp/qr/image',
    };
  }

  private getQrUnavailableReason() {
    if (this.pairingQr) return null;
    if (this.status === 'connected')
      return 'Already connected; no QR is needed.';
    if (this.status === 'logged_out')
      return 'WhatsApp logged out. Use a fresh auth directory to pair again.';
    if (this.status === 'error')
      return 'The connection failed. Check lastDisconnectCode and the server connection logs.';
    if (this.status === 'disconnected')
      return 'Call POST /whatsapp/connect to start connecting.';
    if (this.hasSavedSession)
      return 'Restoring a saved WhatsApp session; no QR is generated for an existing login. Poll GET /whatsapp/status for connected.';
    return 'Waiting for WhatsApp to generate a QR. Retry GET /whatsapp/qr shortly.';
  }

  async getQr() {
    const qr = this.pairingQr;
    if (!qr) return { ...this.getStatus(), qr: null, qrDataUrl: null };
    const qrDataUrl = await QRCode.toDataURL(qr, {
      errorCorrectionLevel: 'L',
      margin: 4,
      scale: 8,
    });
    // Pairing or QR rotation can finish while the PNG is being encoded.
    if (this.pairingQr !== qr) {
      return { ...this.getStatus(), qr: null, qrDataUrl: null };
    }
    return { ...this.getStatus(), qr, qrDataUrl };
  }

  async connect() {
    if (this.stopped) {
      throw new ServiceUnavailableException('WhatsApp is shutting down');
    }
    if (this.socket || this.reconnectTimer) return this.getStatus();
    if (!this.connecting) {
      this.connecting = this.openSocket().finally(() => {
        this.connecting = undefined;
      });
    }
    await this.connecting;
    return this.getStatus();
  }

  async listGroups() {
    const socket = this.requireConnected();
    try {
      const groups = await socket.groupFetchAllParticipating();
      return Object.values(groups).map((group) => ({
        id: group.id,
        name: group.subject,
        participants: group.participants.length,
        announcementOnly: group.announce ?? false,
      }));
    } catch {
      throw new BadGatewayException('Could not fetch WhatsApp groups');
    }
  }

  async sendGroupMessage(body: unknown) {
    const result = messageSchema.validate(body, { abortEarly: false });
    if (result.error) throw new BadRequestException(result.error.message);
    const { groupJid, text } = result.value as {
      groupJid: string;
      text: string;
    };
    const socket = this.requireConnected();
    // Only allow groups the linked account currently belongs to.
    const groups = await this.listGroups();
    if (!groups.some((group) => group.id === groupJid)) {
      throw new ForbiddenException(
        'The linked account is not a member of this group',
      );
    }
    try {
      const message = await socket.sendMessage(groupJid, { text });
      if (!message?.key.id) throw new Error('Missing message ID');
      return { groupJid, messageId: message.key.id, status: 'sent' as const };
    } catch {
      // Do not retry sends automatically: an uncertain result could duplicate a message.
      throw new BadGatewayException(
        'WhatsApp send failed; check the group before retrying',
      );
    }
  }

  async onModuleDestroy() {
    this.stopped = true;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = undefined;
    await this.connecting?.catch(() => undefined);
    await this.closeSocket();
  }

  private requireConnected() {
    if (this.status !== 'connected' || !this.socket) {
      throw new ServiceUnavailableException(
        'WhatsApp is not connected; connect and scan the terminal QR first',
      );
    }
    return this.socket;
  }

  private async openSocket() {
    this.pairingQr = undefined;
    this.status = 'connecting';
    try {
      const authDir = resolve(
        process.env.WHATSAPP_AUTH_DIR || '.data/whatsapp-auth',
      );
      await mkdir(authDir, { recursive: true, mode: 0o700 });
      await chmod(authDir, 0o700);
      const { state, saveCreds } = await useMultiFileAuthState(authDir);
      this.hasSavedSession = Boolean(state.creds?.me);
      if (this.stopped) return;
      const socket = makeWASocket({
        auth: state,
        markOnlineOnConnect: false,
        syncFullHistory: false,
        shouldSyncHistoryMessage: () => false,
      });
      this.socket = socket;
      this.groupMonitor.attach(
        socket,
        () => !this.stopped && this.socket === socket,
      );
      socket.ev.on('creds.update', (creds) => {
        if (this.socket !== socket || this.stopped) return;
        if (creds.me) this.hasSavedSession = true;
        void saveCreds().catch(async () => {
          if (this.socket !== socket || this.stopped) return;
          this.logger.error(
            'Could not save WhatsApp credentials; check auth directory permissions',
          );
          await this.closeSocket();
          this.status = 'error';
        });
      });
      socket.ev.on('connection.update', (update) =>
        this.handleConnection(socket, update),
      );
    } catch {
      this.status = 'error';
      throw new ServiceUnavailableException(
        'Could not initialize WhatsApp; check the auth directory and server logs',
      );
    }
  }

  private handleConnection(socket: WASocket, update: Partial<ConnectionState>) {
    if (this.stopped || this.socket !== socket) return;
    if (update.qr) {
      this.pairingQr = update.qr;
      this.status = 'awaiting_qr';
      this.logger.log(
        'Scan this QR in WhatsApp Business > Linked devices > Link a device',
      );
      qrcode.generate(update.qr, { small: true });
    }
    if (update.connection === 'open') {
      this.pairingQr = undefined;
      this.status = 'connected';
      this.reconnectAttempts = 0;
      this.logger.log('WhatsApp connected');
    }
    if (update.connection !== 'close') return;
    this.pairingQr = undefined;
    this.socket = undefined;
    const error = update.lastDisconnect?.error as
      { output?: { statusCode?: number } } | undefined;
    const code = error?.output?.statusCode;
    this.lastDisconnectCode = code ?? null;
    if (code === DisconnectReason.loggedOut) {
      this.status = 'logged_out';
      this.logger.warn(
        'WhatsApp logged out. Stop the app, remove the auth directory, and pair again',
      );
      return;
    }
    if (
      code === DisconnectReason.badSession ||
      code === DisconnectReason.connectionReplaced ||
      code === DisconnectReason.multideviceMismatch ||
      code === DisconnectReason.forbidden
    ) {
      this.status = 'error';
      this.logger.warn(
        `WhatsApp connection stopped (code ${code}); resolve the session issue before connecting again`,
      );
      return;
    }
    this.status = 'connecting';
    const delay =
      code === DisconnectReason.restartRequired
        ? 0
        : Math.min(1000 * 2 ** Math.min(this.reconnectAttempts++, 5), 30000);
    this.logger.warn(
      `WhatsApp disconnected (code ${code ?? 'unknown'}); reconnecting in ${delay} ms`,
    );
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = undefined;
      void this.connect().catch(() => {
        this.logger.error(
          'WhatsApp reconnect failed; call the connect endpoint to retry',
        );
      });
    }, delay);
  }

  private async closeSocket() {
    this.pairingQr = undefined;
    const socket = this.socket;
    this.socket = undefined;
    this.status = 'disconnected';
    // Close the transport, preserving credentials; do not log the account out.
    try {
      await socket?.end(new Error('WhatsApp connection closed by service'));
    } catch {
      this.logger.warn('Could not cleanly close the WhatsApp transport');
    }
  }
}
