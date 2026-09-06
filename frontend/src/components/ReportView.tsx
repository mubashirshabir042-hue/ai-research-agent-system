import { useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Check, Copy, Download, ExternalLink, RotateCcw } from "lucide-react";

interface ParsedReport {
  title: string;
  body: string;
  references: { n: number; url: string }[];
}

function parseReport(raw: string): ParsedReport {
  const lines = raw.split("\n");
  let title = "Research Report";
  let titleLineIndex = -1;

  lines.forEach((line, i) => {
    if (titleLineIndex === -1 && line.startsWith("# Research Report:")) {
      title = line.replace("# Research Report:", "").trim();
      titleLineIndex = i;
    }
  });

  const withoutTitle = lines.filter((_, i) => i !== titleLineIndex).join("\n");
  const refIndex = withoutTitle.indexOf("## References");
  const bodyRaw = refIndex === -1 ? withoutTitle : withoutTitle.slice(0, refIndex);
  const refsRaw = refIndex === -1 ? "" : withoutTitle.slice(refIndex);

  const references = [...refsRaw.matchAll(/\[(\d+)\]\s+(\S+)/g)].map((m) => ({
    n: Number(m[1]),
    url: m[2],
  }));

  const body = bodyRaw.replace(/\[(\d+)\]/g, "[[$1]](#ref-$1)");

  return { title, body: body.trim(), references };
}

function domainOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

interface ReportViewProps {
  content: string;
  onNewResearch: () => void;
}

export function ReportView({ content, onNewResearch }: ReportViewProps) {
  const parsed = useMemo(() => parseReport(content), [content]);
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleDownload = () => {
    const blob = new Blob([content], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${parsed.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-10">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4 border-b border-border pb-6">
        <div>
          <p className="mb-1 text-xs uppercase tracking-wide text-text-faint">Research Report</p>
          <h1 className="font-display text-2xl font-medium text-text sm:text-3xl">{parsed.title}</h1>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs text-text-muted transition hover:border-accent hover:text-accent"
          >
            {copied ? <Check size={13} /> : <Copy size={13} />}
            {copied ? "Copied" : "Copy"}
          </button>
          <button
            onClick={handleDownload}
            className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs text-text-muted transition hover:border-accent hover:text-accent"
          >
            <Download size={13} />
            Download
          </button>
          <button
            onClick={onNewResearch}
            className="flex items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-xs font-medium text-white transition hover:bg-accent-strong"
          >
            <RotateCcw size={13} />
            New research
          </button>
        </div>
      </div>

      <article className="report-prose prose prose-sm dark:prose-invert sm:prose-base max-w-none prose-headings:font-display prose-headings:font-medium prose-a:text-accent">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{parsed.body}</ReactMarkdown>
      </article>

      {parsed.references.length > 0 && (
        <div className="mt-10 border-t border-border pt-6">
          <h2 className="mb-3 font-display text-lg font-medium text-text">References</h2>
          <ol className="report-refs space-y-1.5">
            {parsed.references.map((ref) => (
              <li key={ref.n} id={`ref-${ref.n}`} className="flex gap-2 px-2 py-1 text-sm">
                <span className="text-text-faint">[{ref.n}]</span>
                <a
                  href={ref.url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 text-accent hover:underline"
                >
                  {domainOf(ref.url)}
                  <ExternalLink size={11} />
                </a>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}
