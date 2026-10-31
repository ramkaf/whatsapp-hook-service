import { Injectable, Logger } from '@nestjs/common';
import type { ConnectionState, WASocket } from 'baileys';

import { WhatsappSessionState } from './wa-session.state.ts';
import { getReconnectDecision } from './wa-reconnect.policy.ts';
import { ConnectionResult } from '../interfaces/wa-connection-handler.interface.ts';
import { WhatsappMessageService } from '../../messages/providers/whatsapp-message.service.ts';

@Injectable()
export class WhatsappConnectionHandler {
  private readonly logger = new Logger(WhatsappConnectionHandler.name);
  private readonly registeredSockets = new WeakSet<WASocket>();
  constructor(
    private readonly state: WhatsappSessionState,
    private readonly whatsappMessageService: WhatsappMessageService,
  ) {}

  handle(
    socket: WASocket,
    update: Partial<ConnectionState>,
    attempts: number,
  ): ConnectionResult {
    this.registerMessageListener(socket);

    switch (update.connection) {
      case 'close':
        return this.handleClosed(update, attempts);

      case 'open':
        return this.handleOpened(socket);

      case 'connecting':
        return this.handleConnecting();

      default:
        return this.handleUpdate(update);
    }
  }

  private handleOpened(socket: WASocket): ConnectionResult {
    this.state.setConnected(socket.user?.id ?? null);

    this.logger.log('WhatsApp connection established');

    return { type: 'connected' };
  }

  private handleConnecting(): ConnectionResult {
    // Do not overwrite an already available pairing QR.
    if (this.state.getQr()) {
      return { type: 'none' };
    }

    // Do not reset an already established connection.
    if (this.state.isConnected()) {
      return { type: 'none' };
    }

    // Do not reset terminal error states on unexpected updates.
    const status = this.state.getStatus();

    if (status !== 'connecting') {
      this.state.setConnecting();
    }

    return { type: 'connecting' };
  }

  private handleUpdate(update: Partial<ConnectionState>): ConnectionResult {
    if (!update.qr) {
      return { type: 'none' };
    }

    this.state.setQr(update.qr);

    this.logger.log('WhatsApp pairing QR generated');

    return { type: 'qr' };
  }

  private handleClosed(
    update: Partial<ConnectionState>,
    attempts: number,
  ): ConnectionResult {
    const code = this.getDisconnectCode(update);

    const decision = getReconnectDecision(code, attempts);

    this.state.setDisconnected(decision.status, code);

    if (decision.shouldReconnect) {
      this.logger.warn(
        `WhatsApp disconnected | code=${code ?? 'unknown'} | attempt=${attempts + 1} | retryIn=${decision.delayMs}ms`,
      );
    } else {
      this.logger.error(
        `WhatsApp connection stopped | code=${code ?? 'unknown'} | status=${decision.status}`,
      );
    }

    return {
      type: 'disconnected',
      shouldReconnect: decision.shouldReconnect,
      delayMs: decision.delayMs,
      code,
    };
  }

  private getDisconnectCode(update: Partial<ConnectionState>): number | null {
    const error = update.lastDisconnect?.error;

    if (!error || typeof error !== 'object') {
      return null;
    }

    if (!('output' in error)) {
      return null;
    }

    const output = error.output;

    if (!output || typeof output !== 'object') {
      return null;
    }

    if (!('statusCode' in output)) {
      return null;
    }

    return typeof output.statusCode === 'number' ? output.statusCode : null;
  }

  private registerMessageListener(socket: WASocket): void {
    if (this.registeredSockets.has(socket)) {
      return;
    }

    this.registeredSockets.add(socket);

    socket.ev.on('messages.upsert', ({ messages }) => {
      void this.whatsappMessageService
        .handleUpsert(socket, messages)
        .catch((error) => {
          this.logger.error(
            'Failed to handle incoming messages',
            error instanceof Error ? error.stack : String(error),
          );
        });
    });

    this.logger.log('WhatsApp message listener registered');
  }
}
