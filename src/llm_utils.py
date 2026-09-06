"""Automatic fallback across Gemini models when one hits its daily quota.

Google's free tier caps requests *per model, per day*, independently for
each model -- a heavily-used default model can run dry mid-session while
sibling models on the same API key still have quota untouched.
"""

from typing import Any, Callable

from .config import FALLBACK_GEMINI_MODELS, GEMINI_MODEL
from .utils import log


def _is_quota_error(exc: Exception) -> bool:
    text = str(exc)
    return "RESOURCE_EXHAUSTED" in text or "429" in text


def invoke_with_fallback(build_llm: Callable[[str], Any], prompt: str) -> Any:
    """Call build_llm(model).invoke(prompt), trying GEMINI_MODEL first and
    then each configured fallback model in turn -- but only on a quota/
    rate-limit error. Any other exception (bad prompt, network error, auth
    failure) raises immediately, since switching models wouldn't fix it.
    """
    models = [GEMINI_MODEL, *FALLBACK_GEMINI_MODELS]
    last_exc: Exception | None = None

    for i, model in enumerate(models):
        try:
            return build_llm(model).invoke(prompt)
        except Exception as exc:
            if not _is_quota_error(exc):
                raise
            last_exc = exc
            if i + 1 < len(models):
                log(f"[Fallback] '{model}' quota exhausted, trying '{models[i + 1]}'…", style="yellow")

    assert last_exc is not None
    raise last_exc
