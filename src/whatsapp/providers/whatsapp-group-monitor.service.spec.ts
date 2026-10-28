import { EventEmitter } from 'node:events';
import type { WAMessage, WASocket } from 'baileys';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { WhatsappGroupMonitorService } from './whatsapp-group-monitor.service.ts';
import { GroupMessageHandler } from './group-message.handler.ts';
import type { GroupMessageContext } from '../group-message.context.ts';

describe('incoming group message monitoring', () => {
  const groupJid = '120363123@g.us';
  const sender = '987654@lid';
  const group = {
    id: groupJid,
    subject: 'Operations',
    owner: undefined,
    participants: [
      {
        id: sender,
        phoneNumber: '989121234567@s.whatsapp.net',
        admin: 'admin',
      },
    ],
  };
  let monitor: WhatsappGroupMonitorService;
  let handle: ReturnType<
    typeof vi.fn<(context: GroupMessageContext) => Promise<void>>
  >;
  let metadata: ReturnType<typeof vi.fn>;
  let ev: EventEmitter;
  let socket: WASocket;

  function message(id = 'one', extra: Partial<WAMessage> = {}): WAMessage {
    return {
      key: { id, remoteJid: groupJid, participant: sender, fromMe: false },
      message: { conversation: 'Hello' },
      pushName: 'Sender name',
      messageTimestamp: 1700000000,
      ...extra,
    };
  }

  beforeEach(() => {
    vi.stubEnv('WHATSAPP_MONITORED_GROUP_JIDS', undefined);
    ev = new EventEmitter();
    metadata = vi.fn().mockResolvedValue(group);
    socket = { ev, groupMetadata: metadata } as unknown as WASocket;
    handle = vi.fn().mockResolvedValue(undefined);
    const handler = new GroupMessageHandler();
    vi.spyOn(handler, 'handle').mockImplementation(handle);
    monitor = new WhatsappGroupMonitorService(handler);
  });

  afterEach(() => vi.unstubAllEnvs());

  it('monitors all groups by default and passes full sender, contact, group and raw message data', async () => {
    monitor.attach(socket, () => true);
    ev.emit('contacts.upsert', [
      { id: sender, name: 'Saved name', status: 'Available' },
    ]);
    const incoming = message();
    ev.emit('messages.upsert', { type: 'notify', messages: [incoming] });
    await vi.waitFor(() => expect(handle).toHaveBeenCalledTimes(1));
    const context = handle.mock.calls[0]![0];
    expect(context).toMatchObject({
      groupJid,
      messageId: 'one',
      text: 'Hello',
      type: 'conversation',
      group,
      sender: {
        jid: sender,
        phoneNumber: '989121234567',
        displayName: 'Saved name',
        participant: group.participants[0],
        contact: { status: 'Available' },
      },
      sentAt: new Date(1700000000000),
    });
    expect(context.raw).toBe(incoming);
  });

  it('handles all messages in a batch and fetches each group once per batch', async () => {
    await monitor.process(
      socket,
      { type: 'notify', messages: [message(), message('two')] },
      () => true,
    );
    expect(handle).toHaveBeenCalledTimes(2);
    expect(metadata).toHaveBeenCalledTimes(1);
  });

  it('supports an allowlist and empty configuration to disable monitoring', async () => {
    vi.stubEnv('WHATSAPP_MONITORED_GROUP_JIDS', '999@g.us');
    await monitor.process(
      socket,
      { type: 'notify', messages: [message()] },
      () => true,
    );
    vi.stubEnv('WHATSAPP_MONITORED_GROUP_JIDS', '');
    await monitor.process(
      socket,
      { type: 'notify', messages: [message()] },
      () => true,
    );
    expect(handle).not.toHaveBeenCalled();
    expect(metadata).not.toHaveBeenCalled();
  });

  it('skips history, own messages, direct chats and protocol-only events', async () => {
    await monitor.process(
      socket,
      { type: 'append', messages: [message()] },
      () => true,
    );
    await monitor.process(
      socket,
      {
        type: 'notify',
        messages: [
          message('own', {
            key: {
              id: 'own',
              remoteJid: groupJid,
              participant: sender,
              fromMe: true,
            },
          }),
          message('direct', {
            key: {
              id: 'direct',
              remoteJid: '123@s.whatsapp.net',
              participant: sender,
            },
          }),
          message('protocol', { message: { protocolMessage: {} } }),
          message('key', { message: { senderKeyDistributionMessage: {} } }),
        ],
      },
      () => true,
    );
    expect(handle).not.toHaveBeenCalled();
  });

  it('processes real content when a sender key is included and normalizes wrapped image captions', async () => {
    const incoming = message('photo', {
      message: {
        ephemeralMessage: {
          message: {
            senderKeyDistributionMessage: {},
            imageMessage: { caption: 'A photo' },
          },
        },
      },
    });
    await monitor.process(
      socket,
      { type: 'notify', messages: [incoming] },
      () => true,
    );
    expect(handle.mock.calls[0]![0]).toMatchObject({
      text: 'A photo',
      type: 'imageMessage',
      raw: incoming,
    });
  });

  it('prevents overlapping batches from running the same message twice', async () => {
    await Promise.all([
      monitor.process(
        socket,
        { type: 'notify', messages: [message()] },
        () => true,
      ),
      monitor.process(
        socket,
        { type: 'notify', messages: [message()] },
        () => true,
      ),
    ]);
    expect(handle).toHaveBeenCalledTimes(1);
  });

  it('still handles messages if metadata is unavailable and never interprets a LID as a phone number', async () => {
    metadata.mockRejectedValue(new Error('Unavailable'));
    await monitor.process(
      socket,
      { type: 'notify', messages: [message()] },
      () => true,
    );
    expect(handle.mock.calls[0]![0]).toMatchObject({
      group: null,
      sender: { jid: sender, phoneNumber: null, displayName: 'Sender name' },
    });
  });

  it('uses an alternate phone JID when WhatsApp supplies it', async () => {
    metadata.mockRejectedValue(new Error('Unavailable'));
    const incoming = message();
    incoming.key.participantAlt = '989121234567:2@s.whatsapp.net';
    await monitor.process(
      socket,
      { type: 'notify', messages: [incoming] },
      () => true,
    );
    expect(handle.mock.calls[0]![0].sender.phoneNumber).toBe('989121234567');
  });

  it('continues processing later messages if an application function throws', async () => {
    handle.mockRejectedValueOnce(new Error('Function failed'));
    await monitor.process(
      socket,
      { type: 'notify', messages: [message(), message('two')] },
      () => true,
    );
    expect(handle).toHaveBeenCalledTimes(2);
  });

  it('ignores events from sockets that were replaced or closed', async () => {
    await monitor.process(
      socket,
      { type: 'notify', messages: [message()] },
      () => false,
    );
    expect(handle).not.toHaveBeenCalled();
    let current = true;
    metadata.mockImplementation(async () => {
      current = false;
      return group;
    });
    await monitor.process(
      socket,
      { type: 'notify', messages: [message()] },
      () => current,
    );
    expect(handle).not.toHaveBeenCalled();
  });
});
