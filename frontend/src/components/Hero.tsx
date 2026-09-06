import { useState } from "react";
import { ArrowRight, Sparkles } from "lucide-react";

const EXAMPLES = [
  "Latest advances in solid-state batteries",
  "Impact of GLP-1 drugs on public health",
  "State of quantum error correction in 2026",
];

interface HeroProps {
  onSubmit: (query: string) => void;
}

export function Hero({ onSubmit }: HeroProps) {
  const [value, setValue] = useState("");

  const submit = () => {
    const trimmed = value.trim();
    if (trimmed) onSubmit(trimmed);
  };

  return (
    <div className="relative flex flex-1 flex-col items-center justify-center overflow-hidden px-6 text-center">
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/2 h-[560px] w-[820px] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-60 blur-3xl"
        style={{
          background:
            "radial-gradient(closest-side, var(--accent-soft), transparent 70%)",
        }}
      />

      <span className="relative mb-5 inline-flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.2em] text-text-faint">
        <Sparkles size={12} className="text-accent" />
        Multi-agent research, cited end to end
      </span>

      <h1 className="relative max-w-2xl font-display text-4xl font-semibold leading-tight text-text sm:text-5xl">
        Ask a question. Get a <span className="text-accent">cited</span> research report.
      </h1>

      <p className="relative mt-4 max-w-md text-text-muted">
        Four autonomous agents plan, search, cross-check, and write &mdash; every claim traced
        back to a source.
      </p>

      <div className="relative mt-8 flex w-full max-w-xl items-center gap-2 rounded-2xl border border-border bg-bg-elevated p-2 shadow-xl shadow-black/30 focus-within:border-accent">
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder="What do you want to research?"
          className="min-w-0 flex-1 bg-transparent px-3 py-2 text-sm text-text placeholder:text-text-faint focus:outline-none"
        />
        <button
          onClick={submit}
          disabled={!value.trim()}
          className="flex shrink-0 items-center gap-1.5 rounded-xl bg-accent px-4 py-2 text-sm font-medium text-white transition hover:bg-accent-hover disabled:opacity-40"
        >
          Research <ArrowRight size={15} />
        </button>
      </div>

      <div className="relative mt-6 flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 text-xs">
        <span className="text-text-faint">Try:</span>
        {EXAMPLES.map((example) => (
          <button
            key={example}
            onClick={() => onSubmit(example)}
            className="text-text-muted underline decoration-border decoration-1 underline-offset-4 transition hover:text-accent-strong hover:decoration-accent-strong"
          >
            {example}
          </button>
        ))}
      </div>
    </div>
  );
}
