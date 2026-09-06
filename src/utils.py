"""Small, dependency-free helpers shared across nodes (kept pure for testability)."""

import re
from typing import List

from rich.console import Console

_console = Console()


def log(message: str, style: str = "dim") -> None:
    """Print a progress line to the console (used by nodes to show live status)."""
    _console.print(message, style=style)


def slugify(text: str, max_length: int = 60) -> str:
    """Convert arbitrary text into a filesystem-safe slug."""
    text = text.lower().strip()
    text = re.sub(r"[^a-z0-9]+", "-", text)
    text = text.strip("-")
    return text[:max_length] or "research-report"


def extract_cited_numbers(text: str) -> List[int]:
    """Return the sorted, de-duplicated set of ``[n]`` citation numbers in text."""
    return sorted({int(n) for n in re.findall(r"\[(\d+)\]", text)})


def message_text(content) -> str:
    """Normalize a LangChain message ``.content`` into plain text.

    Some models (e.g. Gemini "thinking" variants) return ``content`` as a list
    of content blocks (thought summaries plus the final text) rather than a
    plain string - this extracts and concatenates just the text parts.
    """
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        parts = []
        for item in content:
            if isinstance(item, str):
                parts.append(item)
            elif isinstance(item, dict) and item.get("type", "text") == "text":
                parts.append(item.get("text", ""))
        return "".join(parts)
    return str(content)
