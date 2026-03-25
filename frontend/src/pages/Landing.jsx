import { useNavigate } from 'react-router-dom';
import { Sun, Moon, Server, Globe, ArrowRight } from 'lucide-react';
import { useTheme } from 'next-themes';

export function Landing() {
  const navigate  = useNavigate();
  const { theme, setTheme } = useTheme();

  return (
    <div className="min-h-screen bg-[var(--background)] flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-8 md:px-12 py-5">
        <span className="text-lg font-bold tracking-tight text-[var(--foreground)]">
          small‑llm
        </span>
        <button
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="w-10 h-10 flex items-center justify-center rounded-full bg-[var(--surface)] shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-elevated)] transition-all text-[var(--foreground)]"
        >
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>
      </header>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center px-8 md:px-12 pb-20">
        <div className="text-center mb-14 md:mb-20 max-w-2xl">
          <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold text-[var(--foreground)] mb-6 tracking-tight leading-[1.05]">
            Local AI.
            <br />
            <span className="text-[var(--muted-foreground)]">Two ways.</span>
          </h1>
          <p className="text-lg md:text-xl text-[var(--muted-foreground)] leading-relaxed max-w-md mx-auto">
            Chat, structured output, and tool calling —
            powered by Qwen&nbsp;2.5&nbsp;0.5B.
          </p>
        </div>

        {/* Mode cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 md:gap-7 w-full max-w-2xl">
          <button
            onClick={() => navigate('/server')}
            className="group relative flex flex-col items-start p-7 md:p-9 rounded-3xl bg-[var(--surface)] shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-elevated)] border border-[var(--border)] hover:border-[var(--primary)] transition-all duration-300 text-left cursor-pointer"
          >
            <div className="w-14 h-14 rounded-2xl bg-[var(--primary)] flex items-center justify-center mb-6 shadow-lg shadow-blue-500/20">
              <Server size={26} className="text-white" />
            </div>
            <span className="text-xl md:text-2xl font-bold text-[var(--foreground)] mb-2">Server Mode</span>
            <span className="text-base text-[var(--muted-foreground)] mb-8 leading-relaxed">
              Go backend with llama.cpp. Fast CPU/GPU inference on your machine.
            </span>
            <span className="flex items-center gap-2 text-base font-semibold text-[var(--primary)] mt-auto group-hover:gap-3 transition-all">
              Get started <ArrowRight size={18} />
            </span>
          </button>

          <button
            onClick={() => navigate('/browser')}
            className="group relative flex flex-col items-start p-7 md:p-9 rounded-3xl bg-[var(--surface)] shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-elevated)] border border-[var(--border)] hover:border-[var(--primary)] transition-all duration-300 text-left cursor-pointer"
          >
            <div className="w-14 h-14 rounded-2xl bg-[var(--foreground)] flex items-center justify-center mb-6">
              <Globe size={26} className="text-[var(--background)]" />
            </div>
            <span className="text-xl md:text-2xl font-bold text-[var(--foreground)] mb-2">Browser Mode</span>
            <span className="text-base text-[var(--muted-foreground)] mb-8 leading-relaxed">
              Runs entirely in your browser via WebLLM and WebGPU. No server needed.
            </span>
            <span className="flex items-center gap-2 text-base font-semibold text-[var(--primary)] mt-auto group-hover:gap-3 transition-all">
              Get started <ArrowRight size={18} />
            </span>
          </button>
        </div>

        <p className="mt-12 text-sm text-[var(--muted-foreground)]">
          ~394 MB · downloaded once · cached locally
        </p>
      </main>
    </div>
  );
}
