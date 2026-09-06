import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { History, PanelLeftClose, PanelLeftOpen, Plus } from "lucide-react";
import { listReports } from "../api";
import type { ReportMeta } from "../types";

const MOBILE_BREAKPOINT = 768;

interface SidebarProps {
  onSelectReport: (filename: string) => void;
  onNewResearch: () => void;
  activeFilename: string | null;
  refreshKey: number;
}

function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== "undefined" && window.innerWidth < MOBILE_BREAKPOINT,
  );

  useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    const handler = () => setIsMobile(mql.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, []);

  return isMobile;
}

function formatRelativeDate(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const diffMin = Math.round(diffMs / 60000);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.round(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.round(diffHr / 24);
  return `${diffDay}d ago`;
}

export function Sidebar({ onSelectReport, onNewResearch, activeFilename, refreshKey }: SidebarProps) {
  const [reports, setReports] = useState<ReportMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const isMobile = useIsMobile();
  const [collapsed, setCollapsed] = useState(
    () => typeof window !== "undefined" && window.innerWidth < MOBILE_BREAKPOINT,
  );

  useEffect(() => {
    setLoading(true);
    listReports()
      .then(setReports)
      .catch(() => setReports([]))
      .finally(() => setLoading(false));
  }, [refreshKey]);

  const closeIfMobile = () => {
    if (isMobile) setCollapsed(true);
  };

  if (collapsed) {
    return (
      <motion.button
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.15 }}
        onClick={() => setCollapsed(false)}
        className="flex h-fit items-center gap-2 rounded-sm border border-border p-2.5 text-text-muted transition hover:border-accent hover:text-accent-strong"
        title="Show history"
      >
        <PanelLeftOpen size={16} />
      </motion.button>
    );
  }

  const panel = (
    <motion.aside
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -12 }}
      transition={{ duration: 0.18 }}
      className="flex h-full w-64 shrink-0 flex-col rounded-sm border border-border bg-bg-elevated p-4 shadow-xl md:bg-bg-elevated/60 md:shadow-none"
    >
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.15em] text-text-faint">
          <History size={13} className="text-accent" />
          History
        </div>
        <button
          onClick={() => setCollapsed(true)}
          className="text-text-faint transition hover:text-text"
          title="Hide history"
        >
          <PanelLeftClose size={16} />
        </button>
      </div>

      <button
        onClick={() => {
          onNewResearch();
          closeIfMobile();
        }}
        className="mb-4 flex items-center justify-center gap-1.5 rounded-sm border border-dashed border-border py-2 text-xs text-text-muted transition hover:border-accent hover:text-accent-strong"
      >
        <Plus size={13} />
        New research
      </button>

      <div className="flex-1 space-y-1 overflow-y-auto">
        {loading &&
          [0, 1, 2].map((i) => (
            <div key={i} className="animate-pulse space-y-1.5 rounded-sm px-2.5 py-2">
              <div className="h-3 w-3/4 rounded-sm bg-bg-elevated-2" />
              <div className="h-2.5 w-1/3 rounded-sm bg-bg-elevated-2" />
            </div>
          ))}
        {!loading && reports.length === 0 && (
          <p className="px-1 text-xs text-text-faint">No past reports yet.</p>
        )}
        {!loading &&
          reports.map((report) => (
            <button
              key={report.filename}
              onClick={() => {
                onSelectReport(report.filename);
                closeIfMobile();
              }}
              className={`block w-full rounded-sm px-2.5 py-2 text-left transition ${
                activeFilename === report.filename
                  ? "bg-accent-soft text-accent-strong"
                  : "text-text-muted hover:bg-bg-elevated-2 hover:text-text"
              }`}
            >
              <p className="truncate text-xs font-medium">{report.topic}</p>
              <p className="mt-0.5 text-[11px] text-text-faint">{formatRelativeDate(report.created)}</p>
            </button>
          ))}
      </div>
    </motion.aside>
  );

  if (isMobile) {
    return (
      <AnimatePresence>
        <motion.div
          key="backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setCollapsed(true)}
          className="fixed inset-0 z-40 bg-black/50"
        />
        <div key="panel" className="fixed inset-y-4 left-4 z-50 w-64">
          {panel}
        </div>
      </AnimatePresence>
    );
  }

  return panel;
}
