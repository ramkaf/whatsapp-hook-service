import { DisconnectReason } from 'baileys';
import { SessionStatus } from '../enum/session-status.enum.ts';
import { ReconnectDecision } from '../interfaces/wa-reconnect.interface.ts';

const TERMINAL_REASONS = new Set<number>([
  DisconnectReason.badSession,
  DisconnectReason.connectionReplaced,
  DisconnectReason.multideviceMismatch,
  DisconnectReason.forbidden,
]);

export function getReconnectDecision(
  code: number | null,
  attempt: number,
): ReconnectDecision {
  if (code === DisconnectReason.loggedOut) {
    return {
      status: SessionStatus.LOGGED_OUT,
      shouldReconnect: false,
      delayMs: 0,
      reason: 'terminal',
    };
  }

  if (code !== null && TERMINAL_REASONS.has(code)) {
    return {
      status: SessionStatus.ERROR,
      shouldReconnect: false,
      delayMs: 0,
      reason: 'terminal',
    };
  }

  if (code === DisconnectReason.restartRequired) {
    return {
      status: SessionStatus.CONNECTING,
      shouldReconnect: true,
      delayMs: 0,
      reason: 'restart',
    };
  }

  const safeAttempt = Math.max(0, Math.floor(attempt));

  const baseDelay = Math.min(1000 * 2 ** Math.min(safeAttempt, 5), 30_000);

  const minDelay = Math.floor(baseDelay * 0.8);

  const delayMs =
    minDelay + Math.floor(Math.random() * (baseDelay - minDelay + 1));

  return {
    status: SessionStatus.CONNECTING,
    shouldReconnect: true,
    delayMs,
    reason: 'transient',
  };
}
