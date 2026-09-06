import { AnimatePresence, motion } from "framer-motion";
import { Compass, FileText, Globe, ShieldCheck } from "lucide-react";
import { StageCard, type StageStatus } from "./StageCard";
import type { EvaluatorOutput, NodeEvent, PlannerOutput, RetrieverOutput } from "../types";
import type { RunStatus } from "../hooks/useResearchStream";

interface Round {
  planner: PlannerOutput;
  retriever: RetrieverOutput | null;
  evaluator: EvaluatorOutput | null;
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

interface PipelineViewProps {
  topic: string;
  events: NodeEvent[];
  status: RunStatus;
  hasReport: boolean;
}

export function PipelineView({ topic, events, status, hasReport }: PipelineViewProps) {
  const rounds = buildRounds(events);
  const isRunning = status === "running";
  const lastRound = rounds[rounds.length - 1];

  const generatorStatus: StageStatus = hasReport
    ? "done"
    : isRunning && !!lastRound?.evaluator
      ? "active"
      : "pending";

  return (
    <div className="mx-auto w-full max-w-2xl px-6 py-10">
      <p className="mb-1 text-xs uppercase tracking-wide text-text-faint">Researching</p>
      <h2 className="mb-8 text-xl font-medium text-text">{topic}</h2>

      <div className="space-y-8">
        <AnimatePresence initial={false}>
          {rounds.length === 0 && (
            <motion.div key="bootstrapping" exit={{ opacity: 0 }}>
              <StageCard icon={Compass} title="Planning research" status="active">
                Breaking the topic into targeted search queries&hellip;
              </StageCard>
            </motion.div>
          )}

          {rounds.map((round, i) => {
            const isLast = i === rounds.length - 1;
            const retrieverStatus: StageStatus = round.retriever
              ? "done"
              : isLast && isRunning
                ? "active"
                : "pending";
            const evaluatorStatus: StageStatus = round.evaluator
              ? "done"
              : isLast && isRunning && round.retriever
                ? "active"
                : "pending";

            return (
              <motion.div
                key={i}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-3"
              >
                {rounds.length > 1 && (
                  <p className="text-xs font-medium uppercase tracking-wide text-accent">
                    Round {i + 1}
                    {i > 0 ? " — refining research" : ""}
                  </p>
                )}

                <StageCard icon={Compass} title="Query Planner" status="done">
                  <div className="flex flex-wrap gap-1.5">
                    {round.planner.sub_queries.map((q) => (
                      <span
                        key={q}
                        className="rounded-full border border-border bg-bg-elevated-2 px-2.5 py-1 text-xs text-text-muted"
                      >
                        {q}
                      </span>
                    ))}
                  </div>
                </StageCard>

                <StageCard icon={Globe} title="Search Retriever" status={retrieverStatus}>
                  {round.retriever ? (
                    <p>
                      Fetched{" "}
                      <span className="font-medium text-text">{round.retriever.collected_data.length}</span>{" "}
                      snippets from{" "}
                      {[...new Set(round.retriever.collected_data.map((d) => domainOf(d.url)))]
                        .slice(0, 4)
                        .join(", ")}
                      {round.retriever.collected_data.length > 4 ? "…" : ""}
                    </p>
                  ) : (
                    <p>Searching the web&hellip;</p>
                  )}
                </StageCard>

                <StageCard icon={ShieldCheck} title="Fact Evaluator" status={evaluatorStatus}>
                  {round.evaluator ? (
                    <div className="space-y-1.5">
                      <p>
                        Validated{" "}
                        <span className="font-medium text-text">{round.evaluator.evaluated_facts.length}</span>{" "}
                        facts &mdash;{" "}
                        {round.evaluator.sufficient ? (
                          <span className="text-success">sufficient coverage</span>
                        ) : (
                          <span className="text-accent">refining further</span>
                        )}
                      </p>
                      {!round.evaluator.sufficient && round.evaluator.missing_topics.length > 0 && (
                        <p className="text-xs text-text-faint">
                          Still missing: {round.evaluator.missing_topics.join("; ")}
                        </p>
                      )}
                    </div>
                  ) : (
                    <p>Cross-referencing sources&hellip;</p>
                  )}
                </StageCard>
              </motion.div>
            );
          })}
        </AnimatePresence>

        <StageCard icon={FileText} title="Report Generator" status={generatorStatus}>
          {generatorStatus === "done"
            ? "Report ready."
            : generatorStatus === "active"
              ? "Writing the cited report…"
              : "Waiting for validated facts…"}
        </StageCard>
      </div>
    </div>
  );
}
