"""Environment configuration and shared LLM client factories."""

import os

from dotenv import load_dotenv
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_openai import ChatOpenAI

load_dotenv()

GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
TAVILY_API_KEY = os.getenv("TAVILY_API_KEY")
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-3.6-flash")
MAX_PLANNER_ITERATIONS = int(os.getenv("MAX_PLANNER_ITERATIONS", "2"))
MAX_RESULTS_PER_QUERY = int(os.getenv("MAX_RESULTS_PER_QUERY", "4"))

# Gemini's free tier caps requests *per model, per day* (independently for
# each model). If GEMINI_MODEL runs out, these are tried in order before
# falling through to Grok (if configured) -- see src/llm_utils.py.
FALLBACK_GEMINI_MODELS = [
    m.strip()
    for m in os.getenv(
        "GEMINI_FALLBACK_MODELS", "gemini-3.8-flash,gemini-flash-lite-latest,gemini-3.5-flash-lite,gemini-3.1-flash-lite"
    ).split(",")
    if m.strip()
]

# xAI's Grok, used via its OpenAI-compatible API as a *cross-provider* last
# resort -- it draws from an entirely separate quota, so it survives even a
# total Gemini outage, not just one exhausted model. Optional: only used if
# XAI_API_KEY is set.
XAI_API_KEY = os.getenv("XAI_API_KEY")
GROK_MODEL = os.getenv("GROK_MODEL", "grok-4-fast")


def get_llm(temperature: float = 0.2, model: str | None = None) -> ChatGoogleGenerativeAI:
    """Return a configured Gemini chat model.

    Args:
        model: overrides GEMINI_MODEL for this call. Used by
            src.llm_utils.invoke_with_fallback to retry with a sibling model
            when the primary one's daily quota is exhausted.

    Raises:
        RuntimeError: if GOOGLE_API_KEY is missing, with a message pointing the
            user at .env.example rather than a raw SDK auth error.
    """
    if not GOOGLE_API_KEY:
        raise RuntimeError(
            "GOOGLE_API_KEY is not set. Copy .env.example to .env and add your "
            "Google AI Studio API key (https://aistudio.google.com/app/apikey)."
        )
    return ChatGoogleGenerativeAI(
        model=model or GEMINI_MODEL,
        temperature=temperature,
        google_api_key=GOOGLE_API_KEY,
    )


def get_grok_llm(temperature: float = 0.2, model: str | None = None) -> ChatOpenAI:
    """Return a Grok (xAI) chat model via its OpenAI-compatible API.

    Raises:
        RuntimeError: if XAI_API_KEY is missing.
    """
    if not XAI_API_KEY:
        raise RuntimeError(
            "XAI_API_KEY is not set. Copy .env.example to .env and add your "
            "xAI API key (https://console.x.ai)."
        )
    return ChatOpenAI(
        base_url="https://api.x.ai/v1",
        api_key=XAI_API_KEY,
        model=model or GROK_MODEL,
        temperature=temperature,
    )


def get_chat_model(provider: str, model: str, temperature: float = 0.2):
    """Dispatch to the right provider's client -- used by invoke_with_fallback
    so call sites don't need to know which provider a given fallback step is."""
    if provider == "grok":
        return get_grok_llm(temperature, model)
    return get_llm(temperature, model)


def build_fallback_chain() -> list[tuple[str, str]]:
    """Ordered (provider, model) pairs to try: the primary Gemini model, then
    each configured Gemini fallback, then Grok as a cross-provider last
    resort if XAI_API_KEY is set."""
    chain = [("gemini", GEMINI_MODEL)]
    chain += [("gemini", m) for m in FALLBACK_GEMINI_MODELS]
    if XAI_API_KEY:
        chain.append(("grok", GROK_MODEL))
    return chain
