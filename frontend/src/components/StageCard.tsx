import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export type StageStatus = "pending" | "active" | "done" | "error";

interface StageCardProps {
  icon: LucideIcon;
  title: string;
  status: StageStatus;
  children?: ReactNode;
}

const ringClass: Record<StageStatus, string> = {
  pending: "border-border text-text-faint",
  active: "border-accent text-accent animate-pulse-glow",
  done: "border-success/40 text-success",
  error: "border-danger/40 text-danger",
};

export function StageCard({ icon: Icon, title, status, children }: StageCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className={`rounded-2xl border bg-bg-elevated/80 p-5 backdrop-blur-sm transition-colors ${
        status === "pending" ? "border-border opacity-60" : "border-border-strong"
      }`}
    >
      <div className="flex items-center gap-3">
        <span
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border ${ringClass[status]}`}
        >
          <Icon size={16} strokeWidth={2} />
        </span>
        <h3 className="font-medium text-text">{title}</h3>
        {status === "active" && <span className="ml-auto h-2 w-2 animate-pulse rounded-full bg-accent" />}
        {status === "done" && <span className="ml-auto text-xs text-success">Done</span>}
      </div>
      {children && <div className="mt-3 pl-12 text-sm text-text-muted">{children}</div>}
    </motion.div>
  );
}
