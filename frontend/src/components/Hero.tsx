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
    <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
      <span className="mb-5 inline-flex items-center gap-2 rounded-full border border-border bg-bg-elevated px-3 py-1 text-xs text-text-muted">
        <Sparkles size={13} className="text-accent" />
        Multi-agent research, cited end to end
      </span>

      <h1 className="max-w-2xl font-display text-4xl font-medium leading-tight text-text sm:text-5xl">
        Ask a question. Get a <span className="text-accent">cited</span> research report.
      </h1>

      <p className="mt-4 max-w-md text-text-muted">
        Four autonomous agents plan, search, cross-check, and write &mdash; every claim traced
        back to a source.
      </p>

      <div className="mt-8 flex w-full max-w-xl items-center gap-2 rounded-2xl border border-border bg-bg-elevated p-2 shadow-lg shadow-black/20 focus-within:border-accent">
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder="What do you want to research?"
          className="flex-1 bg-transparent px-3 py-2 text-sm text-text placeholder:text-text-faint focus:outline-none"
        />
        <button
          onClick={submit}
          disabled={!value.trim()}
          className="flex items-center gap-1.5 rounded-xl bg-accent px-4 py-2 text-sm font-medium text-white transition hover:bg-accent-strong disabled:opacity-40"
        >
          Research <ArrowRight size={15} />
        </button>
      </div>

      <div className="mt-5 flex flex-wrap justify-center gap-2">
        {EXAMPLES.map((example) => (
          <button
            key={example}
            onClick={() => onSubmit(example)}
            className="rounded-full border border-border px-3 py-1.5 text-xs text-text-muted transition hover:border-accent hover:text-accent"
          >
            {example}
          </button>
        ))}
      </div>
    </div>
  );
}
