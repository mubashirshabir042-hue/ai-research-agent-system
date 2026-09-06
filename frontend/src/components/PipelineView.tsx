import type { ReactNode } from "react";
import { Compass, FileText, Globe, ShieldCheck } from "lucide-react";
import { StageCard, type StageStatus } from "./StageCard";
import type { EvaluatorOutput, NodeEvent, PlannerOutput, RetrieverOutput } from "../types";
import type { RunStatus } from "../hooks/useResearchStream";

interface Round {
  planner: PlannerOutput;
  retriever: RetrieverOutput | null;
  evaluator: EvaluatorOutput | null;
}

interface StageRow {
  key: string;
  icon: typeof Compass;
  title: string;
  status: StageStatus;
  badge?: string;
  detail: ReactNode;
}

function buildRounds(events: NodeEvent[]): Round[] {
  const rounds: Round[] = [];
  let current: Round | null = null;

  for (const event of events) {
    if (event.node === "planner") {
      current = { planner: event.output, retriever: null, evaluator: null };
      rounds.push(current);
    } else if (event.node === "retriever" && current) {
      current.retriever = event.output;
    } else if (event.node === "evaluator" && current) {
      current.evaluator = event.output;
    }
  }

  return rounds;
}

function domainOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function buildRows(rounds: Round[], isRunning: boolean, hasReport: boolean): StageRow[] {
  const rows: StageRow[] = [];

  if (rounds.length === 0) {
    rows.push({
      key: "planner-bootstrap",
      icon: Compass,
      title: "Query Planner",
      status: "active",
      detail: "Breaking the topic into targeted search queries…",
    });
  }

  rounds.forEach((round, i) => {
    const isLastRound = i === rounds.length - 1;
    const showRound = rounds.length > 1;

    rows.push({
      key: `planner-${i}`,
      icon: Compass,
      title: "Query Planner",
      badge: showRound ? `Round ${i + 1}` : undefined,
      status: "done",
      detail: (
        <div className="flex flex-wrap gap-1.5">
          {round.planner.sub_queries.map((q) => (
            <span key={q} className="rounded-full border border-border bg-bg-elevated-2 px-2.5 py-1 text-xs text-text-muted">
              {q}
            </span>
          ))}
        </div>
      ),
    });

    const retrieverStatus: StageStatus = round.retriever ? "done" : isLastRound && isRunning ? "active" : "pending";
    rows.push({
      key: `retriever-${i}`,
      icon: Globe,
      title: "Search Retriever",
      status: retrieverStatus,
      detail: round.retriever ? (
        <p>
          Fetched <span className="font-medium text-text">{round.retriever.collected_data.length}</span> snippets
          from {[...new Set(round.retriever.collected_data.map((d) => domainOf(d.url)))].slice(0, 4).join(", ")}
          {round.retriever.collected_data.length > 4 ? "…" : ""}
        </p>
      ) : (
        <p>Searching the web…</p>
      ),
    });

    const evaluatorStatus: StageStatus = round.evaluator
      ? "done"
      : isLastRound && isRunning && round.retriever
        ? "active"
        : "pending";
    rows.push({
      key: `evaluator-${i}`,
      icon: ShieldCheck,
      title: "Fact Evaluator",
      status: evaluatorStatus,
      detail: round.evaluator ? (
        <div className="space-y-1.5">
          <p>
            Validated <span className="font-medium text-text">{round.evaluator.evaluated_facts.length}</span> facts
            &mdash;{" "}
            {round.evaluator.sufficient ? (
              <span className="text-success">sufficient coverage</span>
            ) : (
              <span className="text-accent">refining further</span>
            )}
          </p>
          {!round.evaluator.sufficient && round.evaluator.missing_topics.length > 0 && (
            <p className="text-xs text-text-faint">Still missing: {round.evaluator.missing_topics.join("; ")}</p>
          )}
        </div>
      ) : (
        <p>Cross-referencing sources…</p>
      ),
    });
  });

  const lastRound = rounds[rounds.length - 1];
  const generatorStatus: StageStatus = hasReport ? "done" : isRunning && !!lastRound?.evaluator ? "active" : "pending";
  rows.push({
    key: "generator",
    icon: FileText,
    title: "Report Generator",
    status: generatorStatus,
    detail:
      generatorStatus === "done"
        ? "Report ready."
        : generatorStatus === "active"
          ? "Writing the cited report…"
          : "Waiting for validated facts…",
  });

  return rows;
}

interface PipelineViewProps {
  topic: string;
  events: NodeEvent[];
  status: RunStatus;
  hasReport: boolean;
}

export function PipelineView({ topic, events, status, hasReport }: PipelineViewProps) {
  const rounds = buildRounds(events);
  const rows = buildRows(rounds, status === "running", hasReport);

  return (
    <div className="mx-auto w-full max-w-2xl px-6 py-10">
      <p className="mb-1 text-xs uppercase tracking-wide text-text-faint">Researching</p>
      <h2 className="mb-8 text-xl font-medium text-text">{topic}</h2>

      <div className="flex flex-col gap-3">
        {rows.map((row, i) => (
          <StageCard
            key={row.key}
            icon={row.icon}
            title={row.title}
            status={row.status}
            badge={row.badge}
            isLast={i === rows.length - 1}
          >
            {row.detail}
          </StageCard>
        ))}
      </div>
    </div>
  );
}
