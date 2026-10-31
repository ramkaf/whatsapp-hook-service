import { SessionStatus } from '../enum/session-status.enum.ts';

export interface WaSessionSnapshot {
  status: SessionStatus;
  accountJid: string | null;
  qrAvailable: boolean;
  hasSavedSession: boolean;
  lastDisconnectCode: number | null;
  qrUnavailableReason: string | null;
  qrEndpoint: string;
}
