"""Node 1: Query Planner - decomposes the topic into targeted sub-queries."""

from typing import List

from pydantic import BaseModel, Field

from ..config import get_chat_model
from ..llm_utils import invoke_with_fallback
from ..state import ResearchState
from ..utils import log

INITIAL_PROMPT = """You are the Query Planner node of an autonomous research agent.

Research topic: "{topic}"

Break this topic down into 3 to 5 specific, targeted web-search queries that \
together cover the topic's key angles (e.g. definitions, current state, \
causes/mechanisms, data/statistics, expert opinion, controversies, recent \
developments). Each query should read like something typed into a search \
engine, not a full sentence question."""

REFINEMENT_PROMPT = """You are the Query Planner node of an autonomous research agent, \
revising an in-progress research plan.

Research topic: "{topic}"

Queries already searched: {existing}

The Fact Evaluator determined the research so far is INSUFFICIENT. Specifically, \
these aspects are still missing or under-covered:
{missing}

Generate 2 to 4 NEW, specific web-search queries that target exactly these gaps. \
Do not repeat or closely paraphrase the queries already searched."""


class SubQueryPlan(BaseModel):
    sub_queries: List[str] = Field(
        description=(
            "Focused, non-overlapping web-search queries that together give "
            "comprehensive coverage of the research topic."
        )
    )


def planner_node(state: ResearchState) -> dict:
    existing = state.get("sub_queries", [])

    if existing and state.get("missing_topics"):
        prompt = REFINEMENT_PROMPT.format(
            topic=state["user_query"],
            existing="; ".join(existing),
            missing="\n".join(f"- {m}" for m in state["missing_topics"]),
        )
    else:
        prompt = INITIAL_PROMPT.format(topic=state["user_query"])

    plan: SubQueryPlan = invoke_with_fallback(
        lambda provider, model: get_chat_model(provider, model, temperature=0.3).with_structured_output(SubQueryPlan),
        prompt,
    )

    existing_lower = {q.lower().strip() for q in existing}
    new_queries = [
        q.strip() for q in plan.sub_queries if q.lower().strip() not in existing_lower
    ]

    log(f"[Planner] +{len(new_queries)} sub-queries: {new_queries}")

    return {
        "sub_queries": new_queries,
        "iteration": state.get("iteration", 0) + 1,
    }
