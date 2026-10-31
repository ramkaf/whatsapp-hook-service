import {
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnModuleDestroy,
  ServiceUnavailableException,
} from '@nestjs/common';
import type { WASocket } from 'baileys';
import QRCode from 'qrcode';
import { SessionStatus } from '../enum/session-status.enum.ts';
import { WhatsappSocketFactory } from './wa-socket.factory.ts';
import { WhatsappSessionState } from './wa-session.state.ts';
import qrcode from 'qrcode-terminal';
import { WhatsappConnectionHandler } from './wa-connection.handler.ts';
import { ConnectionResult } from '../interfaces/wa-connection-handler.interface.ts';
@Injectable()
export class WhatsappConnectService
  implements OnModuleDestroy, OnApplicationBootstrap
{
  private readonly logger = new Logger(WhatsappConnectService.name);

  private socket?: WASocket;
  private connecting?: Promise<void>;
  private reconnectTimer?: ReturnType<typeof setTimeout>;

  private reconnectAttempts = 0;
  private stopped = false;

  constructor(
    private readonly factory: WhatsappSocketFactory,
    private readonly state: WhatsappSessionState,
    private readonly handler: WhatsappConnectionHandler,
  ) {}

  onApplicationBootstrap(): void {
    this.logger.log('Starting WhatsApp connection automatically');
    void this.connect().catch((error: unknown) => {
      this.logger.error(
        'Initial WhatsApp connection failed',
        error instanceof Error ? error.stack : String(error),
      );
      if (!this.stopped) {
        this.scheduleReconnect(5000);
      }
    });
  }
  async onModuleDestroy(): Promise<void> {
    this.stopped = true;
    this.clearReconnectTimer();

    await this.connecting?.catch(() => undefined);

    const socket = this.socket;
    this.socket = undefined;

    if (socket) {
      await this.endSocket(socket);
    }

    this.state.setDisconnected(SessionStatus.DISCONNECTED);
  }

  async connect(): Promise<ReturnType<WhatsappSessionState['getSnapshot']>> {
    if (this.stopped) {
      throw new ServiceUnavailableException(
        'WhatsApp service is shutting down',
      );
    }

    if (this.connecting) {
      await this.connecting;
      return this.getStatus();
    }

    if (this.socket || this.reconnectTimer) {
      return this.getStatus();
    }

    const operation = this.openSocket();
    this.connecting = operation;

    try {
      await operation;
    } finally {
      if (this.connecting === operation) {
        this.connecting = undefined;
      }
    }

    return this.getStatus();
  }

  getStatus() {
    return this.state.getSnapshot();
  }

  async getQr() {
    const qr = this.state.getQr();

    if (!qr) {
      return {
        ...this.getStatus(),
        qr: null,
        qrDataUrl: null,
      };
    }

    const qrDataUrl = await QRCode.toDataURL(qr, {
      errorCorrectionLevel: 'L',
      margin: 4,
      scale: 8,
    });
    qrcode.generate(qr, {
      small: true,
    });

    // QR may expire or rotate while being encoded.
    if (this.state.getQr() !== qr) {
      return {
        ...this.getStatus(),
        qr: null,
        qrDataUrl: null,
      };
    }

    return {
      ...this.getStatus(),
      qr,
      qrDataUrl,
    };
  }

  getSocket(): WASocket {
    if (!this.state.isConnected() || !this.socket) {
      throw new ServiceUnavailableException('WhatsApp is not connected');
    }

    return this.socket;
  }

  private async openSocket(): Promise<void> {
    this.state.setConnecting();

    try {
      const { socket, saveCreds, hasSavedSession } =
        await this.factory.create();

      if (this.stopped) {
        await this.endSocket(socket);
        return;
      }

      this.socket = socket;
      this.state.setSavedSession(hasSavedSession);

      this.registerEvents(socket, saveCreds);
    } catch (error) {
      this.state.setDisconnected(SessionStatus.ERROR);

      this.logger.error(
        'Could not initialize WhatsApp socket',
        error instanceof Error ? error.stack : String(error),
      );

      throw new ServiceUnavailableException(
        'Could not initialize WhatsApp connection',
      );
    }
  }

  private registerEvents(
    socket: WASocket,
    saveCreds: () => Promise<void>,
  ): void {
    let saveQueue = Promise.resolve();

    socket.ev.on('creds.update', (creds) => {
      if (!this.isActive(socket)) return;

      if (creds.me) {
        this.state.setSavedSession(true);
      }

      // Serialize credential writes for this socket.
      saveQueue = saveQueue
        .then(async () => {
          if (!this.isActive(socket)) return;
          await saveCreds();
        })
        .catch((error: unknown) => {
          if (!this.isActive(socket)) return;

          void this.handleCredentialFailure(socket, error);
        });
    });

    socket.ev.on('connection.update', (update) => {
      if (!this.isActive(socket)) return;

      const result = this.handler.handle(
        socket,
        update,
        this.reconnectAttempts,
      );

      switch (result.type) {
        case 'connected':
          this.reconnectAttempts = 0;
          break;

        case 'disconnected':
          void this.handleSocketClosed(socket, result);
          break;
      }
    });
  }

  private isActive(socket: WASocket): boolean {
    return !this.stopped && this.socket === socket;
  }

  private async handleSocketClosed(
    socket: WASocket,
    result: Extract<ConnectionResult, { type: 'disconnected' }>,
  ): Promise<void> {
    if (!this.isActive(socket)) return;

    this.socket = undefined;

    await this.endSocket(socket);

    if (this.stopped) return;

    if (!result.shouldReconnect) {
      return;
    }

    if (result.delayMs > 0) {
      this.reconnectAttempts++;
    }

    this.scheduleReconnect(result.delayMs);
  }

  private scheduleReconnect(delayMs: number): void {
    if (this.stopped || this.reconnectTimer) return;

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = undefined;

      if (this.stopped) return;

      void this.connect().catch((error: unknown) => {
        this.logger.error(
          'WhatsApp reconnect attempt failed',
          error instanceof Error ? error.message : String(error),
        );

        if (!this.stopped) {
          this.reconnectAttempts++;

          const retryDelay = Math.min(
            1000 * 2 ** Math.min(this.reconnectAttempts, 5),
            30000,
          );

          this.scheduleReconnect(retryDelay);
        }
      });
    }, delayMs);
  }

  private async handleCredentialFailure(
    socket: WASocket,
    error: unknown,
  ): Promise<void> {
    if (!this.isActive(socket)) return;

    this.logger.error(
      'Could not save WhatsApp credentials',
      error instanceof Error ? error.stack : String(error),
    );

    this.socket = undefined;

    await this.endSocket(socket);

    if (!this.stopped) {
      this.state.setDisconnected(SessionStatus.ERROR);
    }
  }

  private async endSocket(socket: WASocket): Promise<void> {
    try {
      await socket.end(new Error('WhatsApp connection closed by service'));
    } catch (error) {
      this.logger.warn(
        `Could not close WhatsApp socket cleanly: ${String(error)}`,
      );
    }
  }

  async disconnect(): Promise<void> {
    this.clearReconnectTimer();

    // Wait until socket creation finishes, if in progress.
    await this.connecting?.catch(() => undefined);

    const socket = this.socket;
    this.socket = undefined;

    if (socket) {
      await this.endSocket(socket);
    }

    this.reconnectAttempts = 0;
    this.state.setDisconnected(SessionStatus.DISCONNECTED);
  }

  private clearReconnectTimer(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = undefined;
    }
  }
}
