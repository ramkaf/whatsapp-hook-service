import { SessionStatus } from '../enum/session-status.enum.ts';

export interface ReconnectDecision {
  status: SessionStatus;
  shouldReconnect: boolean;
  delayMs: number;
  reason: 'terminal' | 'restart' | 'transient';
}
