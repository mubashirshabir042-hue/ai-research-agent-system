import { useCallback, useRef, useState } from "react";
import { streamResearch } from "../api";
import type { NodeEvent } from "../types";

export type RunStatus = "idle" | "running" | "done" | "error";

export function useResearchStream() {
  const [status, setStatus] = useState<RunStatus>("idle");
  const [events, setEvents] = useState<NodeEvent[]>([]);
  const [report, setReport] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [topic, setTopic] = useState("");
  const abortRef = useRef<AbortController | null>(null);

  const start = useCallback(async (query: string) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setTopic(query);
    setEvents([]);
    setReport(null);
    setErrorMessage(null);
    setStatus("running");

    try {
      await streamResearch(
        query,
        (event) => {
          setEvents((prev) => [...prev, event]);
          if (event.node === "done") {
            setReport(event.output.report);
            setStatus("done");
          } else if (event.node === "error") {
            setErrorMessage(event.output.message);
            setStatus("error");
          }
        },
        controller.signal,
      );
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        setErrorMessage((err as Error).message || "Something went wrong.");
        setStatus("error");
      }
    }
  }, []);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    setStatus("idle");
    setEvents([]);
    setReport(null);
    setErrorMessage(null);
    setTopic("");
  }, []);

  return { status, events, report, errorMessage, topic, start, reset };
}
