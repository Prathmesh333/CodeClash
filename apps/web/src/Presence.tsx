import { useEffect, useState } from 'react';
export default function Presence({ userId }: { userId: string }) {
  const [counts, setCounts] = useState<{ online: number; looking: number } | null>(null);
  useEffect(() => {
    let stopped = false,
      socket: WebSocket | undefined;
    let retry: ReturnType<typeof setTimeout>, heartbeat: ReturnType<typeof setInterval>;
    let attempts = 0,
      lastPong = 0;
    const connect = () => {
      if (stopped) return;
      socket = new WebSocket(location.origin.replace(/^http/, 'ws') + '/api/presence');
      socket.onopen = () => {
        attempts = 0;
        lastPong = Date.now();
        socket?.send('ping');
        heartbeat = setInterval(() => {
          if (Date.now() - lastPong > 90000) {
            socket?.close();
            return;
          }
          if (socket?.readyState === WebSocket.OPEN) socket.send('ping');
        }, 30000);
      };
      socket.onmessage = (event) => {
        if (event.data === 'pong') {
          lastPong = Date.now();
          return;
        }
        try {
          const value = JSON.parse(event.data);
          if (
            Number.isSafeInteger(value.online) &&
            value.online >= 0 &&
            Number.isSafeInteger(value.looking) &&
            value.looking >= 0
          )
            setCounts(value);
        } catch {
          /* Ignore malformed counts. */
        }
      };
      socket.onclose = () => {
        clearInterval(heartbeat);
        setCounts(null);
        if (!stopped)
          retry = setTimeout(
            connect,
            Math.min(30000, 1000 * 2 ** attempts++) + Math.random() * 1000,
          );
      };
      socket.onerror = () => socket?.close();
    };
    connect();
    return () => {
      stopped = true;
      clearTimeout(retry);
      clearInterval(heartbeat);
      socket?.close();
    };
  }, [userId]);
  return (
    <p className="arena-presence" role="status">
      {counts ? (
        <>
          <strong>{counts.online}</strong> Clashers online · <strong>{counts.looking}</strong>{' '}
          looking for a match
        </>
      ) : (
        'Connecting to the arena…'
      )}
    </p>
  );
}
