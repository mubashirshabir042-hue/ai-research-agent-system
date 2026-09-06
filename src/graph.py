"""LangGraph assembly: wires the four nodes together with conditional routing."""

from langgraph.graph import END, START, StateGraph

from .config import MAX_PLANNER_ITERATIONS
from .nodes.evaluator import evaluator_node
from .nodes.generator import generator_node
from .nodes.planner import planner_node
from .nodes.retriever import retriever_node
from .state import ResearchState


def route_after_evaluation(state: ResearchState) -> str:
    """Proceed to the generator once facts are sufficient, or after the
    planner<->evaluator loop has run out of allowed iterations - whichever
    comes first, so the graph always terminates."""
    if state.get("sufficient", False):
        return "generator"
    if state.get("iteration", 0) >= MAX_PLANNER_ITERATIONS:
        return "generator"
    return "planner"


def build_graph():
    graph = StateGraph(ResearchState)

    graph.add_node("planner", planner_node)
    graph.add_node("retriever", retriever_node)
    graph.add_node("evaluator", evaluator_node)
    graph.add_node("generator", generator_node)

    graph.add_edge(START, "planner")
    graph.add_edge("planner", "retriever")
    graph.add_edge("retriever", "evaluator")
    graph.add_conditional_edges(
        "evaluator",
        route_after_evaluation,
        {"generator": "generator", "planner": "planner"},
    )
    graph.add_edge("generator", END)

    return graph.compile()
