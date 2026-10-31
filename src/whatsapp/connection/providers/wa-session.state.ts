import { Injectable } from '@nestjs/common';
import { SessionStatus } from '../enum/session-status.enum.ts';
import type { WaSessionSnapshot } from '../interfaces/wa-session-snapshot.interface.ts';

@Injectable()
export class WhatsappSessionState {
  private status = SessionStatus.DISCONNECTED;

  private qr: string | null = null;
  private accountJid: string | null = null;
  private hasSavedSession = false;
  private lastDisconnectCode: number | null = null;

  setConnecting(): void {
    this.status = SessionStatus.CONNECTING;
    this.qr = null;
    this.accountJid = null;
  }

  setQr(qr: string): void {
    this.qr = qr;
    this.status = SessionStatus.AWAITING_QR;
  }

  setConnected(accountJid: string | null): void {
    this.status = SessionStatus.CONNECTED;
    this.accountJid = accountJid;
    this.qr = null;
    this.lastDisconnectCode = null;
  }

  setDisconnected(status: SessionStatus, code: number | null = null): void {
    this.status = status;
    this.qr = null;
    this.accountJid = null;
    this.lastDisconnectCode = code;
  }

  setSavedSession(value: boolean): void {
    this.hasSavedSession = value;
  }

  getQr(): string | null {
    return this.qr;
  }

  getStatus(): SessionStatus {
    return this.status;
  }

  isConnected(): boolean {
    return this.status === SessionStatus.CONNECTED;
  }

  getSnapshot(): WaSessionSnapshot {
    return {
      status: this.status,
      accountJid: this.accountJid,
      qrAvailable: this.qr !== null,
      hasSavedSession: this.hasSavedSession,
      lastDisconnectCode: this.lastDisconnectCode,
      qrUnavailableReason: this.getQrUnavailableReason(),
      qrEndpoint: '/whatsapp/qr',
    };
  }

  private getQrUnavailableReason(): string | null {
    if (this.qr) return null;

    switch (this.status) {
      case SessionStatus.CONNECTED:
        return 'WhatsApp is already connected.';

      case SessionStatus.LOGGED_OUT:
        return 'WhatsApp logged out. A fresh pairing session is required.';

      case SessionStatus.ERROR:
        return 'WhatsApp connection failed. Check server logs.';

      case SessionStatus.DISCONNECTED:
        return 'Call POST /whatsapp/connect to connect.';

      default:
        return this.hasSavedSession
          ? 'Restoring saved WhatsApp session.'
          : 'Waiting for WhatsApp to generate a QR code.';
    }
  }
}
