import { useEffect, useState, type ReactNode } from "react";
import { AlertTriangle } from "lucide-react";
import { Hero } from "./components/Hero";
import { PipelineView } from "./components/PipelineView";
import { ReportView } from "./components/ReportView";
import { Sidebar } from "./components/Sidebar";
import { ThemeToggle } from "./components/ThemeToggle";
import { ThemeProvider } from "./context/ThemeContext";
import { useResearchStream } from "./hooks/useResearchStream";
import { getReport } from "./api";

interface HistoryReport {
  filename: string;
  content: string;
}

function AppShell() {
  const { status, events, report, errorMessage, topic, start, reset } = useResearchStream();
  const [historyReport, setHistoryReport] = useState<HistoryReport | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (status === "done") setRefreshKey((key) => key + 1);
  }, [status]);

  const handleNewResearch = () => {
    setHistoryReport(null);
    reset();
  };

  const handleSubmit = (query: string) => {
    setHistoryReport(null);
    start(query);
  };

  const handleSelectReport = async (filename: string) => {
    try {
      const data = await getReport(filename);
      setHistoryReport(data);
    } catch {
      // keep current view if the fetch fails
    }
  };

  // Deep link support: /?report=<filename> opens a saved report directly,
  // so a specific report can be shared or bookmarked.
  useEffect(() => {
    const filename = new URLSearchParams(window.location.search).get("report");
    if (filename) handleSelectReport(filename);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  let main: ReactNode;
  if (historyReport) {
    main = <ReportView content={historyReport.content} onNewResearch={handleNewResearch} />;
  } else if (status === "running") {
    main = <PipelineView topic={topic} events={events} status={status} hasReport={false} />;
  } else if (status === "done" && report) {
    main = <ReportView content={report} onNewResearch={handleNewResearch} />;
  } else {
    main = <Hero onSubmit={handleSubmit} />;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-bg text-text">
      <div className="p-4">
        <Sidebar
          onSelectReport={handleSelectReport}
          onNewResearch={handleNewResearch}
          activeFilename={historyReport?.filename ?? null}
          refreshKey={refreshKey}
        />
      </div>

      <div className="flex flex-1 flex-col overflow-y-auto">
        <header className="border-b border-border px-8 py-5">
          <div className="flex items-end justify-between">
            <div>
              <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-text-faint">
                Autonomous Research
              </p>
              <h1 className="font-display text-xl font-semibold tracking-tight text-text">Research Agent</h1>
            </div>
            <ThemeToggle />
          </div>
        </header>

        {status === "error" && !historyReport && (
          <div className="mx-6 mt-4 flex items-center gap-2 border border-danger/30 bg-danger-soft px-4 py-3 text-sm text-danger">
            <AlertTriangle size={15} />
            {errorMessage}
          </div>
        )}

        <div className="flex flex-1 flex-col">{main}</div>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AppShell />
    </ThemeProvider>
  );
}
