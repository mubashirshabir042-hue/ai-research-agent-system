"""Automatic fallback across models -- and providers -- when one is exhausted.

Google's free tier caps requests *per model, per day*, independently for
each model -- a heavily-used default model can run dry mid-session while
sibling models on the same API key still have quota untouched. Beyond that,
Groq can be configured as a cross-provider last resort that survives even a
total Gemini outage, since it draws from an entirely separate quota.
"""

from typing import Any, Callable

from .config import build_fallback_chain
from .utils import log


def _is_quota_error(exc: Exception) -> bool:
    text = str(exc).lower()
    return any(
        marker in text
        for marker in ("resource_exhausted", "429", "rate_limit", "insufficient_quota")
    )


def invoke_with_fallback(build_llm: Callable[[str, str], Any], prompt: str) -> Any:
    """Call build_llm(provider, model).invoke(prompt), trying each (provider,
    model) pair from config.build_fallback_chain() in order -- but only
    advancing on a quota/rate-limit error. Any other exception (bad prompt,
    network error, auth failure) raises immediately, since switching models
    or providers wouldn't fix it.
    """
    chain = build_fallback_chain()
    last_exc: Exception | None = None

    for i, (provider, model) in enumerate(chain):
        try:
            return build_llm(provider, model).invoke(prompt)
        except Exception as exc:
            if not _is_quota_error(exc):
                raise
            last_exc = exc
            if i + 1 < len(chain):
                next_provider, next_model = chain[i + 1]
                log(
                    f"[Fallback] '{provider}:{model}' quota exhausted, trying '{next_provider}:{next_model}'…",
                    style="yellow",
                )

    assert last_exc is not None
    raise last_exc
