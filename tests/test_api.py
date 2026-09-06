from pathlib import Path

import pytest
from fastapi.testclient import TestClient

import api.main as api_main

client = TestClient(api_main.app)


@pytest.fixture
def isolated_reports_dir(tmp_path, monkeypatch):
    monkeypatch.setattr(api_main, "REPORTS_DIR", tmp_path)
    return tmp_path


def test_list_reports_empty_dir(isolated_reports_dir):
    response = client.get("/api/reports")
    assert response.status_code == 200
    assert response.json() == []


def test_list_reports_parses_topic_and_sorts_newest_first(isolated_reports_dir):
    (isolated_reports_dir / "older-topic_1000000000.md").write_text(
        "# Research Report: Older Topic\n\nbody\n", encoding="utf-8"
    )
    (isolated_reports_dir / "newer-topic_2000000000.md").write_text(
        "# Research Report: Newer Topic\n\nbody\n", encoding="utf-8"
    )

    response = client.get("/api/reports")
    assert response.status_code == 200
    topics = [r["topic"] for r in response.json()]
    assert topics == ["Newer Topic", "Older Topic"]


def test_get_report_returns_content(isolated_reports_dir):
    (isolated_reports_dir / "my-topic_1700000000.md").write_text(
        "# Research Report: My Topic\n\nHello [1].\n", encoding="utf-8"
    )

    response = client.get("/api/reports/my-topic_1700000000.md")
    assert response.status_code == 200
    body = response.json()
    assert body["filename"] == "my-topic_1700000000.md"
    assert "Hello [1]" in body["content"]


def test_get_report_rejects_invalid_filename_pattern(isolated_reports_dir):
    response = client.get("/api/reports/not-a-valid-report-name.txt")
    assert response.status_code == 400


def test_get_report_404_when_missing(isolated_reports_dir):
    response = client.get("/api/reports/does-not-exist_1234567890.md")
    assert response.status_code == 404


def test_research_rejects_empty_query():
    response = client.post("/api/research", json={"query": ""})
    assert response.status_code == 422


SAMPLE_REPORT = "# Research Report: Test Topic\n\n## Section One\n\nSome text [1].\n\n## References\n[1] https://example.com\n"


def test_export_pdf_returns_pdf_bytes():
    response = client.post("/api/export/pdf", json={"content": SAMPLE_REPORT})
    assert response.status_code == 200
    assert response.headers["content-type"] == "application/pdf"
    assert response.content.startswith(b"%PDF")


def test_export_docx_returns_docx_bytes():
    response = client.post("/api/export/docx", json={"content": SAMPLE_REPORT})
    assert response.status_code == 200
    assert "wordprocessingml" in response.headers["content-type"]
    assert response.content.startswith(b"PK")  # docx is a zip archive


def test_export_rejects_unknown_format():
    response = client.post("/api/export/txt", json={"content": SAMPLE_REPORT})
    assert response.status_code == 400


def test_export_rejects_empty_content():
    response = client.post("/api/export/pdf", json={"content": ""})
    assert response.status_code == 422


def test_friendly_error_strips_json_blob_and_adds_hint():
    exc = Exception(
        "Error calling model 'gemini-3.6-flash' (RESOURCE_EXHAUSTED): 429 RESOURCE_EXHAUSTED. "
        "{'error': {'code': 429, 'message': 'quota stuff'}}"
    )
    message = api_main._friendly_error(exc)
    assert "{" not in message
    assert "rate limit" in message.lower()


def test_friendly_error_falls_back_to_plain_message():
    message = api_main._friendly_error(Exception("GOOGLE_API_KEY is not set."))
    assert message == "GOOGLE_API_KEY is not set."
