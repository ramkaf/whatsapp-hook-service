import { PassThrough } from 'node:stream';
import { join } from 'node:path';
import { downloadMediaMessage } from 'baileys';
import type { WAMessage, WAMessageContent, WASocket } from 'baileys';
import { appendJsonToFile } from '../../../common/utils/file.util.ts';
import { MinioStorageService } from '../../../storage/minio/providers/minio-storage.service.ts';
import { extractRepliedMessage } from '../utils/replied-message.util.ts';
import { WhatsappMediaService } from './whatsapp-media.service.ts';
import { WhatsappMessageService } from './whatsapp-message.service.ts';

vi.mock('../../../common/utils/file.util.ts', () => ({
  appendJsonToFile: vi.fn(),
}));
vi.mock('baileys', async (importOriginal) => ({
  ...(await importOriginal<typeof import('baileys')>()),
  downloadMediaMessage: vi.fn(),
}));

describe('Reply media archiving', () => {
  const socket = { updateMediaMessage: vi.fn() } as unknown as WASocket;
  const chatId = '120363226037262665@g.us';
  const participant = 'original-sender@lid';
  const uploadStream = vi.fn();
  const objectExists = vi.fn();
  let service: WhatsappMessageService;

  // Builds a text reply to an image with distinct parent and quoted identities.
  const reply = (
    quotedMessage: WAMessageContent = {
      imageMessage: { mimetype: 'image/jpeg' },
    },
  ): WAMessage => ({
    key: {
      remoteJid: chatId,
      id: 'reply-id',
      participant: 'reply-sender@lid',
      fromMe: false,
    },
    message: {
      extendedTextMessage: {
        text: 'reply text',
        contextInfo: { stanzaId: 'original-id', participant, quotedMessage },
      },
    },
  });

  beforeEach(() => {
    vi.resetAllMocks();
    objectExists.mockResolvedValue(false);
    vi.mocked(appendJsonToFile).mockResolvedValue(undefined);
    vi.mocked(downloadMediaMessage).mockImplementation(async () =>
      new PassThrough().end('media'),
    );
    uploadStream.mockImplementation(async (objectKey: string) => ({
      bucket: 'media',
      objectKey,
      etag: 'etag',
    }));
    service = new WhatsappMessageService(
      new WhatsappMediaService({
        uploadStream,
        objectExists,
      } as unknown as MinioStorageService),
    );
  });

  // Returns the archived records without writing to real chat history.
  const records = () =>
    vi.mocked(appendJsonToFile).mock.calls.map(([, record]) => record);

  it('skips downloading and uploading quoted media that is already stored', async () => {
    objectExists.mockResolvedValue(true);
    await service.handleUpsert(socket, [reply()]);

    expect(objectExists).toHaveBeenCalledExactlyOnceWith(
      `groups/${chatId}/${participant}/original-id/image.jpg`,
    );
    expect(downloadMediaMessage).not.toHaveBeenCalled();
    expect(uploadStream).not.toHaveBeenCalled();
    expect(records()).toHaveLength(1);
  });

  it('still uploads ordinary media when the quoted media already exists', async () => {
    objectExists.mockResolvedValue(true);
    const incoming = reply();
    incoming.message = {
      imageMessage: {
        contextInfo: incoming.message!.extendedTextMessage!.contextInfo,
      },
    };
    await service.handleUpsert(socket, [incoming]);

    expect(objectExists).toHaveBeenCalledExactlyOnceWith(
      `groups/${chatId}/${participant}/original-id/image.jpg`,
    );
    expect(downloadMediaMessage).toHaveBeenCalledTimes(1);
    expect(uploadStream).toHaveBeenCalledTimes(1);
    expect(records()[1].media.messageId).toBe('reply-id');
  });

  it('records storage check failures without attempting another download or upload', async () => {
    objectExists.mockRejectedValue(new Error('access denied'));
    await service.handleUpsert(socket, [reply()]);

    expect(downloadMediaMessage).not.toHaveBeenCalled();
    expect(uploadStream).not.toHaveBeenCalled();
    expect(records()[1]).toMatchObject({
      event: 'media.failed',
      error: 'access denied',
      repliedMessage: { key: { id: 'original-id' } },
    });
  });

  it('archives the quoted message and downloads its media using original identifiers', async () => {
    const incoming = reply();
    await service.handleUpsert(socket, [incoming]);

    const repliedMessage = {
      key: { remoteJid: chatId, id: 'original-id', participant },
      message:
        incoming.message!.extendedTextMessage!.contextInfo!.quotedMessage,
    };
    expect(records()).toEqual([
      expect.objectContaining({
        event: 'message.received',
        message: incoming,
        repliedMessage,
      }),
      expect.objectContaining({
        event: 'media.stored',
        messageId: 'reply-id',
        repliedMessage,
        media: expect.objectContaining({
          messageId: 'original-id',
          senderId: participant,
          objectKey: `groups/${chatId}/${participant}/original-id/image.jpg`,
        }),
      }),
    ]);
    expect(downloadMediaMessage).toHaveBeenCalledExactlyOnceWith(
      repliedMessage,
      'stream',
      {},
      expect.objectContaining({ reuploadRequest: socket.updateMediaMessage }),
    );
    expect(appendJsonToFile).toHaveBeenCalledWith(
      join(process.cwd(), 'storage', 'whatsapp', 'groups', `${chatId}.jsonl`),
      expect.anything(),
    );
  });

  it.each([
    'ephemeralMessage',
    'viewOnceMessage',
    'documentWithCaptionMessage',
  ] as const)('extracts replies inside %s wrappers', (wrapper) => {
    const incoming = reply();
    const wrapped = {
      ...incoming,
      message: { [wrapper]: { message: incoming.message } },
    };
    expect(extractRepliedMessage(wrapped)).toEqual(
      extractRepliedMessage(incoming),
    );
  });

  it('downloads quoted media inside a view-once wrapper', async () => {
    await service.handleUpsert(socket, [
      reply({ viewOnceMessageV2: { message: { videoMessage: {} } } }),
    ]);
    expect(records()[1]).toMatchObject({
      event: 'media.stored',
      media: { type: 'video', messageId: 'original-id' },
    });
  });

  it('archives quoted text without attempting a media download', async () => {
    await service.handleUpsert(socket, [
      reply({ conversation: 'original text' }),
    ]);
    expect(records()).toHaveLength(1);
    expect(records()[0].repliedMessage.message).toEqual({
      conversation: 'original text',
    });
    expect(downloadMediaMessage).not.toHaveBeenCalled();
  });

  it('stores both the reply attachment and the quoted attachment', async () => {
    const incoming = reply();
    incoming.message = {
      imageMessage: {
        contextInfo: incoming.message!.extendedTextMessage!.contextInfo,
      },
    };
    await service.handleUpsert(socket, [incoming]);
    expect(
      records()
        .filter((record) => record.event === 'media.stored')
        .map((record) => record.media.messageId),
    ).toEqual(['reply-id', 'original-id']);
    expect(uploadStream).toHaveBeenCalledTimes(2);
  });

  it('stores quoted media even if the reply attachment fails to download', async () => {
    const incoming = reply();
    incoming.message = {
      imageMessage: {
        contextInfo: incoming.message!.extendedTextMessage!.contextInfo,
      },
    };
    vi.mocked(downloadMediaMessage).mockRejectedValueOnce(
      new Error('download failed'),
    );
    await service.handleUpsert(socket, [incoming]);
    expect(records().map((record) => record.event)).toEqual([
      'message.received',
      'media.failed',
      'media.stored',
    ]);
    expect(records()[2].media.messageId).toBe('original-id');
  });

  it('records quoted media failures together with the replied message', async () => {
    uploadStream.mockRejectedValueOnce(new Error('storage unavailable'));
    await service.handleUpsert(socket, [reply()]);
    expect(records()[1]).toMatchObject({
      event: 'media.failed',
      messageId: 'reply-id',
      repliedMessage: { key: { id: 'original-id' } },
      error: 'storage unavailable',
    });
  });

  it('preserves ordinary media records without a repliedMessage property', async () => {
    const incoming = { ...reply(), message: { imageMessage: {} } };
    await service.handleUpsert(socket, [incoming]);
    expect(records()).toHaveLength(2);
    expect(records()[0]).not.toHaveProperty('repliedMessage');
    expect(records()[1]).not.toHaveProperty('repliedMessage');
    expect(objectExists).not.toHaveBeenCalled();
    expect(records()[1].media.messageId).toBe('reply-id');
  });

  it('archives incomplete quotes without saving them under the reply identifier', async () => {
    const incoming = reply();
    incoming.message!.extendedTextMessage!.contextInfo!.stanzaId = null;
    await service.handleUpsert(socket, [incoming]);
    expect(records()).toHaveLength(1);
    expect(records()[0]).toHaveProperty('repliedMessage');
    expect(downloadMediaMessage).not.toHaveBeenCalled();
  });

  it('uses the quoted remote JID when supplied', () => {
    const incoming = reply();
    incoming.message!.extendedTextMessage!.contextInfo!.remoteJid =
      'original-chat@lid';
    expect(extractRepliedMessage(incoming)?.key.remoteJid).toBe(
      'original-chat@lid',
    );
  });
});
