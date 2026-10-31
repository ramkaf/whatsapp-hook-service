import { getContentType, normalizeMessageContent } from 'baileys';
import type { proto, WAMessage } from 'baileys';

// Reconstructs the quoted message using its original identifiers and content.
export function extractRepliedMessage(message: WAMessage): WAMessage | null {
  const content = normalizeMessageContent(message.message);
  const type = content && getContentType(content);
  const payload = type ? content?.[type] : undefined;

  if (!payload || typeof payload !== 'object' || !('contextInfo' in payload)) {
    return null;
  }

  const context = payload.contextInfo as proto.IContextInfo | null | undefined;
  if (!context?.quotedMessage) {
    return null;
  }

  return {
    key: {
      remoteJid: context.remoteJid || message.key.remoteJid,
      id: context.stanzaId,
      participant: context.participant,
    },
    message: context.quotedMessage,
  };
}
