"""Environment configuration and shared LLM client factory."""

import os

from dotenv import load_dotenv
from langchain_google_genai import ChatGoogleGenerativeAI

load_dotenv()

GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
TAVILY_API_KEY = os.getenv("TAVILY_API_KEY")
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-3.6-flash")
MAX_PLANNER_ITERATIONS = int(os.getenv("MAX_PLANNER_ITERATIONS", "2"))
MAX_RESULTS_PER_QUERY = int(os.getenv("MAX_RESULTS_PER_QUERY", "4"))

# Gemini's free tier caps requests *per model, per day* (independently for
# each model). If GEMINI_MODEL runs out, these are tried in order before
# giving up -- see src/llm_utils.py.
FALLBACK_GEMINI_MODELS = [
    m.strip()
    for m in os.getenv(
        "GEMINI_FALLBACK_MODELS", "gemini-3.8-flash,gemini-flash-lite-latest,gemini-3.5-flash-lite,gemini-3.1-flash-lite"
    ).split(",")
    if m.strip()
]


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
