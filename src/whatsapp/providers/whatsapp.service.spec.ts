import {
  BadGatewayException,
  BadRequestException,
  ForbiddenException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { EventEmitter } from 'node:events';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { vi, beforeEach, afterEach, describe, expect, it } from 'vitest';

const mocks = vi.hoisted(() => ({
  makeSocket: vi.fn(),
  saveCreds: vi.fn(),
  qr: vi.fn(),
  monitorAttach: vi.fn(),
  savedAccount: false,
}));
vi.mock('baileys', () => ({
  default: mocks.makeSocket,
  useMultiFileAuthState: vi.fn(async () => ({
    state: {
      creds: {
        me: mocks.savedAccount ? { id: '123:1@s.whatsapp.net' } : undefined,
      },
    },
    saveCreds: mocks.saveCreds,
  })),
  DisconnectReason: {
    loggedOut: 401,
    restartRequired: 515,
    badSession: 500,
    connectionReplaced: 440,
    forbidden: 403,
    multideviceMismatch: 411,
  },
}));
vi.mock('qrcode-terminal', () => ({ default: { generate: mocks.qr } }));

import { WhatsappService } from './whatsapp.service.ts';
import type { WhatsappGroupMonitorService } from './whatsapp-group-monitor.service.ts';
import QRCode from 'qrcode';

describe('WhatsApp session and group sending', () => {
  let service: WhatsappService;
  let directory: string;
  let socket: ReturnType<typeof createSocket>;

  function createSocket() {
    return {
      ev: new EventEmitter(),
      user: { id: '123:1@s.whatsapp.net' },
      end: vi.fn(),
      groupFetchAllParticipating: vi.fn().mockResolvedValue({
        '120363123@g.us': {
          id: '120363123@g.us',
          subject: 'Our group',
          participants: [{}],
        },
      }),
      sendMessage: vi.fn().mockResolvedValue({ key: { id: 'message-123' } }),
    };
  }

  beforeEach(async () => {
    vi.clearAllMocks();
    mocks.savedAccount = false;
    mocks.saveCreds.mockResolvedValue(undefined);
    directory = await mkdtemp(join(tmpdir(), 'whatsapp-session-test-'));
    vi.stubEnv('WHATSAPP_AUTH_DIR', directory);
    socket = createSocket();
    mocks.makeSocket.mockReturnValue(socket);
    service = new WhatsappService({
      attach: mocks.monitorAttach,
    } as unknown as WhatsappGroupMonitorService);
  });

  afterEach(async () => {
    await service.onModuleDestroy();
    vi.useRealTimers();
    vi.unstubAllEnvs();
    await rm(directory, { recursive: true, force: true });
  });

  async function open() {
    await service.connect();
    socket.ev.emit('connection.update', { connection: 'open' });
  }

  it('does not connect or send on construction; rejects sends before pairing', async () => {
    expect(mocks.makeSocket).not.toHaveBeenCalled();
    await expect(
      service.sendGroupMessage({ groupJid: '120363123@g.us', text: 'Hi' }),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(socket.sendMessage).not.toHaveBeenCalled();
  });

  it('shares concurrent connect requests, renders QR, and persists credential updates', async () => {
    await Promise.all([service.connect(), service.connect()]);
    expect(mocks.makeSocket).toHaveBeenCalledTimes(1);
    expect(mocks.monitorAttach).toHaveBeenCalledWith(
      socket,
      expect.any(Function),
    );
    expect((mocks.monitorAttach.mock.calls[0]![1] as () => boolean)()).toBe(
      true,
    );
    socket.ev.emit('connection.update', { qr: 'pairing-data' });
    expect(mocks.qr).toHaveBeenCalledWith('pairing-data', { small: true });
    expect(service.getStatus().status).toBe('awaiting_qr');
    socket.ev.emit('creds.update', {});
    expect(mocks.saveCreds).toHaveBeenCalledTimes(1);
  });

  it('lists groups and sends the validated text to the selected group', async () => {
    await open();
    await expect(service.listGroups()).resolves.toEqual([
      {
        id: '120363123@g.us',
        name: 'Our group',
        participants: 1,
        announcementOnly: false,
      },
    ]);
    await expect(
      service.sendGroupMessage({ groupJid: '120363123@g.us', text: ' Hello ' }),
    ).resolves.toEqual({
      groupJid: '120363123@g.us',
      messageId: 'message-123',
      status: 'sent',
    });
    expect(socket.sendMessage).toHaveBeenCalledWith('120363123@g.us', {
      text: 'Hello',
    });
  });

  it('explains that an existing account restores its saved session without generating a QR', async () => {
    mocks.savedAccount = true;
    await service.connect();
    expect(service.getStatus()).toMatchObject({
      status: 'connecting',
      hasSavedSession: true,
      qrAvailable: false,
    });
    expect(service.getStatus().qrUnavailableReason).toContain(
      'Restoring a saved WhatsApp session',
    );
    socket.ev.emit('connection.update', { connection: 'open' });
    expect(service.getStatus().qrUnavailableReason).toBe(
      'Already connected; no QR is needed.',
    );
  });

  it('distinguishes waiting for a new QR and reports disconnect diagnostics', async () => {
    await service.connect();
    expect(service.getStatus().qrUnavailableReason).toContain(
      'Waiting for WhatsApp',
    );
    socket.ev.emit('connection.update', { qr: 'new-qr' });
    expect(service.getStatus().qrUnavailableReason).toBeNull();
    socket.ev.emit('creds.update', { me: { id: '123:1@s.whatsapp.net' } });
    expect(service.getStatus().hasSavedSession).toBe(true);
    socket.ev.emit('connection.update', {
      connection: 'close',
      lastDisconnect: { error: { output: { statusCode: 401 } } },
    });
    expect(service.getStatus()).toMatchObject({
      status: 'logged_out',
      lastDisconnectCode: 401,
    });
    expect(service.getStatus().qrUnavailableReason).toContain('logged out');
  });

  it('returns no QR until pairing starts and encodes the latest QR as a PNG data URL', async () => {
    await expect(service.getQr()).resolves.toMatchObject({
      qr: null,
      qrDataUrl: null,
      qrAvailable: false,
    });
    await service.connect();
    socket.ev.emit('connection.update', { qr: 'first-qr' });
    socket.ev.emit('connection.update', { qr: 'latest-qr' });
    const response = await service.getQr();
    expect(response).toMatchObject({
      status: 'awaiting_qr',
      qr: 'latest-qr',
      qrAvailable: true,
    });
    expect(response.qrDataUrl).toBe(
      await QRCode.toDataURL('latest-qr', {
        errorCorrectionLevel: 'L',
        margin: 4,
        scale: 8,
      }),
    );
    expect(
      Buffer.from(response.qrDataUrl!.split(',')[1]!, 'base64')
        .subarray(0, 8)
        .toString('hex'),
    ).toBe('89504e470d0a1a0a');
  });

  it.each(['open', 'close'] as const)(
    'clears the QR when connection becomes %s',
    async (connection) => {
      await service.connect();
      socket.ev.emit('connection.update', { qr: 'pairing-data' });
      socket.ev.emit('connection.update', { connection });
      await expect(service.getQr()).resolves.toMatchObject({
        qr: null,
        qrDataUrl: null,
        qrAvailable: false,
      });
    },
  );

  it('clears the QR during shutdown and ignores subsequent stale socket QR events', async () => {
    await service.connect();
    socket.ev.emit('connection.update', { qr: 'pairing-data' });
    await service.onModuleDestroy();
    socket.ev.emit('connection.update', { qr: 'stale-qr' });
    await expect(service.getQr()).resolves.toMatchObject({
      qr: null,
      qrDataUrl: null,
    });
  });

  it.each([
    null,
    {},
    { groupJid: '123@s.whatsapp.net', text: 'Hi' },
    { groupJid: '120363123@g.us', text: '   ' },
    { groupJid: '120363123@g.us', text: 'x'.repeat(65537) },
  ])('rejects invalid message input %#', async (body) => {
    await expect(service.sendGroupMessage(body)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(socket.sendMessage).not.toHaveBeenCalled();
  });

  it('rejects groups the account has not joined', async () => {
    await open();
    await expect(
      service.sendGroupMessage({ groupJid: '999@g.us', text: 'Hi' }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(socket.sendMessage).not.toHaveBeenCalled();
  });

  it('does not retry a failed send', async () => {
    await open();
    socket.sendMessage.mockRejectedValue(new Error('network failure'));
    await expect(
      service.sendGroupMessage({ groupJid: '120363123@g.us', text: 'Hi' }),
    ).rejects.toBeInstanceOf(BadGatewayException);
    expect(socket.sendMessage).toHaveBeenCalledTimes(1);
  });

  it('reconnects after the post-pairing restart and ignores old socket updates', async () => {
    await open();
    vi.useFakeTimers();
    const nextSocket = createSocket();
    mocks.makeSocket.mockReturnValue(nextSocket);
    socket.ev.emit('connection.update', {
      connection: 'close',
      lastDisconnect: { error: { output: { statusCode: 515 } } },
    });
    await vi.advanceTimersByTimeAsync(1);
    await service.connect();
    expect(mocks.makeSocket).toHaveBeenCalledTimes(2);
    nextSocket.ev.emit('connection.update', { connection: 'open' });
    socket.ev.emit('connection.update', { connection: 'close' });
    expect(service.getStatus().status).toBe('connected');
  });

  it.each([401, 403, 411, 440, 500])(
    'does not reconnect after terminal disconnect %s',
    async (code) => {
      await open();
      vi.useFakeTimers();
      socket.ev.emit('connection.update', {
        connection: 'close',
        lastDisconnect: { error: { output: { statusCode: code } } },
      });
      await vi.advanceTimersByTimeAsync(60000);
      expect(mocks.makeSocket).toHaveBeenCalledTimes(1);
      expect(service.getStatus().status).toBe(
        code === 401 ? 'logged_out' : 'error',
      );
    },
  );

  it('cancels pending reconnects on shutdown without logging out', async () => {
    await open();
    vi.useFakeTimers();
    socket.ev.emit('connection.update', { connection: 'close' });
    await service.onModuleDestroy();
    await vi.advanceTimersByTimeAsync(60000);
    expect(mocks.makeSocket).toHaveBeenCalledTimes(1);
    expect((mocks.monitorAttach.mock.calls[0]![1] as () => boolean)()).toBe(
      false,
    );
    await expect(service.connect()).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });

  it('stops a session if credentials cannot be persisted', async () => {
    await open();
    mocks.saveCreds.mockRejectedValueOnce(new Error('disk full'));
    socket.ev.emit('creds.update', {});
    await vi.waitFor(() => expect(service.getStatus().status).toBe('error'));
    expect(socket.end).toHaveBeenCalledTimes(1);
  });
});
