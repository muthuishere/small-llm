import { useEffect } from 'react';
import useChatStore from '../store/chatStore';
import { getStatus } from '../services/api';
import { Spinner } from './ui/Spinner';

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

  const getStatusIndicator = () => {
    if (!serverStatus) return { color: 'bg-gray-400', label: 'Connecting...', icon: <Spinner size="sm" /> };
    if (serverStatus.model_ready && serverStatus.server_running) {
      return {
        color: 'bg-green-500',
        label: `Ready · ${serverStatus.model_name || 'Model loaded'}`,
        icon: <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse inline-block" />,
      };
    }
    if (serverStatus.server_running) {
      return {
        color: 'bg-yellow-500',
        label: serverStatus.status_message || 'Starting llama-server...',
        icon: <Spinner size="sm" />,
      };
    }
    return {
      color: 'bg-red-500',
      label: serverStatus.status_message || 'Downloading model...',
      icon: <Spinner size="sm" />,
    };
  };

  const { label, icon } = getStatusIndicator();

  return (
    <div className="flex items-center justify-between px-4 py-2 border-b border-[var(--border)] bg-[var(--surface)] text-sm">
      <div className="flex items-center gap-2 text-[var(--muted-foreground)]">
        <span className="font-semibold text-[var(--foreground)]">Small LLM</span>
        <span className="text-[var(--border)]">·</span>
        <span className="flex items-center gap-1.5">
          {icon}
          {label}
        </span>
      </div>
      <div className="text-xs text-[var(--muted)]">
        {serverStatus?.model_name && (
          <span className="px-2 py-0.5 rounded bg-[var(--surface-elevated)] font-mono">
            {serverStatus.model_name}
          </span>
        )}
      </div>
    </div>
  );
}
