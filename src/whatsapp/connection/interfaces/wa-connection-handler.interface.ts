export interface ConnectionNoneResult {
  type: 'none';
}

export interface ConnectionConnectingResult {
  type: 'connecting';
}

export interface ConnectionQrResult {
  type: 'qr';
}

export interface ConnectionConnectedResult {
  type: 'connected';
}

export interface ConnectionDisconnectedResult {
  type: 'disconnected';
  shouldReconnect: boolean;
  delayMs: number;
  code: number | null;
}

export type ConnectionResult =
  | ConnectionNoneResult
  | ConnectionConnectingResult
  | ConnectionQrResult
  | ConnectionConnectedResult
  | ConnectionDisconnectedResult;
