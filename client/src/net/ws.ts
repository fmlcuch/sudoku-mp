import type { ClientEvent, ServerEvent } from '../shared/events';

export function createSocket(onMessage: (event: ServerEvent) => void) {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const host = window.location.host;
  const url = import.meta.env.VITE_WS_URL || `${protocol}//${host}/ws`;
  const socket = new WebSocket(url);
  const queue: ClientEvent[] = [];

  socket.addEventListener('open', () => {
    while (queue.length) {
      socket.send(JSON.stringify(queue.shift()));
    }
  });

  socket.addEventListener('message', event => {
    try {
      onMessage(JSON.parse(String(event.data)) as ServerEvent);
    } catch {
      // ignore
    }
  });

  return {
    socket,
    send(event: ClientEvent) {
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify(event));
      } else {
        queue.push(event);
      }
    },
  };
}
