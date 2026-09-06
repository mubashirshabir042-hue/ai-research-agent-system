import pytest

from src.llm_utils import invoke_with_fallback


class FakeLLM:
    def __init__(self, behavior):
        self._behavior = behavior

    def invoke(self, prompt):
        if isinstance(self._behavior, Exception):
            raise self._behavior
        return self._behavior


def test_uses_primary_model_when_it_succeeds():
    calls = []

    def build_llm(model):
        calls.append(model)
        return FakeLLM("ok")

    result = invoke_with_fallback(build_llm, "prompt")

    assert result == "ok"
    assert calls == ["gemini-3.6-flash"]  # only the primary model was tried


def test_falls_back_on_quota_exhaustion():
    quota_error = Exception("429 RESOURCE_EXHAUSTED: quota exceeded")
    calls = []

    def build_llm(model):
        calls.append(model)
        if model == "gemini-3.6-flash":
            return FakeLLM(quota_error)
        return FakeLLM("ok from fallback")

    result = invoke_with_fallback(build_llm, "prompt")

    assert result == "ok from fallback"
    assert calls[0] == "gemini-3.6-flash"
    assert len(calls) >= 2


def test_non_quota_error_raises_immediately_without_trying_fallbacks():
    calls = []

    def build_llm(model):
        calls.append(model)
        return FakeLLM(Exception("400 INVALID_ARGUMENT: bad prompt"))

    with pytest.raises(Exception, match="INVALID_ARGUMENT"):
        invoke_with_fallback(build_llm, "prompt")

    assert calls == ["gemini-3.6-flash"]  # never tried a fallback


def test_raises_last_error_when_every_model_is_exhausted():
    def build_llm(model):
        return FakeLLM(Exception(f"429 RESOURCE_EXHAUSTED for {model}"))

    with pytest.raises(Exception, match="RESOURCE_EXHAUSTED"):
        invoke_with_fallback(build_llm, "prompt")
