import { Injectable } from '@nestjs/common';
import { makeWASocket, useMultiFileAuthState, type WASocket } from 'baileys';

import { mkdir, chmod } from 'node:fs/promises';
import { resolve } from 'node:path';
import { appConfiguration } from '#common';
import { CreatedWaSocket } from '../interfaces/wa-socket-factorty.interface.ts';

@Injectable()
export class WhatsappSocketFactory {
  async create(): Promise<CreatedWaSocket> {
    const authPath =
      appConfiguration().whatsapp.authDir ?? '.data/whatsapp-auth';

    const authDir = resolve(authPath);

    await mkdir(authDir, {
      recursive: true,
      mode: 0o700,
    });

    await chmod(authDir, 0o700);

    const { state, saveCreds } = await useMultiFileAuthState(authDir);

    const socket = makeWASocket({
      auth: state,
      markOnlineOnConnect: false,
      syncFullHistory: false,
      shouldSyncHistoryMessage: () => false,
    });

    return {
      socket,
      saveCreds,
      hasSavedSession: Boolean(state.creds?.me),
    };
  }
}
