import { isValidElement, useMemo, useState, type ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Check, Copy, ExternalLink, FileDown, FileText, RotateCcw } from "lucide-react";
import { downloadReportExport, type ExportFormat } from "../api";

interface ParsedReport {
  title: string;
  body: string;
  references: { n: number; url: string }[];
}

interface Heading {
  id: string;
  text: string;
}

function slugify(text: string): string {
  return (
    text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "") || "section"
  );
}

// Extracted for the "On this page" nav only (display text); the ids that
// links point to are generated from the actually-rendered heading text (see
// the ReactMarkdown `h2` override below) so the two can never drift apart.
function extractHeadings(body: string): Heading[] {
  return [...body.matchAll(/^##\s+(.+)$/gm)].map((m) => {
    const text = m[1].replace(/[*_`~]/g, "").trim();
    return { id: slugify(text), text };
  });
}

function flattenToText(node: ReactNode): string {
  if (node == null || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(flattenToText).join("");
  if (isValidElement(node)) return flattenToText((node.props as { children?: ReactNode }).children);
  return "";
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
  const headings = useMemo(() => extractHeadings(parsed.body), [parsed.body]);
  const [copied, setCopied] = useState(false);
  const [exportStatus, setExportStatus] = useState<Record<ExportFormat, "idle" | "loading" | "done" | "error">>({
    pdf: "idle",
    docx: "idle",
  });

  const handleCopy = async () => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleExport = async (format: ExportFormat) => {
    setExportStatus((s) => ({ ...s, [format]: "loading" }));
    try {
      const stem = parsed.title.toLowerCase().replace(/[^a-z0-9]+/g, "-") || "research-report";
      await downloadReportExport(content, format, stem);
      setExportStatus((s) => ({ ...s, [format]: "done" }));
    } catch {
      setExportStatus((s) => ({ ...s, [format]: "error" }));
    } finally {
      setTimeout(() => setExportStatus((s) => ({ ...s, [format]: "idle" })), 1800);
    }
  };

  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-10">
      <div className="grid grid-cols-1 gap-12 lg:grid-cols-[minmax(0,1fr)_200px]">
        <div className="min-w-0">
          <div className="mb-6 flex flex-wrap items-start justify-between gap-4 border-b border-border pb-6">
            <div>
              <p className="mb-1 text-xs uppercase tracking-wide text-text-faint">Research Report</p>
              <h1 className="font-display text-2xl font-medium text-text sm:text-3xl">{parsed.title}</h1>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={handleCopy}
                className="flex items-center gap-1.5 rounded-sm border border-border px-3 py-1.5 text-xs text-text-muted transition hover:border-accent hover:text-accent-strong"
              >
                {copied ? <Check size={13} /> : <Copy size={13} />}
                {copied ? "Copied" : "Copy"}
              </button>
              <button
                onClick={() => handleExport("pdf")}
                disabled={exportStatus.pdf === "loading"}
                className="flex items-center gap-1.5 rounded-sm border border-border px-3 py-1.5 text-xs text-text-muted transition hover:border-accent hover:text-accent-strong disabled:opacity-50"
              >
                {exportStatus.pdf === "done" ? <Check size={13} /> : <FileText size={13} />}
                {exportStatus.pdf === "loading"
                  ? "Exporting…"
                  : exportStatus.pdf === "done"
                    ? "Saved"
                    : exportStatus.pdf === "error"
                      ? "Failed"
                      : "PDF"}
              </button>
              <button
                onClick={() => handleExport("docx")}
                disabled={exportStatus.docx === "loading"}
                className="flex items-center gap-1.5 rounded-sm border border-border px-3 py-1.5 text-xs text-text-muted transition hover:border-accent hover:text-accent-strong disabled:opacity-50"
              >
                {exportStatus.docx === "done" ? <Check size={13} /> : <FileDown size={13} />}
                {exportStatus.docx === "loading"
                  ? "Exporting…"
                  : exportStatus.docx === "done"
                    ? "Saved"
                    : exportStatus.docx === "error"
                      ? "Failed"
                      : "Word"}
              </button>
              <button
                onClick={onNewResearch}
                className="flex items-center gap-1.5 rounded-sm bg-accent px-3 py-1.5 text-xs font-medium text-white transition hover:bg-accent-hover"
              >
                <RotateCcw size={13} />
                New research
              </button>
            </div>
          </div>

          <article className="report-prose prose prose-sm dark:prose-invert sm:prose-base max-w-none font-serif prose-headings:font-display prose-headings:font-medium prose-a:text-accent-strong">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                h2: ({ node: _node, children, ...props }) => (
                  <h2 id={slugify(flattenToText(children))} {...props}>
                    {children}
                  </h2>
                ),
              }}
            >
              {parsed.body}
            </ReactMarkdown>
          </article>

          {parsed.references.length > 0 && (
            <div className="mt-10 border-t border-border pt-6">
              <p className="mb-3 text-xs font-medium uppercase tracking-wide text-text-faint">Notes &amp; References</p>
              <ol className="report-refs space-y-1.5 font-serif text-sm">
                {parsed.references.map((ref) => (
                  <li key={ref.n} id={`ref-${ref.n}`} className="flex gap-2 px-2 py-1">
                    <span className="text-text-faint">{ref.n}.</span>
                    <a
                      href={ref.url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1 text-accent-strong hover:underline"
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

        {headings.length > 1 && (
          <aside className="hidden lg:block">
            <div className="sticky top-10">
              <p className="mb-3 text-xs font-medium uppercase tracking-wide text-text-faint">On this page</p>
              <nav className="space-y-2 border-l border-border pl-4 text-sm">
                {headings.map((heading) => (
                  <a
                    key={heading.id}
                    href={`#${heading.id}`}
                    className="block text-text-muted transition hover:text-accent-strong"
                  >
                    {heading.text}
                  </a>
                ))}
              </nav>
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}
