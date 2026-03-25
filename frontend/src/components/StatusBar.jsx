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
    const interval = setInterval(poll, 3000);
    return () => clearInterval(interval);
  }, [setServerStatus]);

  const isReady = serverStatus?.model_ready && serverStatus?.server_running;
  const isStarting = serverStatus?.server_running && !serverStatus?.model_ready;

  return (
    <div className="flex items-center gap-3 px-6 py-3 border-b border-[var(--border)] text-sm shrink-0">
      <span className="text-base font-bold text-[var(--foreground)]">small-llm</span>
      <span className="text-[var(--border)]">·</span>
      <span className="flex items-center gap-2 text-[var(--muted-foreground)]">
        <span className={`w-2 h-2 rounded-full ${isReady ? 'bg-emerald-500' : isStarting ? 'bg-amber-500 animate-pulse' : 'bg-[var(--muted)]'}`} />
        {isReady
          ? 'Ready'
          : isStarting
          ? (serverStatus?.status_message || 'Starting…')
          : (serverStatus?.status_message || 'Connecting…')}
      </span>
      {serverStatus?.model_name && (
        <>
          <span className="text-[var(--border)]">·</span>
          <span className="font-mono text-[var(--muted)]">{serverStatus.model_name}</span>
        </>
      )}
    </div>
  );
}
