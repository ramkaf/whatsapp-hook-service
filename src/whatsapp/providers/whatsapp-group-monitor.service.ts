import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  getContentType,
  jidNormalizedUser,
  normalizeMessageContent,
} from 'baileys';
import type {
  BaileysEventMap,
  Contact,
  GroupMetadata,
  WASocket,
  WAMessage,
} from 'baileys';
import { whatsappConfiguration } from '../../libs/common/config/whatsapp.config.ts';
import { GroupMessageHandler } from './group-message.handler.ts';
import type { GroupMessageContext } from '../group-message.context.ts';

@Injectable()
export class WhatsappGroupMonitorService {
  private readonly logger = new Logger(WhatsappGroupMonitorService.name);
  // Bounded, process-local deduplication survives socket reconnects, not app restarts.
  private readonly seen = new Map<string, true>();
  private readonly contacts = new Map<string, Partial<Contact>>();

  constructor(
    @Inject(GroupMessageHandler) private readonly handler: GroupMessageHandler,
  ) {}

  attach(socket: WASocket, isCurrent: () => boolean) {
    const remember = (contacts: Partial<Contact>[]) => {
      if (!isCurrent()) return;
      for (const contact of contacts) {
        const ids = [contact.id, contact.lid, contact.phoneNumber].filter(
          (id): id is string => Boolean(id),
        );
        const previous = ids
          .map((id) => this.contacts.get(jidNormalizedUser(id)))
          .find(Boolean);
        for (const id of ids) {
          this.contacts.set(jidNormalizedUser(id), { ...previous, ...contact });
        }
      }
      while (this.contacts.size > 10000)
        this.contacts.delete(this.contacts.keys().next().value!);
    };
    socket.ev.on('contacts.upsert', remember);
    socket.ev.on('contacts.update', remember);
    socket.ev.on('messaging-history.set', ({ contacts }) => remember(contacts));
    socket.ev.on('messages.upsert', (event) => {
      void this.process(socket, event, isCurrent).catch(() => {
        this.logger.error('Could not process WhatsApp message batch');
      });
    });
  }

  async process(
    socket: WASocket,
    event: BaileysEventMap['messages.upsert'],
    isCurrent: () => boolean,
  ) {
    // Ignore history replay, own messages and non-group conversations.
    if (event.type !== 'notify' || !isCurrent()) return;
    const monitored = new Set(whatsappConfiguration().monitoredGroupJids);
    const groups = new Map<string, GroupMetadata | null>();
    for (const message of event.messages) {
      if (!isCurrent()) return;
      const {
        remoteJid: groupJid,
        participant: senderJid,
        id,
        fromMe,
      } = message.key;
      if (
        !groupJid?.endsWith('@g.us') ||
        (!monitored.has('*') && !monitored.has(groupJid)) ||
        fromMe ||
        !id ||
        !senderJid ||
        !message.message
      )
        continue;
      const content = normalizeMessageContent(message.message);
      if (
        !content ||
        !getContentType(content) ||
        getContentType(content) === 'protocolMessage'
      )
        continue;
      const dedupeKey = JSON.stringify([
        groupJid,
        jidNormalizedUser(senderJid),
        id,
      ]);
      if (this.seen.has(dedupeKey)) continue;
      // Reserve before awaiting enrichment so overlapping batches cannot execute twice.
      this.seen.set(dedupeKey, true);
      if (this.seen.size > 10000)
        this.seen.delete(this.seen.keys().next().value!);
      try {
        if (!groups.has(groupJid)) {
          groups.set(
            groupJid,
            await socket.groupMetadata(groupJid).catch(() => null),
          );
        }
        if (!isCurrent()) return;
        const context = this.buildContext(
          message,
          content,
          groups.get(groupJid) ?? null,
        );
        await this.handler.handle(context);
      } catch {
        // Isolate handler failures so later messages in the batch still execute.
        this.logger.error(`Group message handler failed for message ${id}`);
      }
    }
  }

  private buildContext(
    message: WAMessage,
    content: NonNullable<WAMessage['message']>,
    group: GroupMetadata | null,
  ): GroupMessageContext {
    const jid = jidNormalizedUser(message.key.participant!);
    const alternateJid = message.key.participantAlt
      ? jidNormalizedUser(message.key.participantAlt)
      : null;
    const ids = [jid, alternateJid].filter((id): id is string => Boolean(id));
    const participant =
      group?.participants.find((member) =>
        [member.id, member.lid, member.phoneNumber].some(
          (id) => id && ids.includes(jidNormalizedUser(id)),
        ),
      ) ?? null;
    const contact =
      ids.map((id) => this.contacts.get(id)).find(Boolean) ?? null;
    const phoneJid = [
      ...ids,
      participant?.id,
      participant?.phoneNumber,
      contact?.id,
      contact?.phoneNumber,
    ].find((id) => id?.endsWith('@s.whatsapp.net'));
    const seconds =
      message.messageTimestamp == null
        ? null
        : Number(message.messageTimestamp.toString());
    const timestamp = seconds == null ? NaN : seconds * 1000;
    return {
      messageId: message.key.id!,
      groupJid: message.key.remoteJid!,
      group,
      sender: {
        jid,
        alternateJid,
        // An @lid is an opaque identity, never a telephone number.
        phoneNumber: phoneJid
          ? jidNormalizedUser(phoneJid).split('@')[0]!
          : null,
        displayName:
          contact?.name ??
          message.pushName ??
          contact?.notify ??
          participant?.name ??
          null,
        contact,
        participant,
      },
      sentAt:
        Number.isFinite(timestamp) && Math.abs(timestamp) <= 8.64e15
          ? new Date(timestamp)
          : null,
      receivedAt: new Date(),
      type: getContentType(content) ?? null,
      text:
        content.conversation ??
        content.extendedTextMessage?.text ??
        content.imageMessage?.caption ??
        content.videoMessage?.caption ??
        content.documentMessage?.caption ??
        null,
      content,
      raw: message,
    };
  }
}
