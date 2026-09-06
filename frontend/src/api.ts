import type { NodeEvent, ReportMeta } from "./types";

// Vite's dev proxy buffers streamed (chunked) response bodies instead of
// forwarding them incrementally, which breaks the live pipeline view. In dev
// we talk to the FastAPI backend directly (CORS is configured for this
// origin); in production the built frontend is served by FastAPI itself, so
// relative paths are same-origin and the proxy is irrelevant.
const API_BASE = import.meta.env.DEV ? "http://localhost:8000" : "";

export async function streamResearch(
  query: string,
  onEvent: (event: NodeEvent) => void,
  signal?: AbortSignal,
): Promise<void> {
  const response = await fetch(`${API_BASE}/api/research`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
    signal,
  });

  if (!response.ok || !response.body) {
    throw new Error(`Request failed (${response.status})`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  const consumeLine = (line: string) => {
    const trimmed = line.trim();
    if (trimmed) onEvent(JSON.parse(trimmed) as NodeEvent);
  };

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    let newlineIndex = buffer.indexOf("\n");
    while (newlineIndex !== -1) {
      consumeLine(buffer.slice(0, newlineIndex));
      buffer = buffer.slice(newlineIndex + 1);
      newlineIndex = buffer.indexOf("\n");
    }
  }

  if (buffer.trim()) consumeLine(buffer);
}

export async function listReports(): Promise<ReportMeta[]> {
  const response = await fetch(`${API_BASE}/api/reports`);
  if (!response.ok) throw new Error("Failed to load research history");
  return response.json();
}

export async function getReport(filename: string): Promise<{ filename: string; content: string }> {
  const response = await fetch(`${API_BASE}/api/reports/${encodeURIComponent(filename)}`);
  if (!response.ok) throw new Error("Failed to load report");
  return response.json();
}

export type ExportFormat = "pdf" | "docx";

/** Fetches a PDF/Word rendering of the given report markdown and triggers a
 * browser download for it, named after the report's slug. */
export async function downloadReportExport(
  content: string,
  format: ExportFormat,
  filenameStem: string,
): Promise<void> {
  const response = await fetch(`${API_BASE}/api/export/${format}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content }),
  });
  if (!response.ok) throw new Error(`Failed to export ${format.toUpperCase()}`);

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filenameStem}.${format}`;
  a.click();
  URL.revokeObjectURL(url);
}
