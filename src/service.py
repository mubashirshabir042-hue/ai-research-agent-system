"""Shared research-run logic used by both the CLI (main.py) and the API (api/main.py)."""

import time
from pathlib import Path

from .utils import slugify


def build_initial_state(query: str) -> dict:
    return {
        "user_query": query,
        "sub_queries": [],
        "searched_queries": [],
        "collected_data": [],
        "evaluated_facts": [],
        "final_report": "",
        "iteration": 0,
        "sufficient": False,
        "missing_topics": [],
    }


def save_report(query: str, report: str, output_dir: str = "reports") -> Path:
    out_dir = Path(output_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    out_path = out_dir / f"{slugify(query)}_{int(time.time())}.md"
    out_path.write_text(report, encoding="utf-8")
    return out_path
