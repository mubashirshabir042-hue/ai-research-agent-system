import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export type StageStatus = "pending" | "active" | "done" | "error";

interface StageCardProps {
  icon: LucideIcon;
  title: string;
  status: StageStatus;
  badge?: string;
  isLast?: boolean;
  children?: ReactNode;
}

const ringClass: Record<StageStatus, string> = {
  pending: "border-border text-text-faint",
  active: "border-accent text-accent animate-pulse-glow",
  done: "border-success text-success",
  error: "border-danger text-danger",
};

export function StageCard({ icon: Icon, title, status, badge, isLast = false, children }: StageCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="flex gap-4"
    >
      <div className="flex shrink-0 flex-col items-center">
        <span
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border bg-bg ${ringClass[status]}`}
        >
          <Icon size={16} strokeWidth={2} />
        </span>
        {!isLast && (
          <div className="relative mt-1 w-px flex-1 overflow-hidden rounded-full bg-border">
            <motion.div
              initial={{ scaleY: 0 }}
              animate={{ scaleY: status === "done" ? 1 : 0 }}
              transition={{ duration: 0.4 }}
              style={{ transformOrigin: "top" }}
              className="absolute inset-0 rounded-full bg-success"
            />
          </div>
        )}
      </div>

      <div
        className={`flex-1 rounded-sm border bg-bg-elevated/80 p-5 backdrop-blur-sm transition-colors ${
          status === "pending" ? "border-border opacity-60" : "border-border-strong"
        }`}
      >
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <h3 className="whitespace-nowrap font-medium text-text">{title}</h3>
          {badge && (
            <span className="text-[11px] font-medium uppercase tracking-wide text-accent-strong">{badge}</span>
          )}
          {status === "active" && <span className="ml-auto h-2 w-2 animate-pulse rounded-full bg-accent" />}
          {status === "done" && <span className="ml-auto text-xs text-success">Done</span>}
        </div>
        {children && <div className="mt-3 text-sm text-text-muted">{children}</div>}
      </div>
    </motion.div>
  );
}
