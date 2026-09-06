"""Tavily search client wrapper, optimized for agentic web retrieval."""

from tavily import TavilyClient

from ..config import TAVILY_API_KEY

_client: TavilyClient | None = None


def get_tavily_client() -> TavilyClient:
    """Return a lazily-initialized, module-level Tavily client."""
    global _client
    if _client is None:
        if not TAVILY_API_KEY:
            raise RuntimeError(
                "TAVILY_API_KEY is not set. Copy .env.example to .env and add "
                "your Tavily API key (https://app.tavily.com)."
            )
        _client = TavilyClient(api_key=TAVILY_API_KEY)
    return _client
