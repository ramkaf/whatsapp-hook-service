import { WASocket } from 'baileys';

export interface CreatedWaSocket {
  socket: WASocket;
  saveCreds: () => Promise<void>;
  hasSavedSession: boolean;
}
