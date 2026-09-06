"""Convert a research report's markdown into downloadable PDF or DOCX bytes."""

import io
import re

import markdown as md_lib
from docx import Document
from htmldocx import HtmlToDocx
from xhtml2pdf import pisa

# Reference lines look like "[1] https://example.com" (a bare URL, not
# markdown link syntax). Turn bare URLs into real links so they're clickable
# in the exported document, while leaving already-linked URLs alone.
_BARE_URL_RE = re.compile(r"(?<![(\[])(https?://\S+)")


def _linkify_bare_urls(content: str) -> str:
    return _BARE_URL_RE.sub(lambda m: f"[{m.group(1)}]({m.group(1)})", content)


def _to_html(content: str) -> str:
    return md_lib.markdown(_linkify_bare_urls(content), extensions=["extra"])


def render_docx(content: str) -> bytes:
    """Render report markdown as a .docx file, returned as raw bytes."""
    document = Document()
    HtmlToDocx().add_html_to_document(_to_html(content), document)
    buffer = io.BytesIO()
    document.save(buffer)
    return buffer.getvalue()


_PDF_TEMPLATE = """<html><head><style>
body {{ font-family: Helvetica, sans-serif; font-size: 11pt; line-height: 1.5; color: #1a1a1a; }}
h1 {{ font-size: 20pt; margin-bottom: 0.3em; }}
h2 {{ font-size: 15pt; margin-top: 1.3em; margin-bottom: 0.3em; }}
a {{ color: #9c3529; }}
li {{ margin-bottom: 0.4em; }}
</style></head><body>{body}</body></html>"""


def render_pdf(content: str) -> bytes:
    """Render report markdown as a PDF file, returned as raw bytes."""
    html = _PDF_TEMPLATE.format(body=_to_html(content))
    buffer = io.BytesIO()
    pisa.CreatePDF(html, dest=buffer)
    return buffer.getvalue()
