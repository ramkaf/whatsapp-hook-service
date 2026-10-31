import { Injectable, Logger } from '@nestjs/common';
import type { WASocket, WAMessage } from 'baileys';
import { join } from 'node:path';
import { appendJsonToFile } from '../../../common/utils/file.util.ts';
import { WhatsappMediaService } from './whatsapp-media.service.ts';
import { extractRepliedMessage } from '../utils/replied-message.util.ts';

@Injectable()
export class WhatsappMessageService {
  constructor(private readonly whatsappMediaService: WhatsappMediaService) {}
  private readonly logger = new Logger(WhatsappMessageService.name);

  private readonly storagePath = join(
    process.cwd(),
    'storage',
    'whatsapp',
    'groups',
  );

  // Cache group subjects
  private readonly groupSubjectCache = new Map<string, string>();

  // Keep writes ordered per group
  private readonly writeQueues = new Map<string, Promise<void>>();

  async handleUpsert(socket: WASocket, messages: WAMessage[]): Promise<void> {
    for (const message of messages) {
      const chatId = message.key.remoteJid;

      if (!chatId || !message.message || message.key.fromMe) {
        continue;
      }

      const isGroup = chatId.endsWith('@g.us');

      const isPrivate =
        chatId.endsWith('@s.whatsapp.net') || chatId.endsWith('@lid');

      if (!isGroup && !isPrivate) {
        continue;
      }

      const directory = isGroup ? 'groups' : 'chats';
      const safeChatId = chatId.replace(/[^a-zA-Z0-9@._:-]/g, '_');

      const filePath = join(
        process.cwd(),
        'storage',
        'whatsapp',
        directory,
        `${safeChatId}.jsonl`,
      );

      const repliedMessage = extractRepliedMessage(message);

      try {
        // Archive incoming message
        await this.appendInOrder(filePath, {
          event: 'message.received',
          receivedAt: new Date().toISOString(),
          chatId,
          message,
          ...(repliedMessage ? { repliedMessage } : {}),
        });
      } catch (error) {
        this.logger.error(
          `Failed to archive message: ${message.key.id}`,
          error instanceof Error ? error.stack : String(error),
        );
        continue;
      }

      // Store incoming and quoted media independently so either can succeed.
      const mediaMessages = repliedMessage
        ? [message, repliedMessage]
        : [message];
      for (const mediaMessage of mediaMessages) {
        const replyMetadata =
          mediaMessage === repliedMessage ? { repliedMessage } : {};

        try {
          const media = await this.whatsappMediaService.save(
            socket,
            mediaMessage,
            { skipIfStored: mediaMessage === repliedMessage },
          );

          if (media) {
            await this.appendInOrder(filePath, {
              event: 'media.stored',
              receivedAt: new Date().toISOString(),
              chatId,
              messageId: message.key.id,
              ...replyMetadata,
              media,
            });
          }
        } catch (error) {
          this.logger.error(
            `Failed to store media: ${mediaMessage.key.id} | replyTo=${message.key.id}`,
            error instanceof Error ? error.stack : String(error),
          );

          await this.appendInOrder(filePath, {
            event: 'media.failed',
            receivedAt: new Date().toISOString(),
            chatId,
            messageId: message.key.id,
            ...replyMetadata,
            error: error instanceof Error ? error.message : String(error),
          }).catch((archiveError) => {
            this.logger.error(
              'Failed to archive media failure',
              archiveError instanceof Error
                ? archiveError.stack
                : String(archiveError),
            );
          });
        }
      }
    }
  }

  private async getGroupSubject(
    socket: WASocket,
    groupJid: string,
  ): Promise<string> {
    const cached = this.groupSubjectCache.get(groupJid);

    if (cached) {
      return cached;
    }

    try {
      const metadata = await socket.groupMetadata(groupJid);

      const subject = metadata.subject?.trim() || groupJid;

      this.groupSubjectCache.set(groupJid, subject);

      return subject;
    } catch (error) {
      this.logger.warn(`Could not fetch group metadata: ${groupJid}`);

      return groupJid;
    }
  }

  private createFileName(groupSubject: string, groupJid: string): string {
    const safeName = groupSubject
      .replace(/[<>:"/\\|?*\u0000-\u001F]/g, '_')
      .replace(/\s+/g, '_')
      .replace(/[. ]+$/g, '')
      .slice(0, 80);

    const groupId = groupJid
      .replace(/@g\.us$/, '')
      .replace(/[^a-zA-Z0-9_-]/g, '_');

    return `${safeName || 'group'}__${groupId}.jsonl`;
  }

  private async appendInOrder(filePath: string, data: unknown): Promise<void> {
    const previous = this.writeQueues.get(filePath) ?? Promise.resolve();

    const current = previous
      .catch(() => undefined)
      .then(() => appendJsonToFile(filePath, data));

    this.writeQueues.set(filePath, current);

    try {
      await current;
    } finally {
      if (this.writeQueues.get(filePath) === current) {
        this.writeQueues.delete(filePath);
      }
    }
  }
}
