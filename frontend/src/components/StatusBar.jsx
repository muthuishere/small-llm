import { useEffect } from 'react';
import useChatStore from '../store/chatStore';
import { getStatus } from '../services/api';

export function StatusBar() {
  const { serverStatus, setServerStatus } = useChatStore();

  useEffect(() => {
    const poll = async () => {
      try {
        const res = await getStatus();
        setServerStatus(res.data);
      } catch {
        setServerStatus({ model_ready: false, server_running: false, status_message: 'Cannot reach server' });
      }
    };

    poll();
    const interval = setInterval(poll, 5000);
    return () => clearInterval(interval);
  }, [setServerStatus]);

  const isReady = serverStatus?.model_ready && serverStatus?.server_running;
  const isStarting = serverStatus?.server_running && !serverStatus?.model_ready;

  return (
    <div className="flex items-center gap-3 px-8 py-3 border-b border-[var(--border)] shrink-0 bg-[var(--background)]">
      <span className="text-base font-bold text-[var(--foreground)]">small‑llm</span>
      <span className="text-[var(--border)]">·</span>
      <span className="flex items-center gap-2 text-sm text-[var(--muted-foreground)]">
        <span
          className={`w-2.5 h-2.5 rounded-full shrink-0 ${
            isReady ? 'bg-emerald-500' : isStarting ? 'bg-amber-500 animate-pulse' : 'bg-[var(--muted)]'
          }`}
        />
        {isReady
          ? 'Ready'
          : isStarting
            ? (serverStatus?.status_message || 'Starting…')
            : (serverStatus?.status_message || 'Connecting…')}
      </span>
      {serverStatus?.model_name && (
        <>
          <span className="text-[var(--border)]">·</span>
          <span className="font-mono text-sm text-[var(--muted)]">{serverStatus.model_name}</span>
        </>
      )}
    </div>
  );
}
