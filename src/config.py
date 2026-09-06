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
# falling through to Groq (if configured) -- see src/llm_utils.py.
FALLBACK_GEMINI_MODELS = [
    m.strip()
    for m in os.getenv(
        "GEMINI_FALLBACK_MODELS", "gemini-3.8-flash,gemini-flash-lite-latest,gemini-3.5-flash-lite,gemini-3.1-flash-lite"
    ).split(",")
    if m.strip()
]

# Groq (console.groq.com -- fast inference for open models, not to be
# confused with xAI's "Grok"), used via its OpenAI-compatible API as a
# *cross-provider* last resort -- it draws from an entirely separate quota,
# so it survives even a total Gemini outage, not just one exhausted model.
# Optional: only used if GROQ_API_KEY is set.
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
GROQ_MODEL = os.getenv("GROQ_MODEL", "openai/gpt-oss-20b")


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


def get_groq_llm(temperature: float = 0.2, model: str | None = None) -> ChatOpenAI:
    """Return a Groq chat model via its OpenAI-compatible API.

    Raises:
        RuntimeError: if GROQ_API_KEY is missing.
    """
    if not GROQ_API_KEY:
        raise RuntimeError(
            "GROQ_API_KEY is not set. Copy .env.example to .env and add your "
            "Groq API key (https://console.groq.com/keys)."
        )
    return ChatOpenAI(
        base_url="https://api.groq.com/openai/v1",
        api_key=GROQ_API_KEY,
        model=model or GROQ_MODEL,
        temperature=temperature,
    )


def get_chat_model(provider: str, model: str, temperature: float = 0.2):
    """Dispatch to the right provider's client -- used by invoke_with_fallback
    so call sites don't need to know which provider a given fallback step is."""
    if provider == "groq":
        return get_groq_llm(temperature, model)
    return get_llm(temperature, model)


def build_fallback_chain() -> list[tuple[str, str]]:
    """Ordered (provider, model) pairs to try: the primary Gemini model, then
    each configured Gemini fallback, then Groq as a cross-provider last
    resort if GROQ_API_KEY is set."""
    chain = [("gemini", GEMINI_MODEL)]
    chain += [("gemini", m) for m in FALLBACK_GEMINI_MODELS]
    if GROQ_API_KEY:
        chain.append(("groq", GROQ_MODEL))
    return chain
