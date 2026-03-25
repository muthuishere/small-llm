import { useNavigate } from 'react-router-dom';
import { Sun, Moon, Server, Globe, ArrowRight } from 'lucide-react';
import { useTheme } from 'next-themes';

export function Landing() {
  const navigate  = useNavigate();
  const { theme, setTheme } = useTheme();

  return (
    <div className="min-h-screen bg-[var(--background)] flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-6 md:px-10 py-5">
        <span className="text-base md:text-lg font-bold tracking-tight text-[var(--foreground)]">
          small-llm
        </span>
        <button
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-[var(--surface-elevated)] transition-colors text-[var(--muted-foreground)]"
        >
          {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
        </button>
      </header>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 md:px-10 pb-16">
        <div className="text-center mb-12 md:mb-16 max-w-2xl">
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-[var(--foreground)] mb-4 md:mb-6 tracking-tight leading-[1.1]">
            Local AI.
            <br />
            <span className="text-[var(--muted-foreground)]">Two ways to run it.</span>
          </h1>
          <p className="text-base md:text-xl text-[var(--muted-foreground)] leading-relaxed max-w-lg mx-auto">
            Qwen 2.5 0.5B with chat, structured output, and tool calling.
            On your server or in your browser.
          </p>
        </div>

        {/* Two mode cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6 w-full max-w-2xl px-2">
          <button
            onClick={() => navigate('/server')}
            className="group flex flex-col items-start p-6 md:p-8 rounded-2xl bg-[var(--surface-elevated)] hover:bg-[var(--accent)] border border-[var(--border)] hover:border-[var(--primary)] transition-all duration-200 text-left cursor-pointer"
          >
            <div className="w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-[var(--primary)] flex items-center justify-center mb-5">
              <Server size={24} className="text-white" />
            </div>
            <span className="text-lg md:text-xl font-bold text-[var(--foreground)] mb-1">Server Mode</span>
            <span className="text-sm md:text-base text-[var(--muted-foreground)] mb-6 leading-relaxed">
              Go backend powered by llama.cpp. Fast inference on your machine.
            </span>
            <span className="flex items-center gap-2 text-sm md:text-base font-semibold text-[var(--primary)] mt-auto group-hover:gap-3 transition-all">
              Get started <ArrowRight size={16} />
            </span>
          </button>

          <button
            onClick={() => navigate('/browser')}
            className="group flex flex-col items-start p-6 md:p-8 rounded-2xl bg-[var(--surface-elevated)] hover:bg-[var(--accent)] border border-[var(--border)] hover:border-[var(--primary)] transition-all duration-200 text-left cursor-pointer"
          >
            <div className="w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-[var(--foreground)] flex items-center justify-center mb-5">
              <Globe size={24} className="text-[var(--background)]" />
            </div>
            <span className="text-lg md:text-xl font-bold text-[var(--foreground)] mb-1">Browser Mode</span>
            <span className="text-sm md:text-base text-[var(--muted-foreground)] mb-6 leading-relaxed">
              Runs entirely in your browser via WebLLM. No server required.
            </span>
            <span className="flex items-center gap-2 text-sm md:text-base font-semibold text-[var(--primary)] mt-auto group-hover:gap-3 transition-all">
              Get started <ArrowRight size={16} />
            </span>
          </button>
        </div>

        <p className="mt-10 md:mt-14 text-sm text-[var(--muted)]">
          ~394 MB model · downloaded once · cached locally
        </p>
      </main>
    </div>
  );
}
