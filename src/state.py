"""Shared state definition for the AI Research Agent LangGraph workflow."""

import operator
from typing import Annotated, List, TypedDict


class SourceSnippet(TypedDict):
    """A single piece of raw text retrieved from the web, with provenance."""

    content: str
    url: str
    title: str
    sub_query: str


class EvaluatedFact(TypedDict):
    """A cross-referenced, validated factual statement with its supporting sources."""

    statement: str
    source_urls: List[str]


class ResearchState(TypedDict):
    """Global state object passed between LangGraph nodes.

    Fields annotated with ``operator.add`` accumulate across planner<->evaluator
    loop iterations instead of being overwritten, so re-running a node appends
    to (rather than replaces) what earlier iterations already collected.
    """

    user_query: str
    sub_queries: Annotated[List[str], operator.add]
    searched_queries: Annotated[List[str], operator.add]
    collected_data: Annotated[List[SourceSnippet], operator.add]
    evaluated_facts: List[EvaluatedFact]
    final_report: str
    iteration: int
    sufficient: bool
    missing_topics: List[str]
