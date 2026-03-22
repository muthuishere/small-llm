import { useNavigate } from 'react-router-dom';
import { Sun, Moon, Server, Cpu, ArrowRight, Zap } from 'lucide-react';
import { useTheme } from 'next-themes';
import { Button } from '../components/ui/Button';

const FEATURES = {
  server: [
    { icon: Server,  text: 'Runs on the Go backend via llama.cpp' },
    { icon: Zap,     text: 'Faster inference — uses your CPU/GPU' },
    { icon: ArrowRight, text: 'Supports chat, structured output & tools' },
  ],
  browser: [
    { icon: Cpu,     text: 'Runs entirely in your browser via WebLLM' },
    { icon: Zap,     text: 'No server required after first load' },
    { icon: ArrowRight, text: 'Supports chat, structured output & tools' },
  ],
};

function ModeCard({ to, color, icon: Icon, title, subtitle, features, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`
        group relative flex flex-col gap-5 p-6 rounded-2xl border-2 text-left
        transition-all duration-200 hover:scale-[1.02] active:scale-[0.99]
        bg-[var(--surface)] hover:bg-[var(--surface-elevated)]
        ${color}
      `}
    >
      <div className="flex items-start gap-4">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${color.replace('border-', 'bg-').replace('/40', '/20')}`}>
          <Icon size={24} className={color.includes('blue') ? 'text-blue-400' : 'text-purple-400'} />
        </div>
        <div>
          <h2 className="text-lg font-bold text-[var(--foreground)]">{title}</h2>
          <p className="text-sm text-[var(--muted-foreground)] mt-0.5">{subtitle}</p>
        </div>
      </div>

      <ul className="space-y-2.5">
        {features.map((f, i) => {
          const FIcon = f.icon;
          return (
            <li key={i} className="flex items-center gap-2.5 text-sm text-[var(--muted-foreground)]">
              <FIcon size={14} className="shrink-0 opacity-60" />
              {f.text}
            </li>
          );
        })}
      </ul>

      <div className={`
        absolute bottom-5 right-5 opacity-0 group-hover:opacity-100 transition-opacity
        ${color.includes('blue') ? 'text-blue-400' : 'text-purple-400'}
      `}>
        <ArrowRight size={20} />
      </div>
    </button>
  );
}

export function Landing() {
  const navigate  = useNavigate();
  const { theme, setTheme } = useTheme();

  return (
    <div className="min-h-screen bg-[var(--background)] flex flex-col">
      {/* Top bar */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)]">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center">
            <Zap size={14} className="text-white" />
          </div>
          <span className="font-bold text-[var(--foreground)]">small-llm</span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="text-[var(--muted-foreground)]"
        >
          {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
        </Button>
      </header>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-12">
        <div className="text-center mb-10 max-w-lg">
          <h1 className="text-4xl font-extrabold text-[var(--foreground)] mb-3 tracking-tight">
            Local LLM · Two Ways
          </h1>
          <p className="text-[var(--muted-foreground)] text-base leading-relaxed">
            Chat with <strong className="text-[var(--foreground)]">Qwen 2.5 0.5B</strong> either
            through the Go server powered by&nbsp;llama.cpp, or directly in your browser via
            WebLLM. Both support chat, structured output and tool use.
          </p>
        </div>

        {/* Mode cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 w-full max-w-2xl">
          <ModeCard
            icon={Server}
            title="Server Mode"
            subtitle="Go backend · llama.cpp"
            color="border-blue-500/40 hover:border-blue-500/80"
            features={FEATURES.server}
            onClick={() => navigate('/server')}
          />
          <ModeCard
            icon={Cpu}
            title="Browser Mode"
            subtitle="WebLLM · runs in-browser"
            color="border-purple-500/40 hover:border-purple-500/80"
            features={FEATURES.browser}
            onClick={() => navigate('/browser')}
          />
        </div>

        <p className="mt-8 text-xs text-[var(--muted)]">
          Model: Qwen 2.5 0.5B Instruct (q4_k_m) · ~394 MB downloaded once and cached
        </p>
      </main>
    </div>
  );
}
