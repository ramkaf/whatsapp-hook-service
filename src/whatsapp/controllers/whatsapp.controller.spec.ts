import { NotFoundException, StreamableFile } from '@nestjs/common';
import { describe, it, expect, vi } from 'vitest';
import { WhatsappController } from './whatsapp.controller.ts';
import type { WhatsappService } from '../providers/whatsapp.service.ts';
import { WhatsappApiGuard } from '../guards/whatsapp-api.guard.ts';

describe('WhatsApp QR API', () => {
  it('returns pairing data in the connect response', async () => {
    const data = {
      status: 'awaiting_qr',
      qr: 'pairing-data',
      qrDataUrl: 'data:image/png;base64,abc',
    };
    const service = {
      connect: vi.fn().mockResolvedValue({}),
      getQr: vi.fn().mockResolvedValue(data),
    };
    const controller = new WhatsappController(
      service as unknown as WhatsappService,
    );
    await expect(controller.connect()).resolves.toEqual(data);
    expect(service.connect).toHaveBeenCalledOnce();
  });

  it('returns inline PNG bytes for the image endpoint', async () => {
    const bytes = Buffer.from('89504e470d0a1a0a', 'hex');
    const service = {
      getQr: vi.fn().mockResolvedValue({
        qrDataUrl: `data:image/png;base64,${bytes.toString('base64')}`,
      }),
    };
    const controller = new WhatsappController(
      service as unknown as WhatsappService,
    );
    const image = await controller.qrImage();
    expect(image).toBeInstanceOf(StreamableFile);
    expect(image.getHeaders()).toMatchObject({
      type: 'image/png',
      disposition: 'inline',
    });
    const chunks: Buffer[] = [];
    for await (const chunk of image.getStream()) chunks.push(chunk as Buffer);
    expect(Buffer.concat(chunks)).toEqual(bytes);
  });

  it('returns 404 when there is no pairing image', async () => {
    const controller = new WhatsappController({
      getQr: vi.fn().mockResolvedValue({ qrDataUrl: null }),
    } as unknown as WhatsappService);
    await expect(controller.qrImage()).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('includes the saved-session explanation in the PNG endpoint error', async () => {
    const data = {
      status: 'connecting',
      hasSavedSession: true,
      qrDataUrl: null,
      qrUnavailableReason: 'Restoring a saved WhatsApp session',
      lastDisconnectCode: null,
    };
    const controller = new WhatsappController({
      getQr: vi.fn().mockResolvedValue(data),
    } as unknown as WhatsappService);
    try {
      await controller.qrImage();
      throw new Error('Expected no image');
    } catch (error) {
      expect(error).toBeInstanceOf(NotFoundException);
      expect((error as NotFoundException).getResponse()).toMatchObject({
        statusCode: 404,
        status: 'connecting',
        hasSavedSession: true,
        message: data.qrUnavailableReason,
      });
    }
  });

  it('protects QR routes with the API guard and disables response caching', () => {
    expect(Reflect.getMetadata('__guards__', WhatsappController)).toContain(
      WhatsappApiGuard,
    );
    for (const method of ['connect', 'qr', 'qrImage'] as const) {
      expect(
        Reflect.getMetadata(
          '__headers__',
          WhatsappController.prototype[method],
        ),
      ).toContainEqual({ name: 'Cache-Control', value: 'no-store' });
    }
  });
});
