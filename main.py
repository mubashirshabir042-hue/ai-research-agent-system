"""CLI entry point for the AI Research Agent System.

Usage:
    python main.py "What is the current state of solid-state battery research?"
"""

import argparse
import sys

from rich.console import Console
from rich.markdown import Markdown

from src.config import GOOGLE_API_KEY, TAVILY_API_KEY
from src.graph import build_graph
from src.service import build_initial_state, save_report

console = Console()


def main() -> None:
    parser = argparse.ArgumentParser(
        description="AI Research Agent System - autonomous multi-agent research with strict inline citations."
    )
    parser.add_argument("query", help="Research topic or question")
    parser.add_argument(
        "-o", "--output", default="reports", help="Directory to save the markdown report (default: reports/)"
    )
    args = parser.parse_args()

    if not GOOGLE_API_KEY or not TAVILY_API_KEY:
        console.print(
            "[bold red]Missing GOOGLE_API_KEY or TAVILY_API_KEY.[/bold red] "
            "Copy .env.example to .env and fill in your keys."
        )
        sys.exit(1)

    console.rule("[bold cyan]AI Research Agent System")
    console.print(f"[bold]Topic:[/bold] {args.query}\n")

    graph = build_graph()
    result = graph.invoke(build_initial_state(args.query))

    console.rule("[bold green]Final Report")
    console.print(Markdown(result["final_report"]))

    out_path = save_report(args.query, result["final_report"], args.output)
    console.print(f"\n[bold green]Report saved to:[/bold green] {out_path}")


if __name__ == "__main__":
    main()
