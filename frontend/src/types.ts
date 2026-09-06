export interface SourceSnippet {
  content: string;
  url: string;
  title: string;
  sub_query: string;
}

export interface EvaluatedFact {
  statement: string;
  source_urls: string[];
}

export interface PlannerOutput {
  sub_queries: string[];
  iteration: number;
}

export interface RetrieverOutput {
  collected_data: SourceSnippet[];
  searched_queries: string[];
}

export interface EvaluatorOutput {
  evaluated_facts: EvaluatedFact[];
  sufficient: boolean;
  missing_topics: string[];
}

export interface GeneratorOutput {
  final_report: string;
}

export interface DoneOutput {
  filename: string;
  report: string;
}

export interface ErrorOutput {
  message: string;
}

export type NodeEvent =
  | { node: "planner"; output: PlannerOutput }
  | { node: "retriever"; output: RetrieverOutput }
  | { node: "evaluator"; output: EvaluatorOutput }
  | { node: "generator"; output: GeneratorOutput }
  | { node: "done"; output: DoneOutput }
  | { node: "error"; output: ErrorOutput };

export interface ReportMeta {
  filename: string;
  topic: string;
  created: string;
}
