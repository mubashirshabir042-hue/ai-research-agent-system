"""FastAPI backend for the AI Research Agent System web UI.

Streams the LangGraph pipeline's node-by-node progress to the frontend as
newline-delimited JSON, and serves the saved report history. Reuses the
existing graph/nodes in src/ unchanged.
"""

import json
import re
from datetime import datetime, timezone
from pathlib import Path
from typing import Iterator

from fastapi import FastAPI, HTTPException
from fastapi.encoders import jsonable_encoder
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

from src.graph import build_graph
from src.service import build_initial_state, save_report

REPORTS_DIR = Path("reports")
FRONTEND_DIST = Path("frontend/dist")
FILENAME_RE = re.compile(r"^[a-z0-9-]+_(\d+)\.md$")

app = FastAPI(title="AI Research Agent System API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class ResearchRequest(BaseModel):
    query: str = Field(min_length=1, max_length=500)


def _friendly_error(exc: Exception) -> str:
    """Collapse a raw (often huge, JSON-laden) provider exception into one
    short, human-readable line for the UI's error banner."""
    raw = str(exc)
    summary = raw.split("{", 1)[0].strip() or raw[:200]

    if "RESOURCE_EXHAUSTED" in raw or "429" in raw:
        return f"{summary} You've hit the Gemini API free-tier rate limit — wait a bit and try again."
    if "PERMISSION_DENIED" in raw or "403" in raw:
        return f"{summary} Check that your Google API key/project has access to this model."
    if "NOT_FOUND" in raw or "404" in raw:
        return f"{summary} Try a different GEMINI_MODEL in your .env file."
    return summary


def _extract_topic(content: str, fallback_slug: str) -> str:
    for line in content.splitlines():
        if line.startswith("# Research Report:"):
            return line.removeprefix("# Research Report:").strip()
    return fallback_slug.replace("-", " ").title()


@app.get("/api/reports")
def list_reports() -> list[dict]:
    if not REPORTS_DIR.exists():
        return []

    reports = []
    for path in REPORTS_DIR.glob("*.md"):
        match = FILENAME_RE.match(path.name)
        if not match:
            continue
        epoch = int(match.group(1))
        content = path.read_text(encoding="utf-8")
        slug = path.name.rsplit("_", 1)[0]
        reports.append(
            {
                "filename": path.name,
                "topic": _extract_topic(content, slug),
                "created": datetime.fromtimestamp(epoch, tz=timezone.utc).isoformat(),
            }
        )

    reports.sort(key=lambda r: r["created"], reverse=True)
    return reports


@app.get("/api/reports/{filename}")
def get_report(filename: str) -> dict:
    if not FILENAME_RE.match(filename):
        raise HTTPException(status_code=400, detail="Invalid report filename")

    path = (REPORTS_DIR / filename).resolve()
    if REPORTS_DIR.resolve() not in path.parents or not path.is_file():
        raise HTTPException(status_code=404, detail="Report not found")

    return {"filename": filename, "content": path.read_text(encoding="utf-8")}


def _stream_research(query: str) -> Iterator[str]:
    try:
        graph = build_graph()
        state = build_initial_state(query)
        final_report = None

        for update in graph.stream(state, stream_mode="updates"):
            for node_name, node_output in update.items():
                yield json.dumps({"node": node_name, "output": jsonable_encoder(node_output)}) + "\n"
                if node_name == "generator":
                    final_report = node_output.get("final_report")

        if final_report is not None:
            saved_path = save_report(query, final_report)
            yield json.dumps(
                {"node": "done", "output": {"filename": saved_path.name, "report": final_report}}
            ) + "\n"
    except Exception as exc:  # surface config/runtime errors to the UI instead of a bare 500
        yield json.dumps({"node": "error", "output": {"message": _friendly_error(exc)}}) + "\n"


@app.post("/api/research")
def research(request: ResearchRequest) -> StreamingResponse:
    return StreamingResponse(_stream_research(request.query), media_type="application/x-ndjson")


if FRONTEND_DIST.exists():
    app.mount("/", StaticFiles(directory=str(FRONTEND_DIST), html=True), name="frontend")
