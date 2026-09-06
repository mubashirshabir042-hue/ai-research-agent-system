from src.utils import extract_cited_numbers, message_text, slugify


def test_slugify_basic():
    assert slugify("Impact of AI on Healthcare!") == "impact-of-ai-on-healthcare"


def test_slugify_blank_falls_back():
    assert slugify("   ") == "research-report"


def test_slugify_truncates_to_max_length():
    long_text = "word " * 30
    assert len(slugify(long_text, max_length=20)) <= 20


def test_extract_cited_numbers_dedupes_and_sorts():
    text = "Fact one [1][3]. Fact two [2]. Fact one again [1]."
    assert extract_cited_numbers(text) == [1, 2, 3]


def test_extract_cited_numbers_empty_when_none_present():
    assert extract_cited_numbers("No citations here.") == []


def test_message_text_passes_through_plain_string():
    assert message_text("hello world") == "hello world"


def test_message_text_extracts_text_blocks_from_list():
    content = [
        {"type": "thinking", "thinking": "internal reasoning"},
        {"type": "text", "text": "final answer part one. "},
        {"type": "text", "text": "final answer part two."},
    ]
    assert message_text(content) == "final answer part one. final answer part two."


def test_message_text_handles_plain_string_items_in_list():
    assert message_text(["a", "b"]) == "ab"
