"""Node 3: Fact Evaluator - cross-references, dedupes, and validates snippets."""

from typing import List

from pydantic import BaseModel, Field

from ..config import get_chat_model
from ..llm_utils import invoke_with_fallback
from ..state import ResearchState
from ..utils import log

EVAL_PROMPT = """You are the Fact Evaluator node of an autonomous research agent.

Research topic: "{topic}"

Below are raw text snippets retrieved from the web, each numbered and tagged \
with its source URL:

{snippets}

Your job:
1. Cross-reference these snippets and extract a consolidated list of distinct, \
verifiable factual statements relevant to the topic.
2. Remove redundant or duplicate information.
3. If snippets conflict, resolve the conflict when possible (favor the more \
specific, recent, or credible source); if it cannot be resolved, state both \
claims separately, each attributed to its own source.
4. Every fact MUST cite the exact source URL(s) it came from, copied exactly \
as given below - never invent a URL.
5. Decide whether these facts are SUFFICIENT to write a comprehensive report \
on the topic. If not, list the specific aspects that are still missing."""


class Fact(BaseModel):
    statement: str = Field(
        description="A single, self-contained factual claim relevant to the research topic."
    )
    source_urls: List[str] = Field(
        description="The exact source URL(s), copied verbatim, that support this statement."
    )


class EvaluationResult(BaseModel):
    facts: List[Fact] = Field(
        description="Deduplicated, cross-referenced, reliable facts extracted from the snippets."
    )
    sufficient: bool = Field(
        description="True if these facts comprehensively and reliably answer the research topic."
    )
    missing_topics: List[str] = Field(
        default_factory=list,
        description="If not sufficient, the specific aspects still missing that further searches should target.",
    )


def evaluator_node(state: ResearchState) -> dict:
    collected = state.get("collected_data", [])
    if not collected:
        log("[Evaluator] no data collected, marking insufficient", style="yellow")
        return {"evaluated_facts": [], "sufficient": False, "missing_topics": []}

    snippet_blocks = [
        f"[{i}] URL: {d['url']}\n{d['content'][:1500]}"
        for i, d in enumerate(collected, start=1)
    ]
    prompt = EVAL_PROMPT.format(
        topic=state["user_query"], snippets="\n\n".join(snippet_blocks)
    )

    result: EvaluationResult = invoke_with_fallback(
        lambda provider, model: get_chat_model(provider, model, temperature=0.1).with_structured_output(
            EvaluationResult
        ),
        prompt,
    )
    log(f"[Evaluator] {len(result.facts)} facts, sufficient={result.sufficient}")

    return {
        "evaluated_facts": [f.model_dump() for f in result.facts],
        "sufficient": result.sufficient,
        "missing_topics": result.missing_topics,
    }
