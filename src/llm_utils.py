"""Automatic fallback across models -- and providers -- when one is unavailable.

Google's free tier caps requests *per model, per day*, independently for
each model -- a heavily-used default model can run dry mid-session while
sibling models on the same API key still have quota untouched. The same
model can also be temporarily overloaded (503/UNAVAILABLE) with no quota
involved at all. Beyond that, Groq can be configured as a cross-provider
last resort that survives even a total Gemini outage, since it draws from
an entirely separate quota.
"""

from typing import Any, Callable

from .config import build_fallback_chain
from .utils import log

# Substrings of a transient, supply-side failure -- where the model/provider
# itself is the problem and simply trying the next one in the chain is a
# reasonable remedy. Deliberately narrow: a bad prompt, malformed request, or
# auth failure should still raise immediately, since switching models won't
# fix those.
_RETRYABLE_MARKERS = (
    "resource_exhausted",  # Gemini quota
    "429",  # generic rate-limit status (Gemini/OpenAI-compatible)
    "rate_limit",  # OpenAI-compatible (Groq, etc.) rate limit
    "insufficient_quota",  # OpenAI-compatible quota
    "503",  # generic "temporarily unavailable" status
    "unavailable",  # Gemini's overloaded/high-demand error
    "overloaded",  # some providers phrase it this way instead
)


def _should_fall_back(exc: Exception) -> bool:
    text = str(exc).lower()
    return any(marker in text for marker in _RETRYABLE_MARKERS)


def invoke_with_fallback(build_llm: Callable[[str, str], Any], prompt: str) -> Any:
    """Call build_llm(provider, model).invoke(prompt), trying each (provider,
    model) pair from config.build_fallback_chain() in order -- but only
    advancing on a quota or transient-availability error. Any other
    exception (bad prompt, malformed request, auth failure) raises
    immediately, since switching models or providers wouldn't fix it.
    """
    chain = build_fallback_chain()
    last_exc: Exception | None = None

    for i, (provider, model) in enumerate(chain):
        try:
            return build_llm(provider, model).invoke(prompt)
        except Exception as exc:
            if not _should_fall_back(exc):
                raise
            last_exc = exc
            if i + 1 < len(chain):
                next_provider, next_model = chain[i + 1]
                log(
                    f"[Fallback] '{provider}:{model}' unavailable, trying '{next_provider}:{next_model}'…",
                    style="yellow",
                )

    assert last_exc is not None
    raise last_exc
