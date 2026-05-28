export type ConnectionState = 'connected' | 'disconnected';

export interface ConnectionStatus {
  mqtt: ConnectionState;
  influx: ConnectionState;
}

const status: ConnectionStatus = {
  mqtt: 'disconnected',
  influx: 'disconnected',
};

type Listener = (status: ConnectionStatus) => void;
const listeners = new Set<Listener>();

export function getConnectionStatus(): ConnectionStatus {
  return { ...status };
}

export function setConnectionState(
  service: keyof ConnectionStatus,
  state: ConnectionState,
): void {
  if (status[service] === state) {
    return;
  }
  status[service] = state;
  for (const listener of listeners) {
    listener(getConnectionStatus());
  }
}

export function onConnectionChange(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
