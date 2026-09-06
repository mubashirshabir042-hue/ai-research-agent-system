"""Node 2: Search Retriever - fetches web snippets for each new sub-query."""

from ..config import MAX_RESULTS_PER_QUERY
from ..state import ResearchState
from ..tools.search import get_tavily_client
from ..utils import log


def retriever_node(state: ResearchState) -> dict:
    already_searched = set(state.get("searched_queries", []))
    to_search = [q for q in state["sub_queries"] if q not in already_searched]

    client = get_tavily_client()
    new_snippets = []

    for query in to_search:
        try:
            response = client.search(
                query=query,
                max_results=MAX_RESULTS_PER_QUERY,
                search_depth="advanced",
            )
        except Exception as exc:  # network/API errors shouldn't crash the run
            log(f"[Retriever] search failed for '{query}': {exc}", style="red")
            continue

        for result in response.get("results", []):
            content = (result.get("content") or "").strip()
            url = result.get("url")
            if not content or not url:
                continue
            new_snippets.append(
                {
                    "content": content,
                    "url": url,
                    "title": result.get("title", ""),
                    "sub_query": query,
                }
            )

    log(f"[Retriever] fetched {len(new_snippets)} snippets from {len(to_search)} new queries")

    return {
        "collected_data": new_snippets,
        "searched_queries": to_search,
    }
