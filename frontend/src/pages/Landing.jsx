import { useNavigate } from 'react-router-dom';
import { Sun, Moon, Server, Globe, ArrowRight } from 'lucide-react';
import { useTheme } from 'next-themes';

export function Landing() {
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();

  return (
    <div className="min-h-screen bg-[var(--background)] flex flex-col">
      <header className="flex items-center justify-between px-8 md:px-12 py-5">
        <span className="text-base font-semibold tracking-tight text-[var(--foreground)]">
          small‑llm
        </span>
        <button
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="w-10 h-10 flex items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-elevated)] transition-all text-[var(--foreground)] cursor-pointer"
          aria-label="Toggle theme"
        >
          {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
        </button>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-6 md:px-12 pb-16">
        <div className="text-center mb-12 md:mb-16 max-w-2xl">
          <h1 className="text-5xl md:text-7xl font-bold text-[var(--foreground)] mb-5 tracking-tight leading-[1.08]">
            Local AI.
            <br />
            <span className="text-[var(--muted-foreground)]">Two ways.</span>
          </h1>
          <p className="text-base md:text-lg text-[var(--muted-foreground)] leading-relaxed max-w-md mx-auto">
            Chat, structured output, and tool calling
            — powered by Qwen&nbsp;2.5&nbsp;0.5B.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 md:gap-6 w-full max-w-2xl">
          <button
            onClick={() => navigate('/server')}
            className="group flex flex-col items-start p-8 rounded-2xl bg-[var(--surface)] shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-elevated)] hover:-translate-y-0.5 border border-[var(--border)] hover:border-[var(--primary)] transition-all duration-200 text-left cursor-pointer"
          >
            <div className="w-12 h-12 rounded-xl bg-[var(--primary)] flex items-center justify-center mb-5 shadow-md">
              <Server size={22} className="text-white" />
            </div>
            <span className="text-lg font-semibold text-[var(--foreground)] mb-1.5">Server Mode</span>
            <span className="text-sm text-[var(--muted-foreground)] mb-6 leading-relaxed">
              Go backend with llama.cpp. Fast CPU/GPU inference on your machine.
            </span>
            <span className="flex items-center gap-1.5 text-sm font-medium text-[var(--primary)] mt-auto group-hover:gap-2.5 transition-all">
              Get started <ArrowRight size={15} />
            </span>
          </button>

          <button
            onClick={() => navigate('/browser')}
            className="group flex flex-col items-start p-8 rounded-2xl bg-[var(--surface)] shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-elevated)] hover:-translate-y-0.5 border border-[var(--border)] hover:border-[var(--primary)] transition-all duration-200 text-left cursor-pointer"
          >
            <div className="w-12 h-12 rounded-xl bg-[var(--foreground)] flex items-center justify-center mb-5 shadow-md">
              <Globe size={22} className="text-[var(--background)]" />
            </div>
            <span className="text-lg font-semibold text-[var(--foreground)] mb-1.5">Browser Mode</span>
            <span className="text-sm text-[var(--muted-foreground)] mb-6 leading-relaxed">
              Runs entirely in your browser via WebLLM and WebGPU. No server needed.
            </span>
            <span className="flex items-center gap-1.5 text-sm font-medium text-[var(--primary)] mt-auto group-hover:gap-2.5 transition-all">
              Get started <ArrowRight size={15} />
            </span>
          </button>
        </div>

        <p className="mt-10 text-xs text-[var(--muted-foreground)]">
          ~394 MB · downloaded once · cached locally
        </p>
      </main>
    </div>
  );
}
