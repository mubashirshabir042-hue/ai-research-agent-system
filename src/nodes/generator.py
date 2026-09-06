"""Node 4: Report Generator - drafts the final markdown report with strict citations."""

from ..config import get_chat_model
from ..llm_utils import invoke_with_fallback
from ..state import ResearchState
from ..utils import extract_cited_numbers, log, message_text

GEN_PROMPT = """You are the Report Generator node of an autonomous research agent.

Research topic: "{topic}"

Below is a list of evaluated, reliable facts. Each line ends with the exact \
bracketed citation number(s) you MUST reuse when you use that fact.

{facts}

Write a comprehensive, well-structured markdown report answering the research \
topic. Requirements:
- Use markdown headings (##) to organize sections.
- Every sentence containing a verifiable claim from the facts above MUST end \
with the matching bracketed citation number(s) exactly as given, e.g. \
"Global renewable capacity grew 15% in 2024 [2][5]."
- Do not invent facts or citations that are not in the list above.
- Do not write a References/Sources section yourself - it is appended \
automatically after your report.
- Write in clear, professional prose suitable for a research briefing."""


def generator_node(state: ResearchState) -> dict:
    facts = state.get("evaluated_facts", [])
    topic = state["user_query"]

    if not facts:
        report = (
            f"# Research Report: {topic}\n\n"
            "No sufficiently reliable information could be retrieved for this "
            "topic. Please try rephrasing the query or check your search API "
            "configuration.\n"
        )
        return {"final_report": report}

    url_index: dict[str, int] = {}
    for fact in facts:
        for url in fact["source_urls"]:
            if url not in url_index:
                url_index[url] = len(url_index) + 1

    fact_lines = []
    for fact in facts:
        nums = "".join(f"[{url_index[u]}]" for u in fact["source_urls"] if u in url_index)
        fact_lines.append(f"- {fact['statement']} {nums}")

    prompt = GEN_PROMPT.format(topic=topic, facts="\n".join(fact_lines))
    response = invoke_with_fallback(lambda provider, model: get_chat_model(provider, model, temperature=0.4), prompt)
    body = message_text(response.content).strip()

    cited_numbers = extract_cited_numbers(body)
    index_to_url = {v: k for k, v in url_index.items()}
    references = "\n".join(
        f"[{n}] {index_to_url[n]}" for n in cited_numbers if n in index_to_url
    )

    report = f"# Research Report: {topic}\n\n{body}\n\n## References\n{references}\n"
    log(f"[Generator] report generated, {len(cited_numbers)} sources cited")

    return {"final_report": report}
