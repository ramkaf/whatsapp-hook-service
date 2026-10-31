import { Injectable, Logger } from '@nestjs/common';
import { downloadMediaMessage, normalizeMessageContent } from 'baileys';
import type { WASocket, WAMessage, WAMessageContent } from 'baileys';
import pino from 'pino';
import { MinioStorageService } from '../../../storage/minio/providers/minio-storage.service.ts';
import { EXTENSIONS } from '../constants/media.constant.ts';
import type {
  ChatCategory,
  MediaDescriptor,
  MediaType,
  StoredWhatsappMedia,
} from '../interfaces/media.interface.ts';

export type { StoredWhatsappMedia } from '../interfaces/media.interface.ts';

@Injectable()
export class WhatsappMediaService {
  private readonly logger = new Logger(WhatsappMediaService.name);
  private readonly baileysLogger = pino({ level: 'silent' });

  // Injects the storage service used to upload media streams.
  constructor(private readonly storage: MinioStorageService) {}

  // Downloads supported message media and stores it with its metadata.
  async save(
    socket: WASocket,
    message: WAMessage,
    options: { skipIfStored?: boolean } = {},
  ): Promise<StoredWhatsappMedia | null> {
    const chatId = message.key.remoteJid;
    const messageId = message.key.id;
    const context = { chatId, messageId };
    const startedAt = Date.now();
    let operation = 'validate-message';

    try {
      this.logger.debug({ message: 'Media processing started', ...context });

      if (!chatId || !messageId || !message.message) {
        this.logger.debug({
          message: 'Media skipped: missing chat ID, message ID, or content',
          ...context,
        });
        return null;
      }

      const category = this.getChatCategory(chatId);
      if (!category) {
        this.logger.debug({
          message: 'Media skipped: unsupported chat type',
          ...context,
        });
        return null;
      }

      operation = 'describe-media';
      const content = normalizeMessageContent(message.message);
      const media = content ? this.getMediaDescriptor(content) : null;
      if (!media) {
        this.logger.debug({
          message: 'Media skipped: no supported media content',
          ...context,
        });
        return null;
      }

      this.logger.debug({
        message: 'Media identified',
        ...context,
        type: media.type,
        mimeType: media.mimeType,
      });

      operation = 'create-object-key';
      const senderId = message.key.participant || chatId;
      const objectKey = this.createObjectKey(
        category,
        chatId,
        senderId,
        messageId,
        media,
      );
      const mediaContext = {
        ...context,
        senderId,
        type: media.type,
        objectKey,
      };
      this.logger.debug({
        message: 'Media storage path created',
        ...mediaContext,
      });

      if (options.skipIfStored) {
        operation = 'check-stored-media';
        this.logger.debug({
          message: 'Checking whether replied media is already stored',
          ...mediaContext,
        });
        if (await this.storage.objectExists(objectKey)) {
          this.logger.log({
            message: 'Replied media skipped: already stored',
            ...mediaContext,
          });
          return null;
        }
      }

      operation = 'download-media';
      this.logger.debug({
        message: 'Media download requested',
        ...mediaContext,
      });
      const stream = await downloadMediaMessage(
        message,
        'stream',
        {},
        {
          logger: this.baileysLogger,
          reuploadRequest: socket.updateMediaMessage,
        },
      );
      this.logger.debug({
        message: 'Media download stream ready',
        ...mediaContext,
      });

      operation = 'upload-media';
      this.logger.debug({ message: 'Media upload started', ...mediaContext });
      const uploaded = await this.storage.uploadStream(
        objectKey,
        stream,
        media.mimeType,
      );

      this.logger.log({
        message: 'Media saved',
        ...mediaContext,
        bucket: uploaded.bucket,
        etag: uploaded.etag,
        durationMs: Date.now() - startedAt,
      });

      return {
        ...uploaded,
        chatId,
        senderId,
        messageId,
        type: media.type,
        mimeType: media.mimeType,
        originalFileName: media.originalFileName,
      };
    } catch (error) {
      this.logger.error(
        {
          message: 'Media processing failed',
          ...context,
          operation,
          error: error instanceof Error ? error.message : String(error),
          durationMs: Date.now() - startedAt,
        },
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  // Classifies supported chat IDs as group or private chats.
  private getChatCategory(chatId: string): ChatCategory | null {
    if (chatId.endsWith('@g.us')) {
      return 'groups';
    }

    if (chatId.endsWith('@s.whatsapp.net') || chatId.endsWith('@lid')) {
      return 'chats';
    }

    return null;
  }

  // Extracts media metadata from normalized message content.
  private getMediaDescriptor(
    content: WAMessageContent,
  ): MediaDescriptor | null {
    if (content.imageMessage) {
      return this.createMediaDescriptor(
        'image',
        content.imageMessage.mimetype || 'image/jpeg',
      );
    }

    if (content.videoMessage) {
      return this.createMediaDescriptor(
        'video',
        content.videoMessage.mimetype || 'video/mp4',
      );
    }

    if (content.audioMessage) {
      return this.createMediaDescriptor(
        content.audioMessage.ptt ? 'voice' : 'audio',
        content.audioMessage.mimetype || 'audio/ogg',
      );
    }

    if (content.documentMessage) {
      return this.createMediaDescriptor(
        'document',
        content.documentMessage.mimetype || 'application/octet-stream',
        content.documentMessage.fileName || null,
      );
    }

    if (content.stickerMessage) {
      return this.createMediaDescriptor(
        'sticker',
        content.stickerMessage.mimetype || 'image/webp',
      );
    }

    return null;
  }

  // Normalizes the MIME type and resolves the media file extension.
  private createMediaDescriptor(
    type: MediaType,
    mimeType: string,
    originalFileName: string | null = null,
  ): MediaDescriptor {
    const normalizedMime = mimeType.split(';')[0].trim().toLowerCase();
    const originalExtension = originalFileName
      ?.match(/\.([a-zA-Z0-9]{1,10})$/)?.[0]
      ?.toLowerCase();

    return {
      type,
      mimeType: normalizedMime,
      extension: originalExtension || EXTENSIONS[normalizedMime] || '.bin',
      originalFileName,
    };
  }

  // Builds the storage path from chat, sender, message, and media details.
  private createObjectKey(
    category: ChatCategory,
    chatId: string,
    senderId: string,
    messageId: string,
    media: MediaDescriptor,
  ): string {
    return [
      category,
      this.safeId(chatId),
      this.safeId(senderId),
      this.safeId(messageId),
      `${media.type}${media.extension}`,
    ].join('/');
  }

  // Replaces unsupported identifier characters and limits the length to 180 characters.
  private safeId(value: string): string {
    return value.replace(/[^a-zA-Z0-9@._:-]/g, '_').slice(0, 180);
  }
}
