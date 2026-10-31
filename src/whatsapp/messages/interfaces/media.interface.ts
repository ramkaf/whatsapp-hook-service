export type MediaType =
  'image' | 'video' | 'voice' | 'audio' | 'document' | 'sticker';

export type ChatCategory = 'groups' | 'chats';

export interface MediaDescriptor {
  type: MediaType;
  mimeType: string;
  extension: string;
  originalFileName: string | null;
}
export interface StoredWhatsappMedia {
  bucket: string;
  objectKey: string;
  etag: string;
  chatId: string;
  senderId: string;
  messageId: string;
  type: MediaType;
  mimeType: string;
  originalFileName: string | null;
}
