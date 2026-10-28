import type {
  Contact,
  GroupMetadata,
  GroupParticipant,
  WAMessage,
  WAMessageContent,
} from 'baileys';

export interface GroupMessageContext {
  messageId: string;
  groupJid: string;
  group: GroupMetadata | null;
  sender: {
    jid: string;
    alternateJid: string | null;
    phoneNumber: string | null;
    displayName: string | null;
    contact: Partial<Contact> | null;
    participant: GroupParticipant | null;
  };
  sentAt: Date | null;
  receivedAt: Date;
  type: string | null;
  text: string | null;
  content: WAMessageContent;
  /** Original Baileys message, including quoted messages, mentions and media metadata. */
  raw: WAMessage;
}
